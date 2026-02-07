import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useGraphStore, useSettingsStore, useElectronTabsStore } from '../stores';
import type { ChartYColumnConfig } from '../stores/settings';
import { getLocale } from '../locale';
import type { GraphNode } from '@xovis/core';
import { getOperatorRows } from '../utils/operatorRows';
import { loadFile, isSupportedFile } from '../utils/loadFile';

export type ChartViewHandle = {
  getSvgElement: () => SVGSVGElement | null;
  resetView: () => void;
};

const PIE_LABEL_RATIO = 1.15;
const DEFAULT_LABEL_TRUNCATE = 8;
const LEGEND_ITEM_HEIGHT = 18;
const LEGEND_GAP = 8;

/** 单系列：xVals, yVals, baseVals；多系列：xLabels, seriesNames, data, baseData, rowIndices */
type ChartData =
  | {
      kind: 'single';
      xVals: string[];
      yVals: number[];
      /** 有起始数据列时才有值；否则渲染时用轴底 effectiveDataMinY */
      baseVals?: number[];
      yConfig?: ChartYColumnConfig;
    }
  | {
      kind: 'multi';
      xLabels: string[];
      seriesNames: string[];
      data: number[][];
      baseData: number[][];
      rowIndices: number[][];
      seriesConfigs: ChartYColumnConfig[];
    };

/** 固定 X 列 + 多个 Y 列：单列=单系列，多列=多系列（按列名） */
function buildChartData(
  rows: Record<string, unknown>[],
  xKey: string,
  yKeys: ChartYColumnConfig[]
): ChartData | null {
  const yKeysFiltered = yKeys.filter((yc) => yc.key);
  if (!xKey || yKeysFiltered.length === 0 || rows.length === 0) return null;
  if (yKeysFiltered.length === 1) {
    const yConfig = { ...yKeysFiltered[0] };
    const yKey = yConfig.key;
    const baseKey = yConfig.barBaseKey;
    const xVals = rows.map((r) => String(r[xKey] ?? ''));
    const yVals = rows.map((r) => {
      const n = Number(r[yKey]);
      return Number.isFinite(n) ? n : 0;
    });
    const baseVals = baseKey
      ? rows.map((r) => {
          const n = Number(r[baseKey]);
          return Number.isFinite(n) ? n : 0;
        })
      : undefined;
    return { kind: 'single', xVals, yVals, baseVals, yConfig };
  }
  const xOrder: string[] = [];
  const xIndex = new Map<string, number>();
  rows.forEach((r) => {
    const x = String(r[xKey] ?? '');
    if (!xIndex.has(x)) {
      xIndex.set(x, xOrder.length);
      xOrder.push(x);
    }
  });
  const xLabels = xOrder;
  const seriesNames = yKeysFiltered.map((yc) => yc.key);
  const seriesConfigs = yKeysFiltered.map((yc) => ({ ...yc }));
  const data: number[][] = xLabels.map(() => Array(seriesNames.length).fill(0));
  const baseData: number[][] = xLabels.map(() => Array(seriesNames.length).fill(0));
  const rowIndices: number[][] = xLabels.map(() => Array(seriesNames.length).fill(-1));
  rows.forEach((r, rowIdx) => {
    const x = String(r[xKey] ?? '');
    const xi = xIndex.get(x);
    if (xi == null) return;
    yKeysFiltered.forEach((yc, si) => {
      const v = Number(r[yc.key]);
      if (Number.isFinite(v)) {
        data[xi][si] += v;
        if (rowIndices[xi][si] < 0) {
          rowIndices[xi][si] = rowIdx;
          const baseKey = yc.barBaseKey;
          if (baseKey) {
            const b = Number(r[baseKey]);
            baseData[xi][si] = Number.isFinite(b) ? b : 0;
          }
        }
      }
    });
  });
  baseData.forEach((row, i) =>
    row.forEach((_, j) => {
      if (!yKeysFiltered[j]?.barBaseKey) baseData[i][j] = NaN;
    })
  );
  return { kind: 'multi', xLabels, seriesNames, data, baseData, rowIndices, seriesConfigs };
}

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 线性拟合：计算最小二乘法的线性回归 y = ax + b */
function linearFit(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (pts.length < 2) return pts;
  const n = pts.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (const pt of pts) {
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumX2 += pt.x * pt.x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const step = (maxX - minX) / Math.max(50, pts.length * 2);
  const fittedPts: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x += step) {
    fittedPts.push({ x, y: slope * x + intercept });
  }
  return fittedPts;
}

/** 指数拟合：y = a * e^(bx) 或 y = a * b^x */
function exponentialFit(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (pts.length < 2) return pts;
  // 过滤掉非正数y值，因为指数函数要求y>0
  const validPts = pts.filter((p) => p.y > 0);
  if (validPts.length < 2) return pts;
  // 使用对数线性化：ln(y) = ln(a) + bx
  const logPts = validPts.map((p) => ({ x: p.x, y: Math.log(p.y) }));
  const n = logPts.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (const pt of logPts) {
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumX2 += pt.x * pt.x;
  }
  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const lnA = (sumY - b * sumX) / n;
  const a = Math.exp(lnA);
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const step = (maxX - minX) / Math.max(50, pts.length * 2);
  const fittedPts: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x += step) {
    fittedPts.push({ x, y: a * Math.exp(b * x) });
  }
  return fittedPts;
}

/** 对数拟合：y = a + b * ln(x) */
function logarithmicFit(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (pts.length < 2) return pts;
  // 过滤掉非正数x值
  const validPts = pts.filter((p) => p.x > 0);
  if (validPts.length < 2) return pts;
  const n = validPts.length;
  let sumLnX = 0,
    sumY = 0,
    sumLnXY = 0,
    sumLnX2 = 0;
  for (const pt of validPts) {
    const lnX = Math.log(pt.x);
    sumLnX += lnX;
    sumY += pt.y;
    sumLnXY += lnX * pt.y;
    sumLnX2 += lnX * lnX;
  }
  const b = (n * sumLnXY - sumLnX * sumY) / (n * sumLnX2 - sumLnX * sumLnX);
  const a = (sumY - b * sumLnX) / n;
  const minX = Math.max(0.001, Math.min(...pts.map((p) => p.x)));
  const maxX = Math.max(...pts.map((p) => p.x));
  const step = (maxX - minX) / Math.max(50, pts.length * 2);
  const fittedPts: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x += step) {
    fittedPts.push({ x, y: a + b * Math.log(x) });
  }
  return fittedPts;
}

/** 幂函数拟合：y = a * x^b */
function powerFit(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (pts.length < 2) return pts;
  // 过滤掉非正数x和y值
  const validPts = pts.filter((p) => p.x > 0 && p.y > 0);
  if (validPts.length < 2) return pts;
  // 使用对数线性化：ln(y) = ln(a) + b * ln(x)
  const logPts = validPts.map((p) => ({ x: Math.log(p.x), y: Math.log(p.y) }));
  const n = logPts.length;
  let sumLnX = 0,
    sumLnY = 0,
    sumLnXLnY = 0,
    sumLnX2 = 0;
  for (const pt of logPts) {
    sumLnX += pt.x;
    sumLnY += pt.y;
    sumLnXLnY += pt.x * pt.y;
    sumLnX2 += pt.x * pt.x;
  }
  const b = (n * sumLnXLnY - sumLnX * sumLnY) / (n * sumLnX2 - sumLnX * sumLnX);
  const lnA = (sumLnY - b * sumLnX) / n;
  const a = Math.exp(lnA);
  const minX = Math.max(0.001, Math.min(...pts.map((p) => p.x)));
  const maxX = Math.max(...pts.map((p) => p.x));
  const step = (maxX - minX) / Math.max(50, pts.length * 2);
  const fittedPts: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x += step) {
    fittedPts.push({ x, y: a * Math.pow(x, b) });
  }
  return fittedPts;
}

/** 移动平均拟合：使用滑动窗口计算平均值 */
function movingAverageFit(
  pts: Array<{ x: number; y: number }>,
  windowSize: number
): Array<{ x: number; y: number }> {
  if (pts.length < 2) return pts;
  const window = Math.max(2, Math.min(windowSize, pts.length));
  const fittedPts: Array<{ x: number; y: number }> = [];
  const halfWindow = Math.floor(window / 2);

  for (let i = 0; i < pts.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(pts.length, i + halfWindow + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += pts[j].y;
    }
    const avg = sum / (end - start);
    fittedPts.push({ x: pts[i].x, y: avg });
  }
  return fittedPts;
}

/** 多项式拟合：使用最小二乘法进行多项式回归 */
function polynomialFit(
  pts: Array<{ x: number; y: number }>,
  degree: number
): Array<{ x: number; y: number }> {
  if (pts.length < degree + 1) return pts;
  // 构建范德蒙矩阵并求解
  const X: number[][] = [];
  const Y: number[] = [];
  for (const pt of pts) {
    const row: number[] = [];
    for (let d = 0; d <= degree; d++) {
      row.push(Math.pow(pt.x, d));
    }
    X.push(row);
    Y.push(pt.y);
  }
  // 简化的最小二乘求解（使用正规方程）
  // X^T * X * coeffs = X^T * Y
  const XT = X[0].map((_, i) => X.map((row) => row[i]));
  const XTX: number[][] = XT.map((row) =>
    X[0].map((_, j) => row.reduce((sum, val, k) => sum + val * X[k][j], 0))
  );
  const XTY: number[] = XT.map((row) => row.reduce((sum, val, i) => sum + val * Y[i], 0));

  // 高斯消元法求解线性方程组
  const coeffs = gaussElimination(XTX, XTY);

  // 生成拟合曲线的点
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const step = (maxX - minX) / Math.max(50, pts.length * 2);
  const fittedPts: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x += step) {
    let y = 0;
    for (let d = 0; d <= degree; d++) {
      y += coeffs[d] * Math.pow(x, d);
    }
    fittedPts.push({ x, y });
  }
  return fittedPts;
}

/** 高斯消元法求解线性方程组 */
function gaussElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);

  // 前向消元
  for (let i = 0; i < n; i++) {
    // 找到主元
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // 消元
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // 回代
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }
  return x;
}

/** 生成拟合折线路径 */
function generateFitLinePath(
  pts: Array<{ x: number; y: number }>,
  fitType:
    | 'linear'
    | 'polynomial'
    | 'exponential'
    | 'logarithmic'
    | 'power'
    | 'movingAverage' = 'linear',
  fitDegree: number = 2
): string {
  if (pts.length < 2) return '';
  let fittedPts: Array<{ x: number; y: number }>;
  switch (fitType) {
    case 'linear':
      fittedPts = linearFit(pts);
      break;
    case 'polynomial':
      fittedPts = polynomialFit(pts, Math.max(2, Math.min(5, fitDegree)));
      break;
    case 'exponential':
      fittedPts = exponentialFit(pts);
      break;
    case 'logarithmic':
      fittedPts = logarithmicFit(pts);
      break;
    case 'power':
      fittedPts = powerFit(pts);
      break;
    case 'movingAverage':
      fittedPts = movingAverageFit(pts, Math.max(2, Math.min(20, fitDegree)));
      break;
    default:
      fittedPts = linearFit(pts);
  }
  if (fittedPts.length === 0) return '';
  let d = `M ${fittedPts[0].x} ${fittedPts[0].y}`;
  for (let i = 1; i < fittedPts.length; i++) {
    d += ` L ${fittedPts[i].x} ${fittedPts[i].y}`;
  }
  return d;
}

function pieSliceOpacity(i: number): number {
  return 0.52 + (i % 4) * 0.12;
}

/** 系列颜色：优先使用配置的颜色，否则使用主题色 */
function seriesColor(_index: number, _palette: string[], config?: ChartYColumnConfig): string {
  if (config?.color) return config.color;
  return 'var(--accent)';
}

/** 填充样式类型（柱/饼共用） */
type FillStyleType =
  | 'solid'
  | 'gradient'
  | 'hatched'
  | 'hatched-h'
  | 'hatched-v'
  | 'hatched-cross'
  | 'stripes'
  | 'pattern';

/** 获取柱状图填充样式 */
function getBarFillStyle(config?: ChartYColumnConfig): FillStyleType {
  return (config?.barFillStyle || 'solid') as FillStyleType;
}

/** 是否为图案类填充（需用 pattern url） */
function isPatternFill(fs: FillStyleType): boolean {
  return fs !== 'solid' && fs !== 'gradient';
}

/** 渲染填充图案 def（柱/饼共用） */
function renderFillPattern(
  fillStyle: FillStyleType,
  color: string,
  id: string
): React.ReactNode {
  if (!isPatternFill(fillStyle)) return null;
  const strokeProps = { stroke: color, strokeWidth: 1, opacity: 0.6 };
  switch (fillStyle) {
    case 'hatched':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <path d="M 0,8 L 8,0" {...strokeProps} />
        </pattern>
      );
    case 'hatched-h':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <path d="M 0,4 L 8,4" {...strokeProps} />
        </pattern>
      );
    case 'hatched-v':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <path d="M 4,0 L 4,8" {...strokeProps} />
        </pattern>
      );
    case 'hatched-cross':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <path d="M 0,8 L 8,0" {...strokeProps} />
          <path d="M 0,0 L 8,8" {...strokeProps} />
        </pattern>
      );
    case 'stripes':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="4">
          <rect width="8" height="2" y="0" fill={color} opacity="0.4" />
        </pattern>
      );
    case 'pattern':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="12" height="12">
          <circle cx="6" cy="6" r="2" fill={color} opacity="0.4" />
        </pattern>
      );
    default:
      return null;
  }
}

/** 获取柱状图边框样式 */
function getBarEdgeStyle(config?: ChartYColumnConfig): 'solid' | 'dashed' | 'dotted' | 'none' {
  return config?.barEdgeStyle || 'solid';
}

/** 获取柱状图边框宽度 */
function getBarEdgeWidth(config?: ChartYColumnConfig, defaultWidth: number = 1): number {
  return config?.barEdgeWidth ?? defaultWidth;
}

/** 获取柱状图透明度 */
function getBarOpacity(config?: ChartYColumnConfig): number {
  return config?.barOpacity ?? 1;
}

/** 柱状图 rect 的 fill/stroke 属性（减少重复） */
function getBarRectProps(
  config: ChartYColumnConfig | undefined,
  color: string,
  gradId: string,
  patternId: string
): {
  fill: string;
  fillOpacity: number;
  stroke: string | undefined;
  strokeWidth: number;
  strokeDasharray: string | undefined;
} {
  const fillStyle = getBarFillStyle(config);
  const fill =
    fillStyle === 'gradient'
      ? `url(#${gradId})`
      : isPatternFill(fillStyle)
        ? `url(#${patternId})`
        : color;
  const edgeStyle = getBarEdgeStyle(config);
  const edgeWidth = getBarEdgeWidth(config);
  return {
    fill,
    fillOpacity: getBarOpacity(config),
    stroke: edgeStyle === 'none' ? undefined : edgeWidth > 0 ? color : undefined,
    strokeWidth: edgeStyle === 'none' ? 0 : edgeWidth,
    strokeDasharray: getStrokeDasharray(edgeStyle),
  };
}

/** 获取折线图线型 */
function getLineStyle(
  config?: ChartYColumnConfig
): 'solid' | 'dashed' | 'dotted' | 'dashdot' | 'double-dash' {
  return config?.lineStyle || 'solid';
}

/** 获取折线图线宽 */
function getLineWidth(config?: ChartYColumnConfig, defaultWidth: number = 2): number {
  return config?.lineWidth ?? defaultWidth;
}

/** 获取折线图拟合设置 */
function getLineFit(config?: ChartYColumnConfig, defaultFit: boolean = false): boolean {
  return config?.lineFit ?? defaultFit;
}

/** 获取折线图拟合类型 */
function getLineFitType(
  config?: ChartYColumnConfig
): 'linear' | 'polynomial' | 'exponential' | 'logarithmic' | 'power' | 'movingAverage' {
  return config?.lineFitType ?? 'linear';
}

/** 获取折线图多项式拟合阶数 */
function getLineFitDegree(config?: ChartYColumnConfig, defaultDegree: number = 2): number {
  return config?.lineFitDegree ?? defaultDegree;
}

/** 获取折线图显示标记点设置 */
function getLineShowPoints(
  config?: ChartYColumnConfig,
  defaultShowPoints: boolean = true
): boolean {
  return config?.lineShowPoints ?? defaultShowPoints;
}

/** 获取数据标签显示设置 */
function getShowDataLabels(config?: ChartYColumnConfig, defaultShow: boolean = false): boolean {
  return config?.showDataLabels ?? defaultShow;
}

/** 获取数据标签字体大小 */
function getDataLabelFontSize(config?: ChartYColumnConfig, defaultSize: number = 0): number {
  return config?.dataLabelFontSize ?? defaultSize;
}

/** 获取数据标签小数位数 */
function getDataLabelDecimals(config?: ChartYColumnConfig, defaultDecimals: number = 2): number {
  return config?.dataLabelDecimals ?? defaultDecimals;
}

/** 获取数据标签样式 */
function getDataLabelStyle(config?: ChartYColumnConfig): React.CSSProperties {
  return {
    fontWeight: config?.dataLabelBold ? 'bold' : 'normal',
    fontStyle: config?.dataLabelItalic ? 'italic' : 'normal',
  };
}

/** 格式化数据标签 */
function formatDataLabel(v: number, decimals?: number): string {
  const dec = decimals ?? 2;
  return dec <= 0 ? String(Math.round(v)) : v.toFixed(Math.min(6, dec));
}

/** 计算垂直方向的数据标签偏移（用于垂直柱状图、未交换XY的折线图/散点图） */
function calculateVerticalDataLabelOffset(
  position: 'top' | 'bottom' | 'auto',
  pointY: number,
  markerSize: number,
  labelFontSize: number,
  plotTop: number,
  plotBottom: number
): number {
  const estimatedLabelHeight = labelFontSize + 4;
  const spacing = 4;

  if (position === 'top') {
    // 上方（数据点的北）
    return -markerSize / 2 - spacing;
  } else if (position === 'bottom') {
    // 下方（数据点的南）
    return markerSize / 2 + spacing;
  } else {
    // auto: 如果标签放在上方会超出顶部边界，就放在下方；如果放在下方会超出底部边界，就放在上方
    const labelTopIfTop = pointY - markerSize / 2 - spacing - estimatedLabelHeight;
    const labelBottomIfBottom = pointY + markerSize / 2 + spacing + estimatedLabelHeight;
    if (labelTopIfTop < plotTop) {
      // 放在上方会超出顶部边界，放在下方
      return markerSize / 2 + spacing;
    } else if (labelBottomIfBottom > plotBottom) {
      // 放在下方会超出底部边界，放在上方
      return -markerSize / 2 - spacing;
    } else {
      // 两边都有空间，默认放在上方
      return -markerSize / 2 - spacing;
    }
  }
}

/** 计算水平方向的数据标签偏移（用于水平柱状图、交换XY后的折线图/散点图） */
function calculateHorizontalDataLabelOffset(
  position: 'top' | 'bottom' | 'auto',
  pointX: number,
  markerSize: number,
  labelFontSize: number,
  plotLeft: number,
  plotRight: number
): { offsetX: number; offsetY: number; textAnchor: 'start' | 'end' | 'middle' } {
  const estimatedLabelWidth = labelFontSize * 3;
  const spacing = 4;

  if (position === 'top') {
    // 上方（右方，数据点的北）
    return { offsetX: markerSize / 2 + spacing, offsetY: 0, textAnchor: 'start' };
  } else if (position === 'bottom') {
    // 下方（左方，数据点的南）
    return { offsetX: -markerSize / 2 - spacing, offsetY: 0, textAnchor: 'end' };
  } else {
    // auto: 如果标签放在右方（上方）会超出右边界，就放在左方（下方）；如果放在左方（下方）会超出左边界，就放在右方（上方）
    const labelRightIfTop = pointX + markerSize / 2 + spacing + estimatedLabelWidth;
    const labelLeftIfBottom = pointX - markerSize / 2 - spacing - estimatedLabelWidth;
    if (labelRightIfTop > plotRight) {
      // 放在右方会超出右边界，放在左方（下方）
      return { offsetX: -markerSize / 2 - spacing, offsetY: 0, textAnchor: 'end' };
    } else if (labelLeftIfBottom < plotLeft) {
      // 放在左方会超出左边界，放在右方（上方）
      return { offsetX: markerSize / 2 + spacing, offsetY: 0, textAnchor: 'start' };
    } else {
      // 两边都有空间，默认放在右方（上方）
      return { offsetX: markerSize / 2 + spacing, offsetY: 0, textAnchor: 'start' };
    }
  }
}

/** 计算柱状图垂直方向的数据标签偏移（用于垂直柱状图） */
function calculateBarVerticalDataLabelOffset(
  position: 'top' | 'bottom' | 'auto',
  barTop: number,
  barBottom: number,
  barHeight: number,
  labelFontSize: number,
  plotTop: number,
  plotBottom: number
): number {
  const estimatedLabelHeight = labelFontSize + 4;
  const spacing = 4;

  if (position === 'top') {
    // 上方（数据点的北）
    return -spacing;
  } else if (position === 'bottom') {
    // 下方（数据点的南）
    return barHeight + spacing;
  } else {
    // auto: 如果标签放在上方会超出顶部边界，就放在下方；如果放在下方会超出底部边界，就放在上方
    const labelTopIfTop = barTop - spacing - estimatedLabelHeight;
    const labelBottomIfBottom = barBottom + spacing + estimatedLabelHeight;
    if (labelTopIfTop < plotTop) {
      // 放在上方会超出顶部边界，放在下方
      return barHeight + spacing;
    } else if (labelBottomIfBottom > plotBottom) {
      // 放在下方会超出底部边界，放在上方
      return -spacing;
    } else {
      // 两边都有空间，默认放在上方
      return -spacing;
    }
  }
}

/** 计算柱状图水平方向的数据标签偏移（用于水平柱状图） */
function calculateBarHorizontalDataLabelOffset(
  position: 'top' | 'bottom' | 'auto',
  barLeft: number,
  barRight: number,
  barWidth: number,
  labelFontSize: number,
  plotLeft: number,
  plotRight: number
): number {
  const estimatedLabelHeight = labelFontSize + 4;
  const spacing = 4;

  if (position === 'top') {
    // 上方（右方，数据点的北）
    return barWidth + spacing;
  } else if (position === 'bottom') {
    // 下方（左方，数据点的南）
    return -spacing;
  } else {
    // auto: 如果标签放在右方（上方）会超出右边界，就放在左方（下方）；如果放在左方（下方）会超出左边界，就放在右方（上方）
    const labelRightIfTop = barRight + spacing + estimatedLabelHeight;
    const labelLeftIfBottom = barLeft - spacing - estimatedLabelHeight;
    if (labelRightIfTop > plotRight) {
      // 放在右方会超出右边界，放在左方（下方）
      return -spacing;
    } else if (labelLeftIfBottom < plotLeft) {
      // 放在左方会超出左边界，放在右方（上方）
      return barWidth + spacing;
    } else {
      // 两边都有空间，默认放在右方（上方）
      return barWidth + spacing;
    }
  }
}

/** 获取折线图标记样式 */
function getMarkerStyle(
  config?: ChartYColumnConfig
): 'none' | 'circle' | 'square' | 'diamond' | 'star' | 'cross' | 'plus' | 'x' {
  return config?.markerStyle || 'none';
}

/** 获取折线图标记大小 */
function getMarkerSize(config?: ChartYColumnConfig, defaultSize: number = 6): number {
  return config?.markerSize ?? defaultSize;
}

/** 获取折线图标记填充颜色 */
function getMarkerFillColor(defaultColor: string, config?: ChartYColumnConfig): string {
  return config?.markerFillColor || config?.color || defaultColor;
}

/** 获取折线图标记边框颜色 */
function getMarkerEdgeColor(_defaultColor: string, config?: ChartYColumnConfig): string {
  return config?.markerEdgeColor || '#ffffff';
}

/** 获取散点图标记样式 */
function getScatterMarkerStyle(
  config?: ChartYColumnConfig
): 'circle' | 'square' | 'diamond' | 'star' | 'cross' | 'plus' | 'x' | 'triangle' {
  return config?.scatterMarkerStyle || 'circle';
}

/** 获取散点图标记大小 */
function getScatterMarkerSize(config?: ChartYColumnConfig, defaultSize: number = 5): number {
  return config?.scatterMarkerSize ?? defaultSize;
}

/** 获取散点图标记填充颜色 */
function getScatterMarkerFillColor(defaultColor: string, config?: ChartYColumnConfig): string {
  return config?.scatterMarkerFillColor || config?.color || defaultColor;
}

/** 获取散点图标记边框颜色 */
function getScatterMarkerEdgeColor(defaultColor: string, config?: ChartYColumnConfig): string {
  return config?.scatterMarkerEdgeColor || config?.color || defaultColor;
}

/** 获取散点图标记边框宽度 */
function getScatterMarkerEdgeWidth(config?: ChartYColumnConfig, defaultWidth: number = 1): number {
  return config?.scatterMarkerEdgeWidth ?? defaultWidth;
}

/** 获取散点图标记透明度 */
function getScatterMarkerOpacity(config?: ChartYColumnConfig): number {
  return config?.scatterMarkerOpacity ?? 1;
}

/** 获取扇形图填充样式 */
function getPieFillStyle(config?: ChartYColumnConfig): FillStyleType {
  return (config?.pieFillStyle || 'solid') as FillStyleType;
}

/** 获取扇形图边框样式 */
function getPieEdgeStyle(config?: ChartYColumnConfig): 'solid' | 'dashed' | 'none' {
  return config?.pieEdgeStyle || 'solid';
}

/** 获取扇形图边框宽度 */
function getPieEdgeWidth(config?: ChartYColumnConfig, defaultWidth: number = 1): number {
  return config?.pieEdgeWidth ?? defaultWidth;
}

/** 根据线型获取strokeDasharray */
function getStrokeDasharray(style: string): string | undefined {
  switch (style) {
    case 'dashed':
      return '5,5';
    case 'dotted':
      return '2,2';
    case 'dashdot':
      return '5,2,2,2';
    case 'double-dash':
      return '8,4,2,4';
    default:
      return undefined;
  }
}

/** 渲染图例符号：根据图表类型显示不同的样式。patternId 用于图案类填充时引用 defs 中的 pattern */
function renderLegendSymbol(
  chartType: 'bar' | 'pie' | 'line' | 'scatter',
  x: number,
  y: number,
  size: number,
  color: string,
  config?: ChartYColumnConfig,
  patternId?: string
): JSX.Element {
  const halfSize = size / 2;

  switch (chartType) {
    case 'bar': {
      const fillStyle = getBarFillStyle(config);
      const edgeStyle = getBarEdgeStyle(config);
      const edgeWidth = getBarEdgeWidth(config, 1);
      return (
        <rect
          x={x - halfSize}
          y={y - halfSize}
          width={size}
          height={size}
          fill={
            fillStyle === 'gradient'
              ? color
              : isPatternFill(fillStyle) && patternId
                ? `url(#${patternId})`
                : color
          }
          fillOpacity={getBarOpacity(config)}
          stroke={edgeStyle === 'none' ? undefined : color}
          strokeWidth={edgeStyle === 'none' ? 0 : edgeWidth}
          strokeDasharray={getStrokeDasharray(edgeStyle)}
        />
      );
    }
    case 'pie': {
      const fillStyle = getPieFillStyle(config);
      const edgeStyle = getPieEdgeStyle(config);
      const edgeWidth = getPieEdgeWidth(config, 1);
      return (
        <circle
          cx={x}
          cy={y}
          r={halfSize}
          fill={
            fillStyle === 'gradient'
              ? color
              : isPatternFill(fillStyle) && patternId
                ? `url(#${patternId})`
                : color
          }
          stroke={edgeStyle === 'none' ? undefined : color}
          strokeWidth={edgeStyle === 'none' ? 0 : edgeWidth}
          strokeDasharray={getStrokeDasharray(edgeStyle)}
        />
      );
    }
    case 'line': {
      const lineStyle = getLineStyle(config);
      const lineWidth = getLineWidth(config, 2);
      const lineCfg = config ? getLineMarkerConfig(config, color) : null;
      return (
        <g>
          <line
            x1={x - halfSize}
            y1={y}
            x2={x + halfSize}
            y2={y}
            stroke={color}
            strokeWidth={lineWidth}
            strokeDasharray={getStrokeDasharray(lineStyle)}
          />
          {lineCfg &&
            renderMarker(
              x,
              y,
              lineCfg.style,
              Math.min(lineCfg.size, halfSize),
              lineCfg.fillColor,
              lineCfg.edgeColor,
              1,
              1
            )}
        </g>
      );
    }
    case 'scatter': {
      if (!config) return <circle cx={x} cy={y} r={halfSize} fill={color} />;
      const cfg = getScatterMarkerConfig(config, color);
      const displaySize = Math.min(cfg.size, halfSize);
      const marker = renderMarker(
        x,
        y,
        cfg.style,
        displaySize,
        cfg.fillColor,
        cfg.edgeColor,
        cfg.edgeWidth,
        cfg.opacity
      );
      return marker || <circle cx={x} cy={y} r={halfSize} fill={color} />;
    }
    default:
      return <rect x={x - halfSize} y={y - halfSize} width={size} height={size} fill={color} />;
  }
}

/** 渲染标记元素 */
// 获取折线图标记配置
function getLineMarkerConfig(
  yConfig: ChartYColumnConfig,
  seriesColor: string
): {
  style: string;
  size: number;
  fillColor: string;
  edgeColor: string;
  configKey: string;
} | null {
  const style = getMarkerStyle(yConfig);
  if (style === 'none') return null;
  const size = getMarkerSize(yConfig);
  const fillColor = getMarkerFillColor(seriesColor, yConfig);
  const edgeColor = getMarkerEdgeColor('var(--bg-target)', yConfig);
  return {
    style,
    size,
    fillColor,
    edgeColor,
    configKey: JSON.stringify({ style, size, fill: fillColor, edge: edgeColor }),
  };
}

// 获取散点图标记配置
function getScatterMarkerConfig(
  yConfig: ChartYColumnConfig,
  seriesColor: string
): {
  style: string;
  size: number;
  fillColor: string;
  edgeColor: string;
  edgeWidth: number;
  opacity: number;
  configKey: string;
} {
  const style = getScatterMarkerStyle(yConfig);
  const size = getScatterMarkerSize(yConfig);
  const fillColor = getScatterMarkerFillColor(seriesColor, yConfig);
  const edgeColor = getScatterMarkerEdgeColor(seriesColor, yConfig);
  const edgeWidth = getScatterMarkerEdgeWidth(yConfig);
  const opacity = getScatterMarkerOpacity(yConfig);
  return {
    style,
    size,
    fillColor,
    edgeColor,
    edgeWidth,
    opacity,
    configKey: JSON.stringify({
      style,
      size,
      fill: fillColor,
      edge: edgeColor,
      edgeWidth,
      opacity,
    }),
  };
}

function renderMarker(
  x: number,
  y: number,
  style: string,
  size: number,
  fillColor: string,
  edgeColor: string,
  edgeWidth: number,
  opacity: number = 1,
  key?: string | number
): JSX.Element | null {
  const halfSize = size / 2;
  // 需要填充的标记样式（circle, square, diamond, star, triangle）
  const fillProps = {
    key,
    fill: fillColor,
    stroke: edgeColor,
    strokeWidth: edgeWidth,
    fillOpacity: opacity,
    strokeOpacity: opacity,
  };
  // 只需要线条的标记样式（cross, plus, x）
  const strokeProps = {
    key,
    fill: 'none',
    stroke: fillColor || edgeColor, // 对于线条标记，使用 fillColor 作为 stroke
    strokeWidth: edgeWidth,
    strokeOpacity: opacity,
  };

  switch (style) {
    case 'circle':
      return <circle {...fillProps} cx={x} cy={y} r={halfSize} />;
    case 'square':
      return <rect {...fillProps} x={x - halfSize} y={y - halfSize} width={size} height={size} />;
    case 'diamond': {
      const d = `M ${x} ${y - halfSize} L ${x + halfSize} ${y} L ${x} ${y + halfSize} L ${x - halfSize} ${y} Z`;
      return <path {...fillProps} d={d} />;
    }
    case 'star': {
      const r1 = halfSize;
      const r2 = halfSize * 0.4;
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? r1 : r2;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        points.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
      }
      return <path {...fillProps} d={points.join(' ') + ' Z'} />;
    }
    case 'cross':
      return (
        <g {...strokeProps}>
          <line x1={x - halfSize} y1={y} x2={x + halfSize} y2={y} />
          <line x1={x} y1={y - halfSize} x2={x} y2={y + halfSize} />
        </g>
      );
    case 'plus':
      return (
        <g {...strokeProps}>
          <line x1={x - halfSize} y1={y} x2={x + halfSize} y2={y} />
          <line x1={x} y1={y - halfSize} x2={x} y2={y + halfSize} />
        </g>
      );
    case 'x': {
      const offset = halfSize * 0.707;
      return (
        <g {...strokeProps}>
          <line x1={x - offset} y1={y - offset} x2={x + offset} y2={y + offset} />
          <line x1={x - offset} y1={y + offset} x2={x + offset} y2={y - offset} />
        </g>
      );
    }
    case 'triangle': {
      const h = size * 0.866;
      const d = `M ${x} ${y - h * 0.67} L ${x - halfSize} ${y + h * 0.33} L ${x + halfSize} ${y + h * 0.33} Z`;
      return <path {...fillProps} d={d} />;
    }
    default:
      return null;
  }
}

export const ChartView = forwardRef<
  ChartViewHandle,
  { viewMode: 'bar' | 'pie' | 'line' | 'scatter' }
>(function ChartView({ viewMode }, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, setSelected, setGraph } = useGraphStore();
  const s = useSettingsStore();
  const {
    chartXKey,
    chartYKeys = [],
    chartBarGapInner,
    chartBarGapOuter,
    chartBarWidth,
    chartBarCornerRadius,
    chartBarMinHeight,
    chartBarMinWidth,
    chartAxisPaddingLeft,
    chartAxisPaddingRight,
    chartAxisPaddingTop,
    chartAxisPaddingBottom,
    chartAxisLabelDecimals,
    chartLabelFontSize,
    chartPieInnerRadius,
    chartPieLabelPosition,
    chartPieStartAngle,
    chartPieLabelMaxLength,
    chartPadding,
    chartTitle,
    chartXTitle,
    chartYTitle,
    chartTitleFontSize,
    chartAxisTitleFontSize,
    chartShowAxisLine,
    chartAxisStrokeWidth,
    chartAxisBoxStyle,
    chartAxisStrokeStyle,
    chartShowAxisLabels,
    chartShowAxisTicks,
    chartShowGrid,
    chartGridStrokeWidth,
    chartGridColor,
    chartGridStrokeStyle,
    chartGridOpacity,
    chartGridLineCount,
    chartAxisColor,
    chartTickColor,
    chartAxisTickLength,
    chartAxisTickStyle,
    chartAxisTickCount,
    chartShowLegend,
    chartLegendMaxColumns,
    chartLegendPosition,
    chartLegendInside,
    chartLegendMaxLength,
    chartLegendWidth,
    chartLegendHeight,
    chartLegendOffsetX,
    chartLegendOffsetY,
    chartSwapXY,
    chartLegendFontSize,
    chartLegendSymbolSize,
    chartLegendItemSpacing,
    chartAxisLabelBold,
    chartAxisLabelItalic,
    chartLegendBold,
    chartLegendItalic,
    chartSeriesVisibility,
    chartWidth,
    chartHeight,
    chartLabelMaxLength,
    operatorPalette,
  } = s;

  // 缩放和平移逻辑（原 usePanZoom）
  const ZOOM_SENSITIVITY = 0.003;
  const DRAG_THRESHOLD = 4;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panStart = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const didDrag = useRef(false);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    setZoom((z) => Math.max(0.01, z * (1 + delta)));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      didDrag.current = false;
      setIsDragging(true);
      panStart.current = { x: pan.x, y: pan.y, clientX: e.clientX, clientY: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan.x, pan.y]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panStart.current) return;
    const dx = e.clientX - panStart.current.clientX;
    const dy = e.clientY - panStart.current.clientY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) didDrag.current = true;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    panStart.current = null;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const onPointerLeave = useCallback(() => {
    panStart.current = null;
    setIsDragging(false);
  }, []);

  const panZoomCursor = (isDragging: boolean) =>
    ({
      cursor: isDragging ? 'grabbing' : 'grab',
    }) as const;

  const panZoomTransform = {
    transformOrigin: '50% 50%',
    transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
  };

  // 拖动载入文件逻辑（原 useFileDrop）
  const [dropOver, setDropOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const t = getLocale(s.lang);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropOver(true);
    setDropError(null);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget;
    const next = e.relatedTarget as Node | null;
    if (next != null && el.contains(next)) return;
    setDropOver(false);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDropOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) {
        const uriList = e.dataTransfer.getData?.('text/uri-list');
        const fileUri = uriList?.trim().split(/\r?\n/)[0];
        const requestLoadUri =
          typeof window !== 'undefined' &&
          (window as unknown as { __XOVIS_VSCODE_REQUEST_LOAD_URI?: (uri: string) => void })
            .__XOVIS_VSCODE_REQUEST_LOAD_URI;
        if (fileUri?.startsWith('file://') && requestLoadUri) {
          requestLoadUri(fileUri);
          return;
        }
        const vscodeRequestLoad =
          typeof window !== 'undefined' &&
          (window as unknown as { __XOVIS_VSCODE_REQUEST_LOAD?: () => void })
            .__XOVIS_VSCODE_REQUEST_LOAD;
        if (vscodeRequestLoad) vscodeRequestLoad();
        return;
      }
      if (!isSupportedFile(file)) {
        setDropError(t.loadError);
        return;
      }
      try {
        const result = loadFile(await file.text(), file.name);
        if (result.success) {
          setGraph(result.graph);
          setDropError(null);
          if (typeof window !== 'undefined' && window.electronAPI && file.name) {
            const aid = useElectronTabsStore.getState().activeId;
            if (aid) {
              useElectronTabsStore.getState().setTabLabel(aid, file.name.replace(/^.*[/\\]/, ''));
            }
          }
        } else {
          setDropError(result.error);
        }
      } catch (err) {
        setDropError(err instanceof Error ? err.message : t.loadError);
      }
    },
    [setGraph, t.loadError]
  );

  useImperativeHandle(ref, () => ({ getSvgElement: () => svgRef.current, resetView }), [resetView]);

  const ops = useMemo(
    () => graph?.nodes.filter((n: GraphNode) => !n.metadata?.isTensorNode) ?? [],
    [graph]
  );

  // 使用序列化来深度比较 chartYKeys，确保配置变化时能正确更新
  // chartYKeysKey 变化时，chartData 会重新计算，buildChartData 会创建新的配置对象引用
  const chartYKeysKey = useMemo(() => JSON.stringify(chartYKeys), [chartYKeys]);
  const chartData = useMemo(() => {
    if (!graph) return null;
    const rows = getOperatorRows(graph);
    return buildChartData(rows, chartXKey, chartYKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, chartXKey, chartYKeysKey]);

  const padding = chartPadding;
  const w = Math.max(320, chartWidth);
  const h = Math.max(240, chartHeight);
  const labelTruncate = chartLabelMaxLength > 0 ? chartLabelMaxLength : DEFAULT_LABEL_TRUNCATE;
  const pieLabelTruncate = chartPieLabelMaxLength > 0 ? chartPieLabelMaxLength : labelTruncate;
  const gridTicks = useMemo(() => {
    const n =
      chartAxisTickCount > 0
        ? Math.max(2, Math.min(20, chartAxisTickCount))
        : Math.max(2, Math.min(12, chartGridLineCount));
    return Array.from({ length: n }, (_, i) => i / Math.max(1, n - 1));
  }, [chartGridLineCount, chartAxisTickCount]);
  // 刻度线长度：如果启用显示刻度线，但长度为0，则使用默认值4
  const effectiveTickLength = chartShowAxisTicks
    ? chartAxisTickLength > 0
      ? chartAxisTickLength
      : 4
    : 0;
  // tick样式计算（复用，减少冗余）
  const isInside = chartAxisTickStyle === 'inside-full' || chartAxisTickStyle === 'inside-half';
  const isFull = chartAxisTickStyle === 'inside-full' || chartAxisTickStyle === 'outside-full';

  const labelFontSize = chartLabelFontSize > 0 ? chartLabelFontSize : Math.max(8, s.fontSize * 0.8);
  const formatAxisTick = (v: number) =>
    chartAxisLabelDecimals <= 0
      ? v % 1 === 0
        ? String(v)
        : v.toFixed(2)
      : v.toFixed(Math.min(6, chartAxisLabelDecimals));
  const titleFontSize =
    chartTitleFontSize > 0 ? chartTitleFontSize : Math.round(labelFontSize * 1.2);
  const axisTitleFontSize = chartAxisTitleFontSize > 0 ? chartAxisTitleFontSize : labelFontSize;
  const legendFontSize = chartLegendFontSize > 0 ? chartLegendFontSize : labelFontSize;
  const effectiveLegendSymbolSize = chartLegendSymbolSize > 0 ? chartLegendSymbolSize : 10;

  const axisLabelStyle: React.CSSProperties = {
    fontWeight: chartAxisLabelBold ? 'bold' : 'normal',
    fontStyle: chartAxisLabelItalic ? 'italic' : 'normal',
  };
  const legendLabelStyle: React.CSSProperties = {
    fontWeight: chartLegendBold ? 'bold' : 'normal',
    fontStyle: chartLegendItalic ? 'italic' : 'normal',
  };

  // 先定义 truncate 和 legendLabelDisplay 函数，因为后面会用到
  const truncate = (str: string, max: number) =>
    str.length > max ? str.slice(0, Math.max(0, max - 1)) + '…' : str;
  const legendLabelDisplay = (name: string) =>
    chartLegendMaxLength > 0 ? truncate(name, chartLegendMaxLength) : name;

  const isMulti = chartData?.kind === 'multi';
  // 根据可见性过滤系列
  const visibleSeriesIndices = useMemo(() => {
    if (!isMulti || chartData.kind !== 'multi') return [];
    return chartData.seriesNames
      .map((name, idx) => ({ name, idx }))
      .filter(({ name }) => chartSeriesVisibility[name] !== false)
      .map(({ idx }) => idx);
  }, [isMulti, chartData, chartSeriesVisibility]);
  const filteredSeriesNames =
    isMulti && chartData.kind === 'multi'
      ? chartData.seriesNames.filter((_, idx) => visibleSeriesIndices.includes(idx))
      : [];
  const seriesCount = isMulti ? filteredSeriesNames.length : 1;
  const legendItemH = LEGEND_ITEM_HEIGHT + (chartLegendItemSpacing ?? 0);
  // 图例内外和方位是两个独立的选择，方位统一使用 chartLegendPosition
  const effectiveLegendPosition = chartLegendPosition;
  const isLegendOutside = !chartLegendInside;
  // 图例高度和宽度应该基于所有系列（包括隐藏的），因为图例要显示所有系列
  const allSeriesCount = isMulti && chartData.kind === 'multi' ? chartData.seriesNames.length : 1;
  // 判断图例是否在左右两侧（包括角落位置）
  const isLegendOnLeft =
    effectiveLegendPosition === 'left' ||
    effectiveLegendPosition === 'top-left' ||
    effectiveLegendPosition === 'bottom-left';
  const isLegendOnRight =
    effectiveLegendPosition === 'right' ||
    effectiveLegendPosition === 'top-right' ||
    effectiveLegendPosition === 'bottom-right';
  const isLegendOnTop =
    effectiveLegendPosition === 'top' ||
    effectiveLegendPosition === 'top-left' ||
    effectiveLegendPosition === 'top-right';
  const isLegendOnBottom =
    effectiveLegendPosition === 'bottom' ||
    effectiveLegendPosition === 'bottom-left' ||
    effectiveLegendPosition === 'bottom-right';

  const autoLegendWidth =
    chartShowLegend &&
    isMulti &&
    allSeriesCount > 0 &&
    isLegendOutside &&
    (isLegendOnLeft || isLegendOnRight)
      ? 88
      : 0;
  const legendWidth = chartLegendWidth > 0 ? chartLegendWidth : autoLegendWidth;
  const titleH = chartTitle ? titleFontSize + 8 : 0;
  // 如果交换X/Y轴，则交换坐标轴标题
  const effectiveXTitle = chartSwapXY ? chartYTitle : chartXTitle;
  const effectiveYTitle = chartSwapXY ? chartXTitle : chartYTitle;
  const xTitleH = effectiveXTitle ? axisTitleFontSize + 4 : 0;
  const yTitleW = effectiveYTitle ? axisTitleFontSize + 12 : 0;
  const axisLabelH = chartShowAxisLabels ? labelFontSize + 6 : 0;
  const axisLabelW = chartShowAxisLabels ? 28 : 0;

  // 先计算一个临时的 innerW 用于计算图例高度（使用 legendWidth 的初始值）
  const tempInnerW = Math.max(
    0,
    w -
      padding * 2 -
      axisLabelW -
      yTitleW -
      (isLegendOutside && isLegendOnLeft ? legendWidth : 0) -
      (isLegendOutside && isLegendOnRight ? legendWidth : 0)
  );
  // 计算图例列数（先计算可用宽度，用于计算自动列数）
  const availableLegendWForCalc =
    isLegendOnTop || isLegendOnBottom
      ? tempInnerW
      : isLegendOnLeft || isLegendOnRight
        ? legendWidth > 0
          ? legendWidth
          : autoLegendWidth
        : tempInnerW; // 内部或其他位置也使用 tempInnerW
  const legendCharW = legendFontSize * 0.55;
  const legendItemSpacing = 16;
  const allSeriesNames = isMulti && chartData.kind === 'multi' ? chartData.seriesNames : [];
  const legendItemContentWidths =
    allSeriesNames.length > 0
      ? allSeriesNames.map(
          (name) => effectiveLegendSymbolSize + 8 + legendLabelDisplay(name).length * legendCharW
        )
      : [80];
  const maxLegendItemContentW = Math.max(...legendItemContentWidths, 80);
  const maxLegendItemW = maxLegendItemContentW + legendItemSpacing;
  const autoItemsPerRowForHeight = Math.max(
    1,
    Math.floor(availableLegendWForCalc / maxLegendItemW)
  );
  const effectiveItemsPerRowForHeight =
    chartLegendMaxColumns > 0
      ? Math.min(chartLegendMaxColumns, autoItemsPerRowForHeight)
      : autoItemsPerRowForHeight;
  // 计算图例行数（横向排布，根据列数计算）
  const legendRows = Math.ceil(allSeriesCount / Math.max(1, effectiveItemsPerRowForHeight));
  const autoLegendHeight =
    chartShowLegend && isMulti && allSeriesCount > 0 && isLegendOutside
      ? legendRows * legendItemH + LEGEND_GAP * 2
      : 0;
  const legendHeight = chartLegendHeight > 0 ? chartLegendHeight : autoLegendHeight;

  const plotLeft =
    padding + (isLegendOutside && isLegendOnLeft ? legendWidth : 0) + axisLabelW + yTitleW;
  const plotTop = padding + titleH + (isLegendOutside && isLegendOnTop ? legendHeight : 0);
  const plotRight = w - padding - (isLegendOutside && isLegendOnRight ? legendWidth : 0);
  const plotBottom =
    h - padding - axisLabelH - xTitleH - (isLegendOutside && isLegendOnBottom ? legendHeight : 0);
  const innerW = Math.max(0, plotRight - plotLeft);
  const innerH = Math.max(0, plotBottom - plotTop);

  const onChartClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (didDrag.current) return;
      const t = (e.target as SVGElement).closest?.('[data-rowindex]') as SVGElement | null;
      if (t) {
        const rowIndex = parseInt(t.getAttribute('data-rowindex') ?? '', 10);
        if (Number.isFinite(rowIndex) && ops[rowIndex]) setSelected(ops[rowIndex]);
        return;
      }
      const tx = (e.target as SVGElement).closest?.('[data-xindex]') as SVGElement | null;
      if (tx && chartData?.kind === 'multi') {
        const xi = parseInt(tx.getAttribute('data-xindex') ?? '', 10);
        const si = parseInt(tx.getAttribute('data-seriesindex') ?? '', 10);
        const rowIndex = chartData.rowIndices[xi]?.[si] ?? -1;
        if (rowIndex >= 0 && ops[rowIndex]) setSelected(ops[rowIndex]);
        return;
      }
      if (e.target === svgRef.current || (e.target as SVGElement).closest?.('.chart-content'))
        setSelected(null);
    },
    [chartData, ops, setSelected, didDrag]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !chartData) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [chartData, onWheel]);

  const chartWrap = (content: React.ReactNode) => (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        ...panZoomCursor(isDragging),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dropOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px dashed var(--accent)',
            borderRadius: 8,
            margin: 8,
            pointerEvents: 'none',
            transition: 'opacity 0.15s ease',
          }}
          aria-hidden
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          margin: 8,
          overflow: 'hidden',
          ...panZoomTransform,
        }}
      >
        <div className="chart-wrap" style={{ width: '100%', height: '100%', minHeight: 200 }}>
          {content}
        </div>
      </div>
      {dropError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 12,
            color: 'var(--accent)',
            pointerEvents: 'none',
          }}
        >
          {dropError}
        </div>
      )}
    </div>
  );

  const yKeysValid = chartYKeys.filter((yc) => yc.key).length > 0;
  const hasMapping = !!chartXKey && yKeysValid && chartData;
  if (!graph || !hasMapping) {
    return (
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dropOver && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '2px dashed var(--accent)',
              borderRadius: 8,
              margin: 8,
              pointerEvents: 'none',
            }}
            aria-hidden
          />
        )}
        <div className="chart-empty">
          <span className="chart-empty-text">{t.chartSelectColumnsHint}</span>
        </div>
        {dropError && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 12,
              color: 'var(--accent)',
              pointerEvents: 'none',
            }}
          >
            {dropError}
          </div>
        )}
      </div>
    );
  }

  const palette = operatorPalette ?? [];

  if (chartData.kind === 'single') {
    const { xVals, yVals, yConfig } = chartData;
    const n = xVals.length;
    const singleSeriesName = yConfig?.key || 'Y';
    const singleLegendH = chartShowLegend && !chartLegendInside ? legendItemH + LEGEND_GAP * 2 : 0;
    const singleIsLegendOnTop =
      !chartLegendInside &&
      (chartLegendPosition === 'top' ||
        chartLegendPosition === 'top-left' ||
        chartLegendPosition === 'top-right');
    const singleIsLegendOnBottom =
      !chartLegendInside &&
      (chartLegendPosition === 'bottom' ||
        chartLegendPosition === 'bottom-left' ||
        chartLegendPosition === 'bottom-right');
    const singlePlotTop = padding + titleH + (singleIsLegendOnTop ? singleLegendH : 0);
    const singlePlotBottom =
      h - padding - axisLabelH - xTitleH - (singleIsLegendOnBottom ? singleLegendH : 0);
    const singleInnerH = Math.max(0, singlePlotBottom - singlePlotTop);
    const legendCharW = legendFontSize * 0.55;
    const singleLegendContentW =
      effectiveLegendSymbolSize + 8 + legendLabelDisplay(singleSeriesName).length * legendCharW;
    // 图例偏移量（不再交换）
    const effectiveOffsetX = chartLegendOffsetX ?? 0;
    const effectiveOffsetY = chartLegendOffsetY ?? 0;

    const singleLegendX = chartLegendInside
      ? chartLegendPosition === 'left' ||
        chartLegendPosition === 'top-left' ||
        chartLegendPosition === 'bottom-left'
        ? plotLeft + 12 + effectiveOffsetX
        : chartLegendPosition === 'right' ||
            chartLegendPosition === 'top-right' ||
            chartLegendPosition === 'bottom-right'
          ? plotRight - 12 - singleLegendContentW + effectiveOffsetX
          : w / 2 - singleLegendContentW / 2 + effectiveOffsetX
      : (chartLegendPosition === 'left' ||
        chartLegendPosition === 'top-left' ||
        chartLegendPosition === 'bottom-left'
          ? padding + 8
          : chartLegendPosition === 'right' ||
              chartLegendPosition === 'top-right' ||
              chartLegendPosition === 'bottom-right'
            ? w - padding - 80
            : w / 2) + effectiveOffsetX;
    const singleLegendY = chartLegendInside
      ? chartLegendPosition === 'top' ||
        chartLegendPosition === 'top-left' ||
        chartLegendPosition === 'top-right'
        ? singlePlotTop + 12 + effectiveOffsetY
        : chartLegendPosition === 'bottom' ||
            chartLegendPosition === 'bottom-left' ||
            chartLegendPosition === 'bottom-right'
          ? singlePlotBottom - 12 - legendItemH / 2 + effectiveOffsetY
          : singlePlotTop + singleInnerH / 2 - legendItemH / 2 + effectiveOffsetY
      : (chartLegendPosition === 'top' ||
        chartLegendPosition === 'top-left' ||
        chartLegendPosition === 'top-right'
          ? padding + titleH + LEGEND_GAP
          : chartLegendPosition === 'bottom' ||
              chartLegendPosition === 'bottom-left' ||
              chartLegendPosition === 'bottom-right'
            ? h - padding - singleLegendH + LEGEND_GAP
            : singlePlotTop + singleInnerH / 2 - legendItemH / 2) + effectiveOffsetY;
    const paddingTop = Math.max(0, Math.min(50, chartAxisPaddingTop)) / 100;
    const paddingBottom = Math.max(0, Math.min(50, chartAxisPaddingBottom)) / 100;
    const effectiveDataMinY = chartSwapXY
      ? Math.min(...yVals, 0)
      : Math.min(0, ...yVals, ...(chartData.baseVals ?? []));
    const effectiveDataMaxY = chartSwapXY
      ? Math.max(...yVals, 1)
      : Math.max(1, ...yVals, ...(chartData.baseVals ?? []));
    const effectiveDataRangeY = effectiveDataMaxY - effectiveDataMinY || 1;
    const valueScalePaddingMin =
      viewMode === 'bar' && !chartData.baseVals
        ? 0
        : chartSwapXY
          ? Math.max(0, Math.min(50, chartAxisPaddingLeft)) / 100
          : paddingBottom;
    const effectiveMinY =
      effectiveDataMinY - effectiveDataRangeY * valueScalePaddingMin;
    const effectiveMaxY = effectiveDataMaxY + effectiveDataRangeY * paddingTop;
    const axisBottomValue = effectiveDataMinY;
    const baseVals = chartData.baseVals ?? yVals.map(() => axisBottomValue);
    const paddingLeft = Math.max(0, Math.min(50, chartAxisPaddingLeft)) / 100;
    const paddingRight = Math.max(0, Math.min(50, chartAxisPaddingRight)) / 100;
    const effectiveRangeY = effectiveMaxY - effectiveMinY || 1;
    const effectiveXVals = chartSwapXY ? yVals.map(String) : xVals;
    const effectiveN = chartSwapXY ? yVals.length : n;

    // X轴缩放：如果交换，基于yVals的值（考虑左右padding）；否则基于索引（考虑左右padding）
    // 对于非数值坐标，确保刻度与数据点一一对应
    const xPaddingLeft = paddingLeft / (1 + paddingLeft + paddingRight);
    const xPaddingRight = paddingRight / (1 + paddingLeft + paddingRight);

    // 计算可用宽度（考虑padding后的实际可用空间）
    const availableW = innerW * (1 - xPaddingLeft - xPaddingRight);
    const totalBarGapOuter = effectiveN > 1 ? (effectiveN - 1) * Math.max(0, chartBarGapOuter) : 0;
    const maxBarWPerItem =
      effectiveN > 0 ? (availableW - totalBarGapOuter) / effectiveN : availableW;
    // 如果设置了固定宽度，使用固定宽度（但不超过最大可用宽度）；否则自适应计算
    const barW =
      chartBarWidth > 0
        ? Math.min(chartBarWidth, maxBarWPerItem)
        : effectiveN > 0
          ? chartBarMinWidth > 0
            ? Math.min(chartBarMinWidth, maxBarWPerItem) // 确保不超过最大可用宽度
            : maxBarWPerItem
          : 20;
    const labelY = singlePlotBottom + axisLabelH - 4;
    const barNoBase = viewMode === 'bar' && !chartData.baseVals;
    const plotPaddingLeft = barNoBase && chartSwapXY ? 0 : xPaddingLeft;
    const plotPaddingRight = xPaddingRight;
    const xScale = chartSwapXY
      ? (v: number) => {
          const ratio = effectiveRangeY > 0 ? (v - effectiveMinY) / effectiveRangeY : 0;
          return (
            plotLeft +
            plotPaddingLeft * innerW +
            ratio * (1 - plotPaddingLeft - plotPaddingRight) * innerW
          );
        }
      : (i: number) => {
          const ratio = effectiveN <= 1 ? 0.5 : i / Math.max(1, effectiveN - 1);
          return (
            plotLeft +
            plotPaddingLeft * innerW +
            ratio * (1 - plotPaddingLeft - plotPaddingRight) * innerW
          );
        };

    const yPaddingTop = paddingTop / (1 + paddingTop + paddingBottom);
    const yPaddingBottom = paddingBottom / (1 + paddingTop + paddingBottom);
    const plotPaddingTop = yPaddingTop;
    const plotPaddingBottom = barNoBase && !chartSwapXY ? 0 : yPaddingBottom;
    const yScale = chartSwapXY
      ? (i: number) => {
          const ratio = n > 1 ? i / (n - 1) : 0.5;
          return (
            singlePlotTop +
            plotPaddingTop * singleInnerH +
            (1 - ratio) * (1 - plotPaddingTop - plotPaddingBottom) * singleInnerH
          );
        }
      : (v: number) => {
          const ratio = effectiveRangeY > 0 ? (v - effectiveMinY) / effectiveRangeY : 0;
          return (
            singlePlotTop +
            plotPaddingTop * singleInnerH +
            (1 - ratio) * (1 - plotPaddingTop - plotPaddingBottom) * singleInnerH
          );
        };

    return chartWrap(
      <svg
        ref={svgRef}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="chart-svg"
        style={{ fontFamily: s.fontFamily, fontSize: labelFontSize }}
        onClick={onChartClick}
      >
        <defs>
          <linearGradient id="chartBarGrad" x1="0" y1="1" x2="0" y2="0">
            <stop
              offset="0%"
              stopColor={seriesColor(0, palette, chartData.yConfig)}
              stopOpacity="0.6"
            />
            <stop
              offset="100%"
              stopColor={seriesColor(0, palette, chartData.yConfig)}
              stopOpacity="1"
            />
          </linearGradient>
          {renderFillPattern(
            getBarFillStyle(chartData.yConfig),
            seriesColor(0, palette, chartData.yConfig),
            'chartBarFill-0'
          )}
          {viewMode === 'pie' &&
            (() => {
              const xValueMap = new Map<string, number>();
              xVals.forEach((xVal) => {
                if (!xValueMap.has(xVal)) xValueMap.set(xVal, xValueMap.size);
              });
              const uniqueXCount = xValueMap.size;
              const fillStyle = getPieFillStyle(chartData.yConfig);
              const color = seriesColor(0, palette, chartData.yConfig);
              return Array.from({ length: uniqueXCount }, (_, i) => (
                <g key={i}>
                  {fillStyle === 'gradient' && (
                    <radialGradient id={`chartPieGrad-0-${i}`}>
                      <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={color} stopOpacity="1" />
                    </radialGradient>
                  )}
                  {renderFillPattern(fillStyle, color, `chartPieFill-0-${i}`)}
                </g>
              ));
            })()}
        </defs>
        <g className="chart-content">
          {chartTitle && (
            <text
              className="chart-title"
              x={w / 2}
              y={padding + titleFontSize}
              textAnchor="middle"
              style={{ fontSize: titleFontSize }}
            >
              {truncate(chartTitle, 40)}
            </text>
          )}
          {chartShowLegend && (
            <g className="chart-legend" style={{ fontSize: legendFontSize }}>
              <g transform={`translate(${singleLegendX},${singleLegendY})`}>
                <g transform={`translate(${effectiveLegendSymbolSize / 2}, 0)`}>
                  {renderLegendSymbol(
                    viewMode,
                    effectiveLegendSymbolSize / 2,
                    0,
                    effectiveLegendSymbolSize,
                    seriesColor(0, palette, chartData.yConfig),
                    chartData.yConfig,
                    viewMode === 'bar'
                      ? 'chartBarFill-0'
                      : viewMode === 'pie'
                        ? 'chartPieFill-0-0'
                        : undefined
                  )}
                </g>
                <text
                  x={effectiveLegendSymbolSize + 8}
                  y={0}
                  textAnchor="start"
                  dominantBaseline="middle"
                  className="chart-legend-label"
                  style={legendLabelStyle}
                >
                  {legendLabelDisplay(singleSeriesName)}
                </text>
              </g>
            </g>
          )}
          {chartShowGrid &&
            (chartSwapXY
              ? // 交换后：Y轴grid基于xVals索引，X轴grid基于yVals值
                (() => {
                  // Y轴grid：基于xVals索引
                  const yGrids = xVals.map((_, i) => {
                    const gridY = yScale(i);
                    return (
                      <line
                        key={`y-${i}`}
                        x1={plotLeft}
                        y1={gridY}
                        x2={plotRight}
                        y2={gridY}
                        stroke={chartGridColor || 'var(--text)'}
                        strokeWidth={chartGridStrokeWidth}
                        strokeOpacity={chartGridOpacity}
                        strokeDasharray={getStrokeDasharray(chartGridStrokeStyle)}
                      />
                    );
                  });
                  // X轴grid：基于yVals值范围
                  const xGrids = gridTicks.map((tick, i) => {
                    const gridX = xScale(effectiveMinY + tick * effectiveRangeY);
                    return (
                      <line
                        key={`x-${i}`}
                        x1={gridX}
                        y1={singlePlotTop}
                        x2={gridX}
                        y2={singlePlotBottom}
                        stroke={chartGridColor || 'var(--text)'}
                        strokeWidth={chartGridStrokeWidth}
                        strokeOpacity={chartGridOpacity}
                        strokeDasharray={getStrokeDasharray(chartGridStrokeStyle)}
                      />
                    );
                  });
                  return [...yGrids, ...xGrids];
                })()
              : // 未交换：Y轴grid基于yVals值，X轴grid基于索引
                (() => {
                  // Y轴grid：基于yVals值范围
                  const yGrids = gridTicks.map((tick, i) => {
                    const gridY = singlePlotTop + singleInnerH * (1 - tick);
                    return (
                      <line
                        key={`y-${i}`}
                        x1={plotLeft}
                        y1={gridY}
                        x2={plotRight}
                        y2={gridY}
                        stroke={chartGridColor || 'var(--text)'}
                        strokeWidth={chartGridStrokeWidth}
                        strokeOpacity={chartGridOpacity}
                        strokeDasharray={getStrokeDasharray(chartGridStrokeStyle)}
                      />
                    );
                  });
                  // X轴grid：基于索引，每个数据点一个grid
                  const xGrids = effectiveXVals.map((_, i) => {
                    const gridX = xScale(i);
                    return (
                      <line
                        key={`x-${i}`}
                        x1={gridX}
                        y1={singlePlotTop}
                        x2={gridX}
                        y2={singlePlotBottom}
                        stroke={chartGridColor || 'var(--text)'}
                        strokeWidth={chartGridStrokeWidth}
                        strokeOpacity={chartGridOpacity}
                        strokeDasharray={getStrokeDasharray(chartGridStrokeStyle)}
                      />
                    );
                  });
                  return [...yGrids, ...xGrids];
                })())}
          {/* 单系列：数据层先绘制，轴和刻度后绘制以保持正确层次（与多系列一致） */}
          {viewMode === 'bar' &&
            (chartSwapXY
              ? yVals.map((val, i) => {
                  const base = baseVals[i] ?? 0;
                  const availableW = innerW * (1 - xPaddingLeft - xPaddingRight);
                  const barW_swapped =
                    ((Math.max(val, base) - Math.min(val, base)) / effectiveRangeY) * availableW;
                  const maxBarW = availableW;
                  const effectiveBarW =
                    chartBarWidth > 0
                      ? Math.min(chartBarWidth, maxBarW)
                      : chartBarMinWidth > 0
                        ? Math.min(Math.max(barW_swapped, chartBarMinWidth), maxBarW)
                        : Math.min(barW_swapped, maxBarW);
                  const x0 = xScale(Math.min(val, base));
                  const clampedX0 = Math.max(
                    plotLeft,
                    Math.min(x0, plotLeft + innerW - effectiveBarW)
                  );
                  const y0 = yScale(i) - effectiveBarW / 2;
                  const barH = effectiveBarW;
                  return (
                    <g
                      key={i}
                      className="chart-bar-group"
                      data-rowindex={i}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        className="chart-bar"
                        x={clampedX0}
                        y={y0}
                        width={Math.min(effectiveBarW, plotLeft + innerW - clampedX0)}
                        height={barH}
                        rx={chartBarCornerRadius}
                        ry={chartBarCornerRadius}
                        fill="url(#chartBarGrad)"
                        stroke={(() => {
                          const edgeStyle = getBarEdgeStyle(chartData.yConfig);
                          if (edgeStyle === 'none') return undefined;
                          const edgeWidth = getBarEdgeWidth(chartData.yConfig);
                          return edgeWidth > 0
                            ? seriesColor(0, palette, chartData.yConfig)
                            : undefined;
                        })()}
                        strokeWidth={(() => {
                          const edgeStyle = getBarEdgeStyle(chartData.yConfig);
                          if (edgeStyle === 'none') return 0;
                          return getBarEdgeWidth(chartData.yConfig);
                        })()}
                        strokeDasharray={(() => {
                          const edgeStyle = getBarEdgeStyle(chartData.yConfig);
                          return getStrokeDasharray(edgeStyle);
                        })()}
                      />
                      {(() => {
                        const showLabels = getShowDataLabels(chartData.yConfig, false);
                        if (!showLabels) return null;
                        const fontSize = getDataLabelFontSize(chartData.yConfig, 0);
                        const dataLabelFontSize = fontSize > 0 ? fontSize : labelFontSize;
                        const labelDecimals = getDataLabelDecimals(chartData.yConfig, 2);
                        const labelStyle = getDataLabelStyle(chartData.yConfig);
                        const position = (chartData.yConfig?.dataLabelPosition || 'auto') as
                          | 'top'
                          | 'bottom'
                          | 'auto';
                        const offsetX = calculateBarHorizontalDataLabelOffset(
                          position,
                          clampedX0,
                          clampedX0 + effectiveBarW,
                          effectiveBarW,
                          dataLabelFontSize,
                          plotLeft,
                          plotRight
                        );
                        const offsetY = offsetX > effectiveBarW / 2 ? -barH - 4 : 4;
                        return (
                          <text
                            className="chart-axis-label"
                            x={
                              clampedX0 +
                              effectiveBarW / 2 +
                              (chartData.yConfig?.dataLabelOffsetX ?? 0)
                            }
                            y={y0 + offsetY + (chartData.yConfig?.dataLabelOffsetY ?? 0)}
                            textAnchor={
                              position === 'auto' && offsetX === effectiveBarW / 2
                                ? 'middle'
                                : offsetX > effectiveBarW / 2
                                  ? 'start'
                                  : 'end'
                            }
                            dominantBaseline="middle"
                            style={{ fontSize: dataLabelFontSize, ...labelStyle }}
                          >
                            {formatDataLabel(val, labelDecimals)}
                          </text>
                        );
                      })()}
                    </g>
                  );
                })
              : xVals.map((_, i) => {
                  const val = yVals[i] ?? 0;
                  const base = baseVals[i] ?? 0;
                  const barTopPx = Math.min(yScale(val), yScale(base));
                  const barBottomPx = Math.max(yScale(val), yScale(base));
                  const barH = barBottomPx - barTopPx;
                  const effectiveBarH =
                    chartBarMinHeight > 0 ? Math.max(barH, chartBarMinHeight) : barH;
                  const x0 = xScale(i) - barW / 2;
                  const clampedX0 = Math.max(plotLeft, Math.min(x0, plotLeft + innerW - barW));
                  const y0 = barTopPx;
                  return (
                    <g
                      key={i}
                      className="chart-bar-group"
                      data-rowindex={i}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        className="chart-bar"
                        x={clampedX0}
                        y={y0}
                        width={Math.min(barW, plotLeft + innerW - clampedX0)}
                        height={effectiveBarH}
                        rx={chartBarCornerRadius}
                        ry={chartBarCornerRadius}
                        {...getBarRectProps(
                          chartData.yConfig,
                          seriesColor(0, palette, chartData.yConfig),
                          'chartBarGrad',
                          'chartBarFill-0'
                        )}
                      />
                      {(() => {
                        const showLabels = getShowDataLabels(chartData.yConfig, false);
                        if (!showLabels) return null;
                        const fontSize = getDataLabelFontSize(chartData.yConfig, 0);
                        const dataLabelFontSize = fontSize > 0 ? fontSize : labelFontSize;
                        const labelDecimals = getDataLabelDecimals(chartData.yConfig, 2);
                        const labelStyle = getDataLabelStyle(chartData.yConfig);
                        const position = (chartData.yConfig?.dataLabelPosition || 'auto') as
                          | 'top'
                          | 'bottom'
                          | 'auto';
                        const offsetY = calculateBarVerticalDataLabelOffset(
                          position,
                          y0,
                          y0 + effectiveBarH,
                          effectiveBarH,
                          dataLabelFontSize,
                          singlePlotTop,
                          singlePlotBottom
                        );
                        return (
                          <text
                            className="chart-axis-label"
                            x={x0 + barW / 2 + (chartData.yConfig?.dataLabelOffsetX ?? 0)}
                            y={y0 + offsetY + (chartData.yConfig?.dataLabelOffsetY ?? 0)}
                            textAnchor="middle"
                            dominantBaseline={
                              position === 'auto' && offsetY === effectiveBarH / 2
                                ? 'middle'
                                : 'auto'
                            }
                            style={{ fontSize: dataLabelFontSize, ...labelStyle }}
                          >
                            {formatDataLabel(val, labelDecimals)}
                          </text>
                        );
                      })()}
                    </g>
                  );
                }))}
          {viewMode === 'line' && effectiveN > 0 && (
            <>
              {(() => {
                const pts = chartSwapXY
                  ? yVals.map((val, i) => ({ x: xScale(val), y: yScale(i) }))
                  : xVals.map((_, i) => ({ x: xScale(i), y: yScale(yVals[i] ?? 0) }));
                const yConfig = chartData.yConfig;
                const lineColor = seriesColor(0, palette, yConfig);
                const lineStyle = getLineStyle(yConfig);
                const lineWidth = getLineWidth(yConfig);
                const lineFit = getLineFit(yConfig, false);
                const lineFitType = getLineFitType(yConfig);
                const lineFitDegree = getLineFitDegree(yConfig, 2);
                const lineProps = {
                  className: 'chart-line',
                  fill: 'none' as const,
                  stroke: lineColor,
                  strokeWidth: lineWidth,
                  strokeLinecap: 'round' as const,
                  strokeLinejoin: 'round' as const,
                  strokeDasharray: getStrokeDasharray(lineStyle),
                };
                return lineFit && effectiveN >= 2 ? (
                  <path {...lineProps} d={generateFitLinePath(pts, lineFitType, lineFitDegree)} />
                ) : (
                  <polyline {...lineProps} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />
                );
              })()}
              {getLineShowPoints(chartData.yConfig, true) &&
                (chartSwapXY
                  ? yVals.map((val, i) => ({
                      x: xScale(val),
                      y: yScale(i),
                    }))
                  : xVals.map((_, i) => ({
                      x: xScale(i),
                      y: yScale(yVals[i] ?? 0),
                    }))
                ).map((pt, idx) => (
                  <circle
                    key={idx}
                    className="chart-point"
                    cx={pt.x}
                    cy={pt.y}
                    r={getMarkerSize(chartData.yConfig, 4)}
                    fill={getMarkerFillColor(
                      seriesColor(0, palette, chartData.yConfig),
                      chartData.yConfig
                    )}
                    stroke={getMarkerEdgeColor('#fff', chartData.yConfig)}
                  />
                ))}
            </>
          )}
          {viewMode === 'scatter' &&
            effectiveN > 0 &&
            chartData.yConfig &&
            (() => {
              const config = getScatterMarkerConfig(
                chartData.yConfig,
                seriesColor(0, palette, chartData.yConfig)
              );
              return chartSwapXY
                ? yVals.map((val, i) => {
                    const marker = renderMarker(
                      xScale(val),
                      yScale(i),
                      config.style,
                      config.size,
                      config.fillColor,
                      config.edgeColor,
                      config.edgeWidth,
                      config.opacity,
                      `s0-${i}`
                    );
                    return (
                      <g
                        key={i}
                        className="chart-scatter-group"
                        data-rowindex={i}
                        style={{ cursor: 'pointer' }}
                      >
                        {marker}
                      </g>
                    );
                  })
                : xVals.map((_, i) => {
                    const marker = renderMarker(
                      xScale(i),
                      yScale(yVals[i] ?? 0),
                      config.style,
                      config.size,
                      config.fillColor,
                      config.edgeColor,
                      config.edgeWidth,
                      config.opacity,
                      `s0-${i}`
                    );
                    return (
                      <g
                        key={i}
                        className="chart-scatter-group"
                        data-rowindex={i}
                        style={{ cursor: 'pointer' }}
                      >
                        {marker}
                      </g>
                    );
                  });
            })()}
          {chartShowAxisLine &&
            chartAxisBoxStyle !== 'none' &&
            (() => {
              const strokeDasharray =
                chartAxisStrokeStyle === 'solid'
                  ? undefined
                  : chartAxisStrokeStyle === 'dashed'
                    ? '5,5'
                    : chartAxisStrokeStyle === 'dotted'
                      ? '2,2'
                      : chartAxisStrokeStyle === 'dashdot'
                        ? '5,2,2,2'
                        : undefined;

              if (chartAxisBoxStyle === 'full') {
                // 全包：绘制完整的矩形边框
                return (
                  <rect
                    x={plotLeft}
                    y={singlePlotTop}
                    width={innerW}
                    height={singleInnerH}
                    fill="none"
                    stroke={chartAxisColor || 'var(--text)'}
                    strokeWidth={chartAxisStrokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                );
              } else {
                // 半包：只绘制底部和左侧轴线
                return (
                  <>
                    <line
                      x1={plotLeft}
                      y1={singlePlotTop}
                      x2={plotLeft}
                      y2={singlePlotBottom}
                      stroke={chartAxisColor || 'var(--text)'}
                      strokeWidth={chartAxisStrokeWidth}
                      strokeDasharray={strokeDasharray}
                    />
                    <line
                      x1={plotLeft}
                      y1={singlePlotBottom}
                      x2={plotRight}
                      y2={singlePlotBottom}
                      stroke={chartAxisColor || 'var(--text)'}
                      strokeWidth={chartAxisStrokeWidth}
                      strokeDasharray={strokeDasharray}
                    />
                  </>
                );
              }
            })()}
          {effectiveTickLength > 0 &&
            (chartSwapXY
              ? // 交换后：X轴刻度基于yVals值，Y轴刻度基于xVals索引
                (() => {
                  // X轴刻度：基于yVals的值范围
                  const xTicks = gridTicks.map((tick, i) => {
                    const tickX = xScale(effectiveMinY + tick * effectiveRangeY);
                    return (
                      <g key={`x-${i}`}>
                        <line
                          x1={tickX}
                          y1={singlePlotBottom}
                          x2={tickX}
                          y2={
                            singlePlotBottom +
                            (isInside ? -effectiveTickLength : effectiveTickLength)
                          }
                          stroke={chartTickColor || 'var(--text)'}
                          strokeWidth={chartAxisStrokeWidth}
                        />
                        {isFull && (
                          <line
                            x1={tickX}
                            y1={singlePlotTop}
                            x2={tickX}
                            y2={
                              singlePlotTop +
                              (isInside ? effectiveTickLength : -effectiveTickLength)
                            }
                            stroke={chartTickColor || 'var(--text)'}
                            strokeWidth={chartAxisStrokeWidth}
                          />
                        )}
                      </g>
                    );
                  });
                  // Y轴刻度：基于xVals的索引
                  const yTicks = xVals.map((_, i) => {
                    const tickY = yScale(i);
                    return (
                      <g key={`y-${i}`}>
                        <line
                          x1={plotLeft}
                          y1={tickY}
                          x2={plotLeft + (isInside ? effectiveTickLength : -effectiveTickLength)}
                          y2={tickY}
                          stroke={chartTickColor || 'var(--text)'}
                          strokeWidth={chartAxisStrokeWidth}
                        />
                        {isFull && (
                          <line
                            x1={plotRight}
                            y1={tickY}
                            x2={plotRight + (isInside ? -effectiveTickLength : effectiveTickLength)}
                            y2={tickY}
                            stroke={chartTickColor || 'var(--text)'}
                            strokeWidth={chartAxisStrokeWidth}
                          />
                        )}
                      </g>
                    );
                  });
                  return [...xTicks, ...yTicks];
                })()
              : // 未交换：X轴刻度基于索引（每个数据点），Y轴刻度基于yVals值
                (() => {
                  // X轴刻度：基于索引，每个数据点一个刻度
                  const xTicks = effectiveXVals.map((_, i) => {
                    const tickX = xScale(i);
                    return (
                      <g key={`x-${i}`}>
                        <line
                          x1={tickX}
                          y1={singlePlotBottom}
                          x2={tickX}
                          y2={
                            singlePlotBottom +
                            (isInside ? -effectiveTickLength : effectiveTickLength)
                          }
                          stroke={chartTickColor || 'var(--text)'}
                          strokeWidth={chartAxisStrokeWidth}
                        />
                        {isFull && (
                          <line
                            x1={tickX}
                            y1={singlePlotTop}
                            x2={tickX}
                            y2={
                              singlePlotTop +
                              (isInside ? effectiveTickLength : -effectiveTickLength)
                            }
                            stroke={chartTickColor || 'var(--text)'}
                            strokeWidth={chartAxisStrokeWidth}
                          />
                        )}
                      </g>
                    );
                  });
                  // Y轴刻度：基于数值范围
                  const yTicks = gridTicks.map((tick, i) => {
                    const tickY = singlePlotTop + singleInnerH * (1 - tick);
                    return (
                      <g key={`y-${i}`}>
                        <line
                          x1={plotLeft}
                          y1={tickY}
                          x2={plotLeft + (isInside ? effectiveTickLength : -effectiveTickLength)}
                          y2={tickY}
                          stroke={chartTickColor || 'var(--text)'}
                          strokeWidth={chartAxisStrokeWidth}
                        />
                        {isFull && (
                          <line
                            x1={plotRight}
                            y1={tickY}
                            x2={plotRight + (isInside ? -effectiveTickLength : effectiveTickLength)}
                            y2={tickY}
                            stroke={chartTickColor || 'var(--text)'}
                            strokeWidth={chartAxisStrokeWidth}
                          />
                        )}
                      </g>
                    );
                  });
                  return [...xTicks, ...yTicks];
                })())}
          {effectiveYTitle && (
            <text
              x={plotLeft - axisLabelW - 6}
              y={singlePlotTop + singleInnerH / 2}
              textAnchor="middle"
              style={{ fontSize: axisTitleFontSize }}
              className="chart-axis-title"
              transform={`rotate(-90, ${plotLeft - axisLabelW - 6}, ${singlePlotTop + singleInnerH / 2})`}
            >
              {truncate(effectiveYTitle, 20)}
            </text>
          )}
          {chartShowAxisLabels &&
            (chartSwapXY
              ? // 交换后：Y轴显示xVals标签，X轴显示yVals数值刻度
                (() => {
                  // Y轴标签：显示所有xVals
                  const yLabels = xVals.map((xVal, i) => (
                    <text
                      key={`y-${i}`}
                      className="chart-axis-label"
                      x={plotLeft - 6}
                      y={yScale(i)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      style={axisLabelStyle}
                    >
                      {truncate(xVal, labelTruncate)}
                    </text>
                  ));
                  // X轴刻度：基于yVals的值范围
                  const xTicks = gridTicks.map((tick, i) => (
                    <text
                      key={`x-${i}`}
                      className="chart-axis-label"
                      x={xScale(effectiveMinY + tick * effectiveRangeY)}
                      y={labelY}
                      textAnchor="middle"
                      style={axisLabelStyle}
                    >
                      {formatAxisTick(effectiveMinY + tick * effectiveRangeY)}
                    </text>
                  ));
                  return [...yLabels, ...xTicks];
                })()
              : // 未交换：Y轴显示数值刻度，X轴显示标签
                (() => {
                  // Y轴刻度：基于数值范围
                  const yTicks = gridTicks.map((tick, i) => (
                    <text
                      key={`y-${i}`}
                      className="chart-axis-label"
                      x={plotLeft - 6}
                      y={singlePlotTop + singleInnerH * (1 - tick)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      style={axisLabelStyle}
                    >
                      {formatAxisTick(effectiveMinY + tick * effectiveRangeY)}
                    </text>
                  ));
                  // X轴标签：显示所有xVals
                  const xLabels = effectiveXVals.map((xVal, i) => (
                    <text
                      key={`x-${i}`}
                      className="chart-axis-label"
                      x={xScale(i)}
                      y={labelY}
                      textAnchor="middle"
                      style={axisLabelStyle}
                    >
                      {truncate(xVal, labelTruncate)}
                    </text>
                  ));
                  return [...yTicks, ...xLabels];
                })())}
          {effectiveXTitle && (
            <text
              x={plotLeft + innerW / 2}
              y={singlePlotBottom + axisLabelH + axisTitleFontSize - 2}
              textAnchor="middle"
              style={{ fontSize: axisTitleFontSize }}
              className="chart-axis-title"
            >
              {truncate(effectiveXTitle, 30)}
            </text>
          )}

          {viewMode === 'pie' &&
            yVals.length > 0 &&
            (() => {
              // 按 x 值去重并累加 y 值
              const xValueMap = new Map<
                string,
                { value: number; label: string; firstIndex: number }
              >();
              xVals.forEach((xVal, i) => {
                const yVal = yVals[i] ?? 0;
                if (xValueMap.has(xVal)) {
                  const existing = xValueMap.get(xVal)!;
                  existing.value += yVal;
                } else {
                  xValueMap.set(xVal, { value: yVal, label: xVal, firstIndex: i });
                }
              });
              const pieData = Array.from(xValueMap.values()).filter((item) => item.value > 0);
              const total = pieData.reduce((a, b) => a + b.value, 0) || 1;
              const cx = plotLeft + innerW / 2;
              const cy = singlePlotTop + singleInnerH / 2;
              const r = Math.min(innerW, singleInnerH) / 2 - 8;
              const innerR =
                chartPieInnerRadius > 0 ? r * (Math.min(80, chartPieInnerRadius) / 100) : 0;
              const startOffset = ((chartPieStartAngle % 360) + 360) % 360;
              let acc = 0;
              return (
                <>
                  {pieData.map((item, idx) => {
                    const v = item.value;
                    const startDeg = (acc / total) * 360 + startOffset;
                    const sweepDeg = (v / total) * 360;
                    acc += v;
                    const startRad = deg2rad(startDeg);
                    const endRad = deg2rad(startDeg + sweepDeg);
                    const large = sweepDeg > 180 ? 1 : 0;
                    const x1o = cx + r * Math.cos(startRad);
                    const y1o = cy + r * Math.sin(startRad);
                    const x2o = cx + r * Math.cos(endRad);
                    const y2o = cy + r * Math.sin(endRad);
                    const d =
                      innerR <= 0
                        ? `M ${cx} ${cy} L ${x1o} ${y1o} A ${r} ${r} 0 ${large} 1 ${x2o} ${y2o} Z`
                        : (() => {
                            const x1i = cx + innerR * Math.cos(startRad);
                            const y1i = cy + innerR * Math.sin(startRad);
                            const x2i = cx + innerR * Math.cos(endRad);
                            const y2i = cy + innerR * Math.sin(endRad);
                            return `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${r} ${r} 0 ${large} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${innerR} ${innerR} 0 ${large} 0 ${x1i} ${y1i} Z`;
                          })();
                    const fillStyle = getPieFillStyle(chartData.yConfig);
                    const color = seriesColor(0, palette, chartData.yConfig);
                    const edgeStyle = getPieEdgeStyle(chartData.yConfig);
                    const edgeWidth = getPieEdgeWidth(chartData.yConfig);
                    return (
                      <g key={idx} data-rowindex={item.firstIndex} style={{ cursor: 'pointer' }}>
                        <path
                          className="chart-pie-slice"
                          d={d}
                          fill={
                            fillStyle === 'gradient'
                              ? `url(#chartPieGrad-0-${idx})`
                              : isPatternFill(fillStyle)
                                ? `url(#chartPieFill-0-${idx})`
                                : color
                          }
                          fillOpacity={pieSliceOpacity(idx)}
                          stroke={
                            edgeStyle === 'none' ? undefined : edgeWidth > 0 ? color : undefined
                          }
                          strokeWidth={edgeStyle === 'none' ? 0 : edgeWidth}
                          strokeDasharray={getStrokeDasharray(edgeStyle)}
                        />
                      </g>
                    );
                  })}
                  {chartPieLabelPosition !== 'none' &&
                    chartShowAxisLabels &&
                    pieData.map((item, idx) => {
                      const prevSum = pieData.slice(0, idx).reduce((a, b) => a + b.value, 0);
                      const midDeg = ((prevSum + item.value / 2) / total) * 360 + startOffset;
                      const rad = deg2rad(midDeg);
                      const labelRadius =
                        chartPieLabelPosition === 'inside' ? r * 0.5 : PIE_LABEL_RATIO * r;
                      const tx = cx + labelRadius * Math.cos(rad);
                      const ty = cy + labelRadius * Math.sin(rad);
                      return (
                        <text
                          key={idx}
                          className="chart-pie-label"
                          x={tx}
                          y={ty}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {truncate(item.label, pieLabelTruncate)}
                        </text>
                      );
                    })}
                </>
              );
            })()}
        </g>
      </svg>
    );
  }

  const { xLabels, seriesNames, data, baseData, seriesConfigs } = chartData;
  // 创建系列名称到原始索引的映射（用于查找配置）
  const seriesNameToIndex = new Map(seriesNames.map((name, idx) => [name, idx]));
  // 如果交换X/Y，需要重新组织数据
  const effectiveN = chartSwapXY ? seriesNames.length : xLabels.length;
  const effectiveSeriesCount = chartSwapXY ? xLabels.length : seriesCount;
  const effectiveXLabels = chartSwapXY ? seriesNames.map(String) : xLabels;
  // 使用过滤后的系列名称（已过滤不可见系列）
  const effectiveSeriesNames = chartSwapXY ? xLabels : filteredSeriesNames;
  const customBaseValues = (baseData ?? []).flat().filter((v) => !Number.isNaN(v));
  const dataMinY_withBases = Math.min(0, ...data.flat(), ...customBaseValues);
  const dataMaxY_withBases = Math.max(1, ...data.flat(), ...customBaseValues);
  const dataRangeY_withBases = dataMaxY_withBases - dataMinY_withBases || 1;
  const hasCustomBase = seriesConfigs.some((sc) => sc.barBaseKey);
  const hasNoBase = seriesConfigs.some((sc) => !sc.barBaseKey);
  const valueScalePaddingMin =
    viewMode === 'bar' && (!hasCustomBase || hasNoBase)
      ? 0
      : chartSwapXY
        ? Math.max(0, Math.min(50, chartAxisPaddingLeft)) / 100
        : Math.max(0, Math.min(50, chartAxisPaddingBottom)) / 100;
  const axisBottomMulti =
    dataMinY_withBases - dataRangeY_withBases * valueScalePaddingMin;
  const resolveBase = (v: number) => (Number.isNaN(v) ? axisBottomMulti : v);
  const baseDataSafe = (baseData ?? data.map((row) => row.map(() => NaN))).map((row) =>
    row.map(resolveBase)
  );
  // 创建过滤后的数据：只包含可见系列的数据
  const effectiveData = chartSwapXY
    ? (() => {
        // 转置：effectiveData[seriesIndex][xLabelIndex] = data[xLabelIndex][seriesIndex]
        return seriesNames.map((_, j) => xLabels.map((_, i) => data[i]?.[j] ?? 0));
      })()
    : data.map((row) => visibleSeriesIndices.map((origIdx) => row[origIdx] ?? 0));
  const effectiveBaseData = chartSwapXY
    ? seriesNames.map((_, j) => xLabels.map((_, i) => baseDataSafe[i]?.[j] ?? 0))
    : baseDataSafe.map((row) => visibleSeriesIndices.map((origIdx) => row[origIdx] ?? 0));

  // 辅助函数：根据系列名称获取原始索引
  const getOriginalSeriesIndex = (seriesName: string): number => {
    return seriesNameToIndex.get(seriesName) ?? 0;
  };

  const dataMaxY = Math.max(1, ...effectiveData.flat(), ...effectiveBaseData.flat());
  const dataMinY = Math.min(0, ...effectiveData.flat(), ...effectiveBaseData.flat());
  const dataRangeY = dataMaxY - dataMinY || 1;
  const paddingTop = Math.max(0, Math.min(50, chartAxisPaddingTop)) / 100;
  const paddingBottom = Math.max(0, Math.min(50, chartAxisPaddingBottom)) / 100;
  const paddingLeft = Math.max(0, Math.min(50, chartAxisPaddingLeft)) / 100;
  const paddingRight = Math.max(0, Math.min(50, chartAxisPaddingRight)) / 100;
  const maxY = dataMaxY + dataRangeY * paddingTop;
  const minY = dataMinY - dataRangeY * valueScalePaddingMin;
  const rangeY = maxY - minY || 1;

  // X轴缩放：如果交换，基于data的值（考虑左右padding）；否则基于索引（考虑左右padding）
  const xPaddingLeft = paddingLeft / (1 + paddingLeft + paddingRight);
  const xPaddingRight = paddingRight / (1 + paddingLeft + paddingRight);

  // 计算可用宽度（考虑padding后的实际可用空间）
  const availableW = innerW * (1 - xPaddingLeft - xPaddingRight);
  const totalBarGapOuter =
    effectiveN > 1 ? (effectiveN - 1) * Math.max(0, chartBarGapOuter) : 0;
  const groupW =
    effectiveN > 0 ? Math.max(0, (availableW - totalBarGapOuter) / effectiveN) : availableW;
  const totalBarGapInner =
    effectiveSeriesCount > 1
      ? (effectiveSeriesCount - 1) * Math.max(0, chartBarGapInner)
      : 0;
  const maxBarWPerSeries =
    effectiveSeriesCount > 0
      ? Math.max(0, (groupW - totalBarGapInner) / effectiveSeriesCount)
      : groupW;
  // 如果设置了固定宽度，使用固定宽度（但不超过最大可用宽度）；否则自适应计算
  const computedBarW =
    chartBarWidth > 0 ? Math.min(chartBarWidth, maxBarWPerSeries) : maxBarWPerSeries;
  // 如果设置了最小宽度，确保不超过最大可用宽度
  const barW =
    effectiveSeriesCount > 0
      ? chartBarMinWidth > 0 && chartBarWidth === 0
        ? Math.min(chartBarMinWidth, maxBarWPerSeries) // 确保不超过最大可用宽度
        : computedBarW
      : 10;
  const labelY = plotBottom + axisLabelH - 4;
  const barNoBaseMulti = viewMode === 'bar' && hasNoBase;
  const plotPaddingLeftMulti = barNoBaseMulti && chartSwapXY ? 0 : xPaddingLeft;
  const plotPaddingRightMulti = xPaddingRight;
  const xScale = chartSwapXY
    ? (v: number) => {
        const ratio = rangeY > 0 ? (v - minY) / rangeY : 0;
        return (
          plotLeft +
          plotPaddingLeftMulti * innerW +
          ratio * (1 - plotPaddingLeftMulti - plotPaddingRightMulti) * innerW
        );
      }
    : (i: number) => {
        const ratio = effectiveN <= 1 ? 0.5 : i / Math.max(1, effectiveN - 1);
        return (
          plotLeft +
          plotPaddingLeftMulti * innerW +
          ratio * (1 - plotPaddingLeftMulti - plotPaddingRightMulti) * innerW
        );
      };

  const yPaddingTop = paddingTop / (1 + paddingTop + paddingBottom);
  const yPaddingBottom = paddingBottom / (1 + paddingTop + paddingBottom);
  const plotPaddingTopMulti = yPaddingTop;
  const plotPaddingBottomMulti = barNoBaseMulti && !chartSwapXY ? 0 : yPaddingBottom;
  const yScale = chartSwapXY
    ? (i: number) => {
        const n = Math.max(1, effectiveSeriesCount - 1);
        const ratio = i / n;
        return (
          plotTop +
          plotPaddingTopMulti * innerH +
          (1 - ratio) * (1 - plotPaddingTopMulti - plotPaddingBottomMulti) * innerH
        );
      }
    : (v: number) => {
        const ratio = rangeY > 0 ? (v - minY) / rangeY : 0;
        return (
          plotTop +
          plotPaddingTopMulti * innerH +
          (1 - ratio) * (1 - plotPaddingTopMulti - plotPaddingBottomMulti) * innerH
        );
      };
  const availableBarH = innerH * (1 - plotPaddingTopMulti - plotPaddingBottomMulti);
  const groupHeightSwapped =
    chartSwapXY && effectiveSeriesCount > 0
      ? effectiveSeriesCount > 1
        ? availableBarH / (effectiveSeriesCount - 1) - Math.max(0, chartBarGapOuter)
        : availableBarH
      : 0;
  const barThicknessSwapped =
    chartSwapXY && effectiveN > 0 && groupHeightSwapped > 0
      ? Math.max(
          1,
          (groupHeightSwapped - (effectiveN - 1) * Math.max(0, chartBarGapInner)) / effectiveN
        )
      : 0;
  const getBarCenterYSwapped = (categoryIdx: number, seriesIdx: number) => {
    const tickY = yScale(categoryIdx);
    return (
      tickY -
      groupHeightSwapped / 2 +
      seriesIdx * (barThicknessSwapped + Math.max(0, chartBarGapInner)) +
      barThicknessSwapped / 2
    );
  };

  // legendCharW, legendItemSpacing, maxLegendItemW 已在上面计算
  // 图例偏移量（不再交换）
  const effectiveOffsetX = chartLegendOffsetX ?? 0;
  const effectiveOffsetY = chartLegendOffsetY ?? 0;
  // 始终使用横向排布，通过最大列数控制换行

  // 计算图例列数：根据可用宽度自动计算，使用所有系列名称以确保完全展开
  const availableLegendW =
    isLegendOnTop || isLegendOnBottom
      ? innerW
      : isLegendOnLeft || isLegendOnRight
        ? legendWidth > 0
          ? legendWidth
          : autoLegendWidth
        : innerW; // 内部或其他位置也使用 innerW
  // 计算一行能放多少个图例项（横向排布）
  const autoItemsPerRow = Math.max(1, Math.floor(availableLegendW / maxLegendItemW));
  // 如果配置了最大列数，则使用配置值（0表示自动）
  const itemsPerRow =
    chartLegendMaxColumns > 0 ? Math.min(chartLegendMaxColumns, autoItemsPerRow) : autoItemsPerRow;
  const legendCols = itemsPerRow;
  // 计算实际图例行数
  const actualLegendRows = Math.ceil(allSeriesCount / Math.max(1, legendCols));
  // 计算图例总宽度（用于居中）：第一行的实际项数 * 每项宽度 - 最后一项后的间距
  const firstRowItems = Math.min(legendCols, allSeriesCount);
  const totalLegendW = firstRowItems * maxLegendItemW - legendItemSpacing;

  const legendX = chartLegendInside
    ? isLegendOnLeft
      ? plotLeft + 12 + effectiveOffsetX
      : isLegendOnRight
        ? plotRight - 12 - totalLegendW + effectiveOffsetX
        : plotLeft + innerW / 2 - totalLegendW / 2 + effectiveOffsetX
    : isLegendOnLeft
      ? padding + 8 + effectiveOffsetX
      : isLegendOnRight
        ? w - padding - totalLegendW - 8 + effectiveOffsetX
        : w / 2 - totalLegendW / 2 + effectiveOffsetX;
  const legendY = chartLegendInside
    ? isLegendOnTop
      ? plotTop + 12 + effectiveOffsetY
      : isLegendOnBottom
        ? plotBottom - 12 - actualLegendRows * legendItemH + effectiveOffsetY
        : plotTop + innerH / 2 - (actualLegendRows * legendItemH) / 2 + effectiveOffsetY
    : isLegendOnTop
      ? padding + titleH + LEGEND_GAP + effectiveOffsetY
      : isLegendOnBottom
        ? h - padding - legendHeight + LEGEND_GAP + effectiveOffsetY
        : plotTop + innerH / 2 - (actualLegendRows * legendItemH) / 2 + effectiveOffsetY;

  return chartWrap(
    <svg
      ref={svgRef}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="chart-svg"
      style={{ fontFamily: s.fontFamily, fontSize: labelFontSize }}
      onClick={onChartClick}
    >
      <defs>
        {seriesNames.map((_, si) => {
          const config = chartData.seriesConfigs[si];
          const color = seriesColor(si, palette, config);
          const barFillStyle = getBarFillStyle(config);
          const pieFillStyle = getPieFillStyle(config);
          return (
            <g key={si}>
              <linearGradient id={`chartBarGrad-${si}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                <stop offset="100%" stopColor={color} stopOpacity="1" />
              </linearGradient>
              {renderFillPattern(barFillStyle, color, `chartBarFill-${si}`)}
              {pieFillStyle === 'gradient' && (
                <radialGradient id={`chartPieGrad-${si}`}>
                  <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={color} stopOpacity="1" />
                </radialGradient>
              )}
              {renderFillPattern(pieFillStyle, color, `chartPieFill-${si}`)}
            </g>
          );
        })}
      </defs>
      <g className="chart-content">
        {chartTitle && (
          <text
            className="chart-title"
            x={w / 2}
            y={padding + titleFontSize}
            textAnchor="middle"
            style={{ fontSize: titleFontSize }}
          >
            {truncate(chartTitle, 40)}
          </text>
        )}
        {chartShowLegend && chartData.kind === 'multi' && chartData.seriesNames.length > 0 && (
          <g className="chart-legend" style={{ fontSize: legendFontSize }}>
            {chartData.seriesNames.map((name, originalSi) => {
              const isVisible = chartSeriesVisibility[name] !== false;
              // 始终横向排布
              const row = Math.floor(originalSi / legendCols);
              const col = originalSi % legendCols;
              const lx = legendX + col * maxLegendItemW;
              const ly = legendY + row * legendItemH;
              const symbolX = 0;
              return (
                <g key={originalSi} transform={`translate(${lx},${ly})`}>
                  {/* 系列图例符号 */}
                  <g
                    transform={`translate(${symbolX + effectiveLegendSymbolSize / 2}, 0)`}
                    opacity={isVisible ? 1 : 0.3}
                  >
                    {renderLegendSymbol(
                      viewMode,
                      effectiveLegendSymbolSize / 2,
                      0,
                      effectiveLegendSymbolSize,
                      seriesColor(originalSi, palette, chartData.seriesConfigs[originalSi]),
                      chartData.seriesConfigs[originalSi],
                      viewMode === 'bar'
                        ? `chartBarFill-${originalSi}`
                        : viewMode === 'pie'
                          ? `chartPieFill-${originalSi}`
                          : undefined
                    )}
                  </g>
                  {/* 系列名称 */}
                  <text
                    x={symbolX + effectiveLegendSymbolSize + 8}
                    y={0}
                    textAnchor="start"
                    dominantBaseline="middle"
                    className="chart-legend-label"
                    style={{ ...legendLabelStyle, opacity: isVisible ? 1 : 0.5 }}
                  >
                    {legendLabelDisplay(name)}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        {chartShowGrid &&
          (chartSwapXY
            ? // 交换后：Y轴grid基于xLabels索引，X轴grid基于data值
              (() => {
                // Y轴grid：基于xLabels索引
                const yGrids = effectiveSeriesNames.map((_, i) => {
                  const gridY = yScale(i);
                  return (
                    <line
                      key={`y-${i}`}
                      x1={plotLeft}
                      y1={gridY}
                      x2={plotRight}
                      y2={gridY}
                      stroke={chartGridColor || 'var(--text)'}
                      strokeWidth={chartGridStrokeWidth}
                      strokeOpacity={chartGridOpacity}
                      strokeDasharray={getStrokeDasharray(chartGridStrokeStyle)}
                    />
                  );
                });
                // X轴grid：基于data值范围
                const xGrids = gridTicks.map((tick, i) => {
                  const gridX = xScale(minY + tick * rangeY);
                  return (
                    <line
                      key={`x-${i}`}
                      x1={gridX}
                      y1={plotTop}
                      x2={gridX}
                      y2={plotBottom}
                      stroke={chartGridColor || 'var(--text)'}
                      strokeWidth={chartGridStrokeWidth}
                      strokeOpacity={chartGridOpacity}
                      strokeDasharray={getStrokeDasharray(chartGridStrokeStyle)}
                    />
                  );
                });
                return [...yGrids, ...xGrids];
              })()
            : // 未交换：Y轴grid基于data值，X轴grid基于索引
              (() => {
                // Y轴grid：基于data值范围
                const yGrids = gridTicks.map((tick, i) => {
                  const gridY = plotTop + innerH * (1 - tick);
                  return (
                    <line
                      key={`y-${i}`}
                      x1={plotLeft}
                      y1={gridY}
                      x2={plotRight}
                      y2={gridY}
                      stroke={chartGridColor || 'var(--text)'}
                      strokeWidth={chartGridStrokeWidth}
                      strokeOpacity={chartGridOpacity}
                      strokeDasharray={getStrokeDasharray(chartGridStrokeStyle)}
                    />
                  );
                });
                // X轴grid：基于索引，每个数据点一个grid
                const xGrids = effectiveXLabels.map((_, i) => {
                  const gridX = xScale(i);
                  return (
                    <line
                      key={`x-${i}`}
                      x1={gridX}
                      y1={plotTop}
                      x2={gridX}
                      y2={plotBottom}
                      stroke={chartGridColor || 'var(--text)'}
                      strokeWidth={chartGridStrokeWidth}
                      strokeOpacity={chartGridOpacity}
                      strokeDasharray={getStrokeDasharray(chartGridStrokeStyle)}
                    />
                  );
                });
                return [...yGrids, ...xGrids];
              })())}

        {viewMode === 'bar' &&
          (chartSwapXY
            ? effectiveData.map((seriesData, si) => {
                const seriesName = seriesNames[si];
                if (chartSeriesVisibility[seriesName] === false) return null;
                const seriesConfig = seriesConfigs[si];
                return (
                  <g key={si} className="chart-bar-group">
                    {seriesData.map((val, i) => {
                      const base = effectiveBaseData[si]?.[i] ?? 0;
                      const barLeft = Math.min(xScale(val), xScale(base));
                      const barRight = Math.max(xScale(val), xScale(base));
                      const barLength = barRight - barLeft;
                      const yCenter = getBarCenterYSwapped(i, si);
                      const y0 = yCenter - barThicknessSwapped / 2;
                      const x0 = barLeft;
                      const clampedX0 = Math.max(plotLeft, Math.min(x0, plotLeft + innerW - barLength));
                      return (
                        <g
                          key={i}
                          data-xindex={i}
                          data-seriesindex={si}
                          style={{ cursor: 'pointer' }}
                        >
                          <rect
                            className="chart-bar"
                            x={clampedX0}
                            y={y0}
                            width={Math.min(barLength, plotLeft + innerW - clampedX0)}
                            height={barThicknessSwapped}
                            rx={chartBarCornerRadius}
                            ry={chartBarCornerRadius}
                            {...getBarRectProps(
                              seriesConfig,
                              seriesColor(si, palette, seriesConfig),
                              `chartBarGrad-${si}`,
                              `chartBarFill-${si}`
                            )}
                          />
                          {(() => {
                            const showLabels = getShowDataLabels(seriesConfig, false);
                            if (!showLabels) return null;
                            const fontSize = getDataLabelFontSize(seriesConfig, 0);
                            const dataLabelFontSize = fontSize > 0 ? fontSize : labelFontSize;
                            const labelDecimals = getDataLabelDecimals(seriesConfig, 2);
                            const labelStyle = getDataLabelStyle(seriesConfig);
                            const position = (seriesConfig?.dataLabelPosition || 'auto') as
                              | 'top'
                              | 'bottom'
                              | 'auto';
                            const barCenterX = (barLeft + barRight) / 2;
                            const offsetX = calculateBarHorizontalDataLabelOffset(
                              position,
                              barLeft,
                              barRight,
                              barLength,
                              dataLabelFontSize,
                              plotLeft,
                              plotRight
                            );
                            const offsetY = offsetX > barLength / 2 ? -barThicknessSwapped - 4 : 4;
                            return (
                              <text
                                className="chart-axis-label"
                                x={barCenterX + offsetX + (seriesConfig?.dataLabelOffsetX ?? 0)}
                                y={yCenter + offsetY + (seriesConfig?.dataLabelOffsetY ?? 0)}
                                textAnchor={
                                  position === 'auto' && offsetX === barLength / 2
                                    ? 'middle'
                                    : offsetX > barLength / 2
                                      ? 'start'
                                      : 'end'
                                }
                                dominantBaseline="middle"
                                style={{ fontSize: dataLabelFontSize, ...labelStyle }}
                              >
                                {formatDataLabel(val, labelDecimals)}
                              </text>
                            );
                          })()}
                        </g>
                      );
                    })}
                  </g>
                );
              })
            : effectiveXLabels.map((_, i) => {
                const tickX = xScale(i);
                const groupLeft = tickX - groupW / 2;
                const totalBarsWidth =
                  effectiveSeriesCount * barW + totalBarGapInner;
                const actualGroupLeft =
                  totalBarsWidth <= groupW
                    ? groupLeft + (groupW - totalBarsWidth) / 2
                    : groupLeft;
                return (
                  <g key={i} className="chart-bar-group">
                    {effectiveSeriesNames.map((seriesName, si) => {
                      const origIdx = getOriginalSeriesIndex(seriesName);
                      const val = effectiveData[i]?.[si] ?? 0;
                      const base = effectiveBaseData[i]?.[si] ?? 0;
                      const barTopPx = Math.min(yScale(val), yScale(base));
                      const barBottomPx = Math.max(yScale(val), yScale(base));
                      const barH = barBottomPx - barTopPx;
                      const effectiveBarH =
                        chartBarMinHeight > 0 ? Math.max(barH, chartBarMinHeight) : barH;
                      const x0 = actualGroupLeft + si * (barW + chartBarGapInner);
                      const clampedX0 = Math.max(
                        groupLeft,
                        Math.min(x0, groupLeft + groupW - barW)
                      );
                      const y0 = barTopPx;
                      const seriesConfig = seriesConfigs[origIdx];
                      return (
                        <g
                          key={si}
                          data-xindex={i}
                          data-seriesindex={origIdx}
                          style={{ cursor: 'pointer' }}
                        >
                          <rect
                            className="chart-bar"
                            x={clampedX0}
                            y={y0}
                            width={Math.min(barW, groupLeft + groupW - clampedX0)} // 确保宽度不超出组边界
                            height={effectiveBarH}
                            rx={chartBarCornerRadius}
                            ry={chartBarCornerRadius}
                            {...getBarRectProps(
                              seriesConfig,
                              seriesColor(origIdx, palette, seriesConfig),
                              `chartBarGrad-${origIdx}`,
                              `chartBarFill-${origIdx}`
                            )}
                          />
                          {(() => {
                            const showLabels = getShowDataLabels(seriesConfig, false);
                            if (!showLabels) return null;
                            const fontSize = getDataLabelFontSize(seriesConfig, 0);
                            const dataLabelFontSize = fontSize > 0 ? fontSize : labelFontSize;
                            const labelDecimals = getDataLabelDecimals(seriesConfig, 2);
                            const labelStyle = getDataLabelStyle(seriesConfig);
                            const position = (seriesConfig?.dataLabelPosition || 'auto') as
                              | 'top'
                              | 'bottom'
                              | 'auto';
                            const offsetY = calculateBarVerticalDataLabelOffset(
                              position,
                              y0,
                              y0 + effectiveBarH,
                              effectiveBarH,
                              dataLabelFontSize,
                              plotTop,
                              plotBottom
                            );
                            return (
                              <text
                                className="chart-axis-label"
                                x={clampedX0 + barW / 2 + (seriesConfig?.dataLabelOffsetX ?? 0)}
                                y={y0 + offsetY + (seriesConfig?.dataLabelOffsetY ?? 0)}
                                textAnchor="middle"
                                dominantBaseline={
                                  position === 'auto' && offsetY === -effectiveBarH / 2
                                    ? 'middle'
                                    : 'auto'
                                }
                                style={{ fontSize: dataLabelFontSize, ...labelStyle }}
                              >
                                {formatDataLabel(val, labelDecimals)}
                              </text>
                            );
                          })()}
                        </g>
                      );
                    })}
                  </g>
                );
              }))}

        {viewMode === 'line' &&
          (chartSwapXY
            ? effectiveData.map((seriesData, si) => {
                const seriesName = seriesNames[si];
                if (chartSeriesVisibility[seriesName] === false) return null;
                const seriesConfig = seriesConfigs[si];
                const pts = seriesData.map((val, idx) => ({
                  x: xScale(val),
                  y: yScale(idx),
                }));
                const lineWidth = getLineWidth(seriesConfig);
                const lineStyle = getLineStyle(seriesConfig);
                const lineFit = getLineFit(seriesConfig, false);
                const lineFitType = getLineFitType(seriesConfig);
                const lineFitDegree = getLineFitDegree(seriesConfig, 2);
                return (
                  <g key={si}>
                    {lineFit && pts.length >= 2 ? (
                      <path
                        className="chart-line"
                        d={generateFitLinePath(pts, lineFitType, lineFitDegree)}
                        fill="none"
                        stroke={seriesColor(si, palette, seriesConfig)}
                        strokeWidth={lineWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={getStrokeDasharray(lineStyle)}
                      />
                    ) : (
                      <polyline
                        className="chart-line"
                        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={seriesColor(si, palette, seriesConfig)}
                        strokeWidth={lineWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={getStrokeDasharray(lineStyle)}
                      />
                    )}
                    {(() => {
                      const showPoints = getLineShowPoints(seriesConfig, true);
                      const config = showPoints
                        ? getLineMarkerConfig(
                            seriesConfig,
                            seriesColor(si, palette, seriesConfig)
                          )
                        : null;
                      const markerSize = config?.size ?? 4;
                      return seriesData.map((val, idx) => {
                        const marker =
                          showPoints && config
                            ? renderMarker(
                                xScale(val),
                                yScale(idx),
                                config.style,
                                config.size,
                                config.fillColor,
                                config.edgeColor,
                                1,
                                1,
                                `${idx}-${si}-${config.configKey}`
                              )
                            : null;
                        return (
                          <g
                            key={`marker-${idx}-${si}-${config?.configKey ?? `default-${idx}-${si}`}`}
                            data-xindex={idx}
                            data-seriesindex={si}
                            style={{ cursor: 'pointer' }}
                          >
                            {marker}
                            {(() => {
                              const showLabels = getShowDataLabels(seriesConfig, false);
                              if (!showLabels) return null;
                              const fontSize = getDataLabelFontSize(seriesConfig, 0);
                              const dataLabelFontSize = fontSize > 0 ? fontSize : labelFontSize;
                              const labelDecimals = getDataLabelDecimals(seriesConfig, 2);
                              const labelStyle = getDataLabelStyle(seriesConfig);
                              const position = (seriesConfig?.dataLabelPosition || 'auto') as
                                | 'top'
                                | 'bottom'
                                | 'auto';
                              const pointX = xScale(val);
                              const pointY = yScale(idx);
                              const { offsetX, offsetY, textAnchor } =
                                calculateHorizontalDataLabelOffset(
                                  position,
                                  pointX,
                                  markerSize,
                                  dataLabelFontSize,
                                  plotLeft,
                                  plotRight
                                );
                              return (
                                <text
                                  className="chart-axis-label"
                                  x={pointX + offsetX + (seriesConfig?.dataLabelOffsetX ?? 0)}
                                  y={pointY + offsetY + (seriesConfig?.dataLabelOffsetY ?? 0)}
                                  textAnchor={textAnchor}
                                  dominantBaseline="middle"
                                  style={{ fontSize: dataLabelFontSize, ...labelStyle }}
                                >
                                  {formatDataLabel(val, labelDecimals)}
                                </text>
                              );
                            })()}
                          </g>
                        );
                      });
                    })()}
                  </g>
                );
              })
            : effectiveSeriesNames.map((name, si) => {
                const origIdx = getOriginalSeriesIndex(name);
                const seriesConfig = seriesConfigs[origIdx];
                const pts = effectiveXLabels.map((_, idx) => ({
                  x: xScale(idx),
                  y: yScale(effectiveData[idx]?.[si] ?? 0),
                }));
                const lineWidth = getLineWidth(seriesConfig);
                const lineStyle = getLineStyle(seriesConfig);
                const lineFit = getLineFit(seriesConfig, false);
                const lineFitType = getLineFitType(seriesConfig);
                const lineFitDegree = getLineFitDegree(seriesConfig, 2);
                return (
                  <g key={si}>
                    {lineFit && pts.length >= 2 ? (
                      <path
                        className="chart-line"
                        d={generateFitLinePath(pts, lineFitType, lineFitDegree)}
                        fill="none"
                        stroke={seriesColor(origIdx, palette, seriesConfig)}
                        strokeWidth={lineWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={getStrokeDasharray(lineStyle)}
                      />
                    ) : (
                      <polyline
                        className="chart-line"
                        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={seriesColor(origIdx, palette, seriesConfig)}
                        strokeWidth={lineWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={getStrokeDasharray(lineStyle)}
                      />
                    )}
                    {(() => {
                      const showPoints = getLineShowPoints(seriesConfig, true);
                      const config = showPoints
                        ? getLineMarkerConfig(
                            seriesConfig,
                            seriesColor(origIdx, palette, seriesConfig)
                          )
                        : null;
                      const markerSize = config?.size ?? 4; // 默认标记大小，用于数据标签位置计算
                      return effectiveXLabels.map((_, idx) => {
                        const marker =
                          showPoints && config
                            ? renderMarker(
                                xScale(idx),
                                yScale(effectiveData[idx]?.[si] ?? 0),
                                config.style,
                                config.size,
                                config.fillColor,
                                config.edgeColor,
                                1,
                                1,
                                `${idx}-${si}-${config.configKey}`
                              )
                            : null;
                        return (
                          <g
                            key={`marker-${idx}-${si}-${config?.configKey ?? `default-${idx}-${si}`}`}
                            data-xindex={idx}
                            data-seriesindex={origIdx}
                            style={{ cursor: 'pointer' }}
                          >
                            {marker}
                            {(() => {
                              const showLabels = getShowDataLabels(seriesConfig, false);
                              if (!showLabels) return null;
                              const fontSize = getDataLabelFontSize(seriesConfig, 0);
                              const dataLabelFontSize = fontSize > 0 ? fontSize : labelFontSize;
                              const labelDecimals = getDataLabelDecimals(seriesConfig, 2);
                              const labelStyle = getDataLabelStyle(seriesConfig);
                              const position = (seriesConfig?.dataLabelPosition || 'auto') as
                                | 'top'
                                | 'bottom'
                                | 'auto';
                              const pointX = xScale(idx);
                              const pointY = yScale(effectiveData[idx]?.[si] ?? 0);
                              const offsetY = calculateVerticalDataLabelOffset(
                                position,
                                pointY,
                                markerSize,
                                dataLabelFontSize,
                                plotTop,
                                plotBottom
                              );
                              return (
                                <text
                                  className="chart-axis-label"
                                  x={pointX + (seriesConfig?.dataLabelOffsetX ?? 0)}
                                  y={pointY + offsetY + (seriesConfig?.dataLabelOffsetY ?? 0)}
                                  textAnchor="middle"
                                  dominantBaseline="auto"
                                  style={{ fontSize: dataLabelFontSize, ...labelStyle }}
                                >
                                  {formatDataLabel(effectiveData[idx]?.[si] ?? 0, labelDecimals)}
                                </text>
                              );
                            })()}
                          </g>
                        );
                      });
                    })()}
                  </g>
                );
              }))}

        {viewMode === 'scatter' &&
          (chartSwapXY
            ? effectiveData
                .map((seriesData, si) => {
                  // 交换XY后，si是原始系列索引，需要检查可见性
                  const seriesName = seriesNames[si];
                  if (chartSeriesVisibility[seriesName] === false) return null;
                  const seriesConfig = seriesConfigs[si];
                  return seriesData.map((val, idx) => {
                    const config = getScatterMarkerConfig(
                      seriesConfig,
                      seriesColor(si, palette, seriesConfig)
                    );
                    const marker = renderMarker(
                      xScale(val),
                      yScale(idx),
                      config.style,
                      config.size,
                      config.fillColor,
                      config.edgeColor,
                      config.edgeWidth,
                      config.opacity,
                      `${idx}-${si}-${config.configKey}`
                    );
                    return (
                      <g
                        key={`scatter-${idx}-${si}-${config.configKey}`}
                        data-xindex={si}
                        data-seriesindex={idx}
                        style={{ cursor: 'pointer' }}
                      >
                        {marker}
                        {(() => {
                          const showLabels = getShowDataLabels(seriesConfig, false);
                          if (!showLabels) return null;
                          const fontSize = getDataLabelFontSize(seriesConfig, 0);
                          const dataLabelFontSize = fontSize > 0 ? fontSize : labelFontSize;
                          const labelDecimals = getDataLabelDecimals(seriesConfig, 2);
                          const labelStyle = getDataLabelStyle(seriesConfig);
                          const position = (seriesConfig?.dataLabelPosition || 'auto') as
                            | 'top'
                            | 'bottom'
                            | 'auto';
                          const pointX = xScale(val);
                          const pointY = yScale(idx);
                          const { offsetX, offsetY, textAnchor } =
                            calculateHorizontalDataLabelOffset(
                              position,
                              pointX,
                              config.size,
                              dataLabelFontSize,
                              plotLeft,
                              plotRight
                            );
                          const displayValue = val;
                          return (
                            <text
                              className="chart-axis-label"
                              x={pointX + offsetX + (seriesConfig?.dataLabelOffsetX ?? 0)}
                              y={pointY + offsetY + (seriesConfig?.dataLabelOffsetY ?? 0)}
                              textAnchor={textAnchor}
                              dominantBaseline="middle"
                              style={{ fontSize: dataLabelFontSize, ...labelStyle }}
                            >
                              {formatDataLabel(displayValue, labelDecimals)}
                            </text>
                          );
                        })()}
                      </g>
                    );
                  });
                })
                .filter((item) => item !== null)
                .flat()
            : effectiveXLabels
                .map((_, xi) =>
                  effectiveSeriesNames.map((name, si) => {
                    const origIdx = getOriginalSeriesIndex(name);
                    const val = effectiveData[xi]?.[si] ?? 0;
                    const seriesConfig = seriesConfigs[origIdx];
                    const config = getScatterMarkerConfig(
                      seriesConfig,
                      seriesColor(origIdx, palette, seriesConfig)
                    );
                    const marker = renderMarker(
                      xScale(xi),
                      yScale(val),
                      config.style,
                      config.size,
                      config.fillColor,
                      config.edgeColor,
                      config.edgeWidth,
                      config.opacity,
                      `${xi}-${si}-${config.configKey}`
                    );
                    return (
                      <g
                        key={`scatter-${xi}-${si}-${config.configKey}`}
                        data-xindex={xi}
                        data-seriesindex={origIdx}
                        style={{ cursor: 'pointer' }}
                      >
                        {marker}
                        {(() => {
                          const showLabels = getShowDataLabels(seriesConfig, false);
                          if (!showLabels) return null;
                          const fontSize = getDataLabelFontSize(seriesConfig, 0);
                          const dataLabelFontSize = fontSize > 0 ? fontSize : labelFontSize;
                          const labelDecimals = getDataLabelDecimals(seriesConfig, 2);
                          const labelStyle = getDataLabelStyle(seriesConfig);
                          const position = (seriesConfig?.dataLabelPosition || 'auto') as
                            | 'top'
                            | 'bottom'
                            | 'auto';
                          const pointX = xScale(xi);
                          const pointY = yScale(val);
                          const offsetY = calculateVerticalDataLabelOffset(
                            position,
                            pointY,
                            config.size,
                            dataLabelFontSize,
                            plotTop,
                            plotBottom
                          );
                          return (
                            <text
                              className="chart-axis-label"
                              x={pointX + (seriesConfig?.dataLabelOffsetX ?? 0)}
                              y={pointY + offsetY + (seriesConfig?.dataLabelOffsetY ?? 0)}
                              textAnchor="middle"
                              dominantBaseline="auto"
                              style={{ fontSize: dataLabelFontSize, ...labelStyle }}
                            >
                              {formatDataLabel(val, labelDecimals)}
                            </text>
                          );
                        })()}
                      </g>
                    );
                  })
                )
                .flat())}

        {viewMode === 'pie' &&
          chartData.kind === 'multi' &&
          (() => {
            // 只计算可见系列
            const visibleSeries = chartData.seriesNames
              .map((name, si) => ({ name, si }))
              .filter(({ name }) => chartSeriesVisibility[name] !== false);

            // 如果只选中一个系列，显示该系列在不同 x 值下的分布（按 x 去重）
            if (visibleSeries.length === 1) {
              const { si } = visibleSeries[0];
              const xValueMap = new Map<
                string,
                { value: number; label: string; firstIndex: number }
              >();
              xLabels.forEach((xLabel, xi) => {
                const yVal = data[xi]?.[si] ?? 0;
                if (yVal > 0) {
                  if (xValueMap.has(xLabel)) {
                    const existing = xValueMap.get(xLabel)!;
                    existing.value += yVal;
                  } else {
                    xValueMap.set(xLabel, { value: yVal, label: xLabel, firstIndex: xi });
                  }
                }
              });
              const pieData = Array.from(xValueMap.values()).filter((item) => item.value > 0);
              const total = pieData.reduce((a, b) => a + b.value, 0) || 1;
              const cx = plotLeft + innerW / 2;
              const cy = plotTop + innerH / 2;
              const r = Math.min(innerW, innerH) / 2 - 8;
              const innerR =
                chartPieInnerRadius > 0 ? r * (Math.min(80, chartPieInnerRadius) / 100) : 0;
              const startOffset = ((chartPieStartAngle % 360) + 360) % 360;
              let acc = 0;
              const seriesConfig = chartData.seriesConfigs[si];
              const fillStyle = getPieFillStyle(seriesConfig);
              const color = seriesColor(si, palette, seriesConfig);
              return (
                <>
                  {/* 生成渐变和图案定义 */}
                  {pieData.map((_, idx) => (
                    <g key={`def-${idx}`}>
                      {fillStyle === 'gradient' && (
                        <radialGradient id={`chartPieGrad-${si}-${idx}`}>
                          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                          <stop offset="100%" stopColor={color} stopOpacity="1" />
                        </radialGradient>
                      )}
                      {renderFillPattern(fillStyle, color, `chartPieFill-${si}-${idx}`)}
                    </g>
                  ))}
                  {/* 渲染扇形切片 */}
                  {pieData.map((item, idx) => {
                    const v = item.value;
                    const sliceDeg = (v / total) * 360;
                    const startDeg = acc + startOffset;
                    const endDeg = startDeg + sliceDeg;
                    acc += sliceDeg;
                    const startRad = deg2rad(startDeg);
                    const endRad = deg2rad(endDeg);
                    const largeArc = sliceDeg > 180 ? 1 : 0;
                    const x1 = cx + r * Math.cos(startRad);
                    const y1 = cy + r * Math.sin(startRad);
                    const x2 = cx + r * Math.cos(endRad);
                    const y2 = cy + r * Math.sin(endRad);
                    const edgeStyle = getPieEdgeStyle(seriesConfig);
                    const edgeWidth = getPieEdgeWidth(seriesConfig);
                    const edgeColor = color;
                    if (innerR > 0) {
                      const x3 = cx + innerR * Math.cos(endRad);
                      const y3 = cy + innerR * Math.sin(endRad);
                      const x4 = cx + innerR * Math.cos(startRad);
                      const y4 = cy + innerR * Math.sin(startRad);
                      return (
                        <g key={idx}>
                          <path
                            d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`}
                            fill={
                              fillStyle === 'gradient'
                                ? `url(#chartPieGrad-${si}-${idx})`
                                : isPatternFill(fillStyle)
                                  ? `url(#chartPieFill-${si}-${idx})`
                                  : color
                            }
                            fillOpacity={pieSliceOpacity(si)}
                            stroke={
                              edgeStyle === 'none'
                                ? undefined
                                : edgeWidth > 0
                                  ? edgeColor
                                  : undefined
                            }
                            strokeWidth={edgeStyle === 'none' ? 0 : edgeWidth}
                            strokeDasharray={getStrokeDasharray(edgeStyle)}
                          />
                        </g>
                      );
                    }
                    return (
                      <g key={idx}>
                        <path
                          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={
                            fillStyle === 'gradient'
                              ? `url(#chartPieGrad-${si})`
                              : isPatternFill(fillStyle)
                                ? `url(#chartPieFill-${si})`
                                : color
                          }
                          fillOpacity={pieSliceOpacity(si)}
                          stroke={
                            edgeStyle === 'none' ? undefined : edgeWidth > 0 ? edgeColor : undefined
                          }
                          strokeWidth={edgeStyle === 'none' ? 0 : edgeWidth}
                          strokeDasharray={getStrokeDasharray(edgeStyle)}
                        />
                      </g>
                    );
                  })}
                  {chartPieLabelPosition !== 'none' &&
                    chartShowAxisLabels &&
                    pieData.map((item, idx) => {
                      const v = item.value;
                      const prevSum = pieData.slice(0, idx).reduce((a, b) => a + b.value, 0);
                      const midDeg = ((prevSum + v / 2) / total) * 360 + startOffset;
                      const rad = deg2rad(midDeg);
                      const labelRadius =
                        chartPieLabelPosition === 'inside' ? r * 0.5 : PIE_LABEL_RATIO * r;
                      const tx = cx + labelRadius * Math.cos(rad);
                      const ty = cy + labelRadius * Math.sin(rad);
                      return (
                        <text
                          key={idx}
                          className="chart-pie-label"
                          x={tx}
                          y={ty}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {truncate(item.label, pieLabelTruncate)}
                        </text>
                      );
                    })}
                </>
              );
            } else {
              // 多系列：每个系列一个扇形，按系列顺序排列
              const visibleSeriesSums = visibleSeries.map(({ si }) => {
                const sum = data.reduce((acc, row) => acc + (row?.[si] ?? 0), 0);
                return { si, sum };
              });
              const total = visibleSeriesSums.reduce((a, b) => a + b.sum, 0) || 1;
              const cx = plotLeft + innerW / 2;
              const cy = plotTop + innerH / 2;
              const r = Math.min(innerW, innerH) / 2 - 8;
              const innerR =
                chartPieInnerRadius > 0 ? r * (Math.min(80, chartPieInnerRadius) / 100) : 0;
              const startOffset = ((chartPieStartAngle % 360) + 360) % 360;
              let acc = 0;
              return (
                <>
                  {visibleSeriesSums.map(({ si, sum: v }) => {
                    const sliceDeg = (v / total) * 360;
                    const startDeg = acc + startOffset;
                    const endDeg = startDeg + sliceDeg;
                    acc += sliceDeg;
                    const startRad = deg2rad(startDeg);
                    const endRad = deg2rad(endDeg);
                    const largeArc = sliceDeg > 180 ? 1 : 0;
                    const x1 = cx + r * Math.cos(startRad);
                    const y1 = cy + r * Math.sin(startRad);
                    const x2 = cx + r * Math.cos(endRad);
                    const y2 = cy + r * Math.sin(endRad);
                    const seriesConfig = chartData.seriesConfigs[si];
                    const fillStyle = getPieFillStyle(seriesConfig);
                    const color = seriesColor(si, palette, seriesConfig);
                    const edgeStyle = getPieEdgeStyle(seriesConfig);
                    const edgeWidth = getPieEdgeWidth(seriesConfig);
                    const edgeColor = color;
                    if (innerR > 0) {
                      const x3 = cx + innerR * Math.cos(endRad);
                      const y3 = cy + innerR * Math.sin(endRad);
                      const x4 = cx + innerR * Math.cos(startRad);
                      const y4 = cy + innerR * Math.sin(startRad);
                      return (
                        <g key={si}>
                          <path
                            d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`}
                            fill={
                              fillStyle === 'gradient'
                                ? `url(#chartPieGrad-${si})`
                                : fillStyle === 'hatched'
                                  ? `url(#chartPieHatch-${si})`
                                  : color
                            }
                            fillOpacity={pieSliceOpacity(si)}
                            stroke={
                              edgeStyle === 'none'
                                ? undefined
                                : edgeWidth > 0
                                  ? edgeColor
                                  : undefined
                            }
                            strokeWidth={edgeStyle === 'none' ? 0 : edgeWidth}
                            strokeDasharray={getStrokeDasharray(edgeStyle)}
                          />
                        </g>
                      );
                    }
                    return (
                      <g key={si}>
                        <path
                          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={
                            fillStyle === 'gradient'
                              ? `url(#chartPieGrad-${si})`
                              : isPatternFill(fillStyle)
                                ? `url(#chartPieFill-${si})`
                                : color
                          }
                          fillOpacity={pieSliceOpacity(si)}
                          stroke={
                            edgeStyle === 'none' ? undefined : edgeWidth > 0 ? edgeColor : undefined
                          }
                          strokeWidth={edgeStyle === 'none' ? 0 : edgeWidth}
                          strokeDasharray={getStrokeDasharray(edgeStyle)}
                        />
                      </g>
                    );
                  })}
                  {chartPieLabelPosition !== 'none' &&
                    chartShowAxisLabels &&
                    visibleSeriesSums.map(({ si, sum: v }, idx) => {
                      const prevSum = visibleSeriesSums
                        .slice(0, idx)
                        .reduce((a, b) => a + b.sum, 0);
                      const midDeg = ((prevSum + v / 2) / total) * 360 + startOffset;
                      const rad = deg2rad(midDeg);
                      const labelRadius =
                        chartPieLabelPosition === 'inside' ? r * 0.5 : PIE_LABEL_RATIO * r;
                      const tx = cx + labelRadius * Math.cos(rad);
                      const ty = cy + labelRadius * Math.sin(rad);
                      return (
                        <text
                          key={si}
                          className="chart-pie-label"
                          x={tx}
                          y={ty}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {truncate(chartData.seriesNames[si], pieLabelTruncate)}
                        </text>
                      );
                    })}
                </>
              );
            }
          })()}

        {chartShowAxisLine &&
          chartAxisBoxStyle !== 'none' &&
          (() => {
            const strokeDasharray =
              chartAxisStrokeStyle === 'solid'
                ? undefined
                : chartAxisStrokeStyle === 'dashed'
                  ? '5,5'
                  : chartAxisStrokeStyle === 'dotted'
                    ? '2,2'
                    : chartAxisStrokeStyle === 'dashdot'
                      ? '5,2,2,2'
                      : undefined;

            if (chartAxisBoxStyle === 'full') {
              // 全包：绘制完整的矩形边框
              return (
                <rect
                  x={plotLeft}
                  y={plotTop}
                  width={innerW}
                  height={innerH}
                  fill="none"
                  stroke={chartAxisColor || 'var(--text)'}
                  strokeWidth={chartAxisStrokeWidth}
                  strokeDasharray={strokeDasharray}
                />
              );
            } else {
              // 半包：只绘制底部和左侧轴线
              return (
                <>
                  <line
                    x1={plotLeft}
                    y1={plotTop}
                    x2={plotLeft}
                    y2={plotBottom}
                    stroke={chartAxisColor || 'var(--text)'}
                    strokeWidth={chartAxisStrokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                  <line
                    x1={plotLeft}
                    y1={plotBottom}
                    x2={plotRight}
                    y2={plotBottom}
                    stroke={chartAxisColor || 'var(--text)'}
                    strokeWidth={chartAxisStrokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                </>
              );
            }
          })()}
        {effectiveTickLength > 0 &&
          (chartSwapXY
            ? // 交换后：X轴刻度基于data值，Y轴刻度基于xLabels索引
              (() => {
                // X轴刻度：基于data的值范围
                const xTicks = gridTicks.map((tick, i) => {
                  const tickX = xScale(minY + tick * rangeY);
                  return (
                    <g key={`x-${i}`}>
                      <line
                        x1={tickX}
                        y1={plotBottom}
                        x2={tickX}
                        y2={plotBottom + (isInside ? -effectiveTickLength : effectiveTickLength)}
                        stroke={chartTickColor || 'var(--text)'}
                        strokeWidth={chartAxisStrokeWidth}
                      />
                      {isFull && (
                        <line
                          x1={tickX}
                          y1={plotTop}
                          x2={tickX}
                          y2={plotTop + (isInside ? effectiveTickLength : -effectiveTickLength)}
                          stroke={chartTickColor || 'var(--text)'}
                          strokeWidth={chartAxisStrokeWidth}
                        />
                      )}
                    </g>
                  );
                });
                // Y轴刻度：基于xLabels的索引，每个数据点一个刻度
                const yTicks = effectiveSeriesNames.map((_, i) => {
                  const tickY = yScale(i);
                  return (
                    <g key={`y-${i}`}>
                      <line
                        x1={plotLeft}
                        y1={tickY}
                        x2={plotLeft + (isInside ? effectiveTickLength : -effectiveTickLength)}
                        y2={tickY}
                        stroke={chartTickColor || 'var(--text)'}
                        strokeWidth={chartAxisStrokeWidth}
                      />
                      {isFull && (
                        <line
                          x1={plotRight}
                          y1={tickY}
                          x2={plotRight + (isInside ? -effectiveTickLength : effectiveTickLength)}
                          y2={tickY}
                          stroke={chartTickColor || 'var(--text)'}
                          strokeWidth={chartAxisStrokeWidth}
                        />
                      )}
                    </g>
                  );
                });
                return [...xTicks, ...yTicks];
              })()
            : // 未交换：X轴刻度基于索引（每个数据点），Y轴刻度基于data值
              (() => {
                // X轴刻度：基于索引，每个数据点一个刻度
                const xTicks = effectiveXLabels.map((_, i) => {
                  const tickX = xScale(i);
                  return (
                    <g key={`x-${i}`}>
                      <line
                        x1={tickX}
                        y1={plotBottom}
                        x2={tickX}
                        y2={plotBottom + (isInside ? -effectiveTickLength : effectiveTickLength)}
                        stroke={chartTickColor || 'var(--text)'}
                        strokeWidth={chartAxisStrokeWidth}
                      />
                      {isFull && (
                        <line
                          x1={tickX}
                          y1={plotTop}
                          x2={tickX}
                          y2={plotTop + (isInside ? effectiveTickLength : -effectiveTickLength)}
                          stroke={chartTickColor || 'var(--text)'}
                          strokeWidth={chartAxisStrokeWidth}
                        />
                      )}
                    </g>
                  );
                });
                // Y轴刻度：基于数值范围
                const yTicks = gridTicks.map((tick, i) => {
                  const tickY = plotTop + innerH * (1 - tick);
                  return (
                    <g key={`y-${i}`}>
                      <line
                        x1={plotLeft}
                        y1={tickY}
                        x2={plotLeft + (isInside ? effectiveTickLength : -effectiveTickLength)}
                        y2={tickY}
                        stroke={chartTickColor || 'var(--text)'}
                        strokeWidth={chartAxisStrokeWidth}
                      />
                      {isFull && (
                        <line
                          x1={plotRight}
                          y1={tickY}
                          x2={plotRight + (isInside ? -effectiveTickLength : effectiveTickLength)}
                          y2={tickY}
                          stroke={chartTickColor || 'var(--text)'}
                          strokeWidth={chartAxisStrokeWidth}
                        />
                      )}
                    </g>
                  );
                });
                return [...xTicks, ...yTicks];
              })())}
        {effectiveYTitle && (
          <text
            x={plotLeft - axisLabelW - 6}
            y={plotTop + innerH / 2}
            textAnchor="middle"
            style={{ fontSize: axisTitleFontSize }}
            className="chart-axis-title"
            transform={`rotate(-90, ${plotLeft - axisLabelW - 6}, ${plotTop + innerH / 2})`}
          >
            {truncate(effectiveYTitle, 20)}
          </text>
        )}
        {chartShowAxisLabels &&
          (chartSwapXY
            ? // 交换后：Y轴显示xLabels标签，X轴显示data数值刻度
              (() => {
                // Y轴标签：显示所有xLabels（现在是effectiveSeriesNames）
                const yLabels = effectiveSeriesNames.map((name, i) => (
                  <text
                    key={`y-${i}`}
                    className="chart-axis-label"
                    x={plotLeft - 6}
                    y={yScale(i)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    style={axisLabelStyle}
                  >
                    {truncate(name, labelTruncate)}
                  </text>
                ));
                // X轴刻度：基于data的值范围
                const xTicks = gridTicks.map((tick, i) => (
                  <text
                    key={`x-${i}`}
                    className="chart-axis-label"
                    x={xScale(minY + tick * rangeY)}
                    y={labelY}
                    textAnchor="middle"
                    style={axisLabelStyle}
                  >
                    {formatAxisTick(minY + tick * rangeY)}
                  </text>
                ));
                return [...yLabels, ...xTicks];
              })()
            : // 未交换：Y轴显示数值刻度，X轴显示标签
              (() => {
                // Y轴刻度：基于数值范围
                const yTicks = gridTicks.map((tick, i) => (
                  <text
                    key={`y-${i}`}
                    className="chart-axis-label"
                    x={plotLeft - 6}
                    y={plotTop + innerH * (1 - tick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    style={axisLabelStyle}
                  >
                    {formatAxisTick(minY + tick * rangeY)}
                  </text>
                ));
                // X轴标签：显示所有xLabels
                const xLabels = effectiveXLabels.map((label, i) => (
                  <text
                    key={`x-${i}`}
                    className="chart-axis-label"
                    x={xScale(i)}
                    y={labelY}
                    textAnchor="middle"
                    style={axisLabelStyle}
                  >
                    {truncate(label, labelTruncate)}
                  </text>
                ));
                return [...yTicks, ...xLabels];
              })())}
        {effectiveXTitle && (
          <text
            x={plotLeft + innerW / 2}
            y={plotBottom + axisLabelH + axisTitleFontSize - 2}
            textAnchor="middle"
            style={{ fontSize: axisTitleFontSize }}
            className="chart-axis-title"
          >
            {truncate(effectiveXTitle, 30)}
          </text>
        )}
      </g>
    </svg>
  );
});
