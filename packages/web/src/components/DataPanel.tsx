import { forwardRef, useMemo, useState, useRef, useEffect } from 'react';
import { useGraphStore, useSettingsStore } from '../stores';
import type { ChartYColumnConfig } from '../stores/settings';
import { FILL_STYLES, EDGE_STYLES, LINE_STYLES, MARKER_STYLES } from '../stores/settings';
import { getLocale, type Lang } from '../locale';
import { getOperatorRows, getTableColumns } from '../utils/operatorRows';
import { NumberInput } from './ViewMenu';

/** 根据语言获取样式选项的标签 */
function getStyleLabels(lang: Lang) {
  const t = getLocale(lang);
  return {
    barFillStyles: FILL_STYLES.map((s) => ({
      value: s.value,
      label:
        s.value === 'solid'
          ? t.styleSolid
          : s.value === 'gradient'
            ? t.styleGradient
            : s.value === 'hatched'
              ? t.styleHatched
              : s.value === 'hatched-h'
                ? t.styleHatchedH
                : s.value === 'hatched-v'
                  ? t.styleHatchedV
                  : s.value === 'hatched-cross'
                    ? t.styleHatchedCross
                    : s.value === 'stripes'
                      ? t.styleStripes
                      : s.value === 'pattern'
                        ? t.stylePattern
                        : (s as (typeof FILL_STYLES)[number]).label,
    })),
    edgeStyles: EDGE_STYLES.map((s) => ({
      value: s.value,
      label:
        s.value === 'solid'
          ? t.styleSolid
          : s.value === 'dashed'
            ? t.styleDashed
            : s.value === 'dotted'
              ? t.styleDotted
              : s.value === 'none'
                ? t.styleNoneBorder
                : (s as (typeof EDGE_STYLES)[number]).label,
    })),
    lineStyles: LINE_STYLES.map((s) => ({
      value: s.value,
      label:
        s.value === 'solid'
          ? t.styleSolid
          : s.value === 'dashed'
            ? t.styleDashed
            : s.value === 'dotted'
              ? t.styleDotted
              : s.value === 'dashdot'
                ? t.styleDashdot
                : s.value === 'double-dash'
                  ? t.styleDoubleDash
                  : (s as (typeof LINE_STYLES)[number]).label,
    })),
    markerStyles: MARKER_STYLES.map((s) => ({
      value: s.value,
      label:
        s.value === 'none'
          ? t.styleNoneMarker
          : s.value === 'circle'
            ? t.styleCircle
            : s.value === 'square'
              ? t.styleSquare
              : s.value === 'diamond'
                ? t.styleDiamond
                : s.value === 'star'
                  ? t.styleStar
                  : s.value === 'cross'
                    ? t.styleCross
                    : s.value === 'plus'
                      ? t.stylePlus
                      : s.value === 'x'
                        ? t.styleX
                        : s.value === 'triangle'
                          ? t.styleTriangle
                          : (s as (typeof MARKER_STYLES)[number]).label,
    })),
  };
}

const DATA_PANEL_DEFAULT_WIDTH = 440;
const DATA_PANEL_DEFAULT_HEIGHT = 320;
const DATA_PANEL_MIN_WIDTH = 220;
const DATA_PANEL_MAX_WIDTH = () =>
  Math.min(Math.round(typeof window !== 'undefined' ? window.innerWidth * 0.85 : 800), 960);
const DATA_PANEL_MIN_HEIGHT = 120;
const DATA_PANEL_MAX_HEIGHT = () =>
  Math.min(Math.round(typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400), 520);

const VIEW_MODES = ['graph', 'bar', 'pie', 'line', 'scatter'] as const;
type ViewModeId = (typeof VIEW_MODES)[number];

/** 主键列，表格中必选、不可取消勾选 */
const PRIMARY_KEY_COLUMNS = ['index', 'id'];

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return v.map(String).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** 导出时：空值导出为空字符串（表格显示用 formatCell 显示 —） */
function formatCellForExport(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(String).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** 导出选中列为指定格式并触发下载 */
function downloadTable(
  cols: string[],
  rows: Record<string, unknown>[],
  format: 'csv' | 'json' | 'tsv',
  formatCellFn: (v: unknown) => string
): void {
  const escapeCsv = (s: string) =>
    s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  const filename = `data.${format}`;
  let content: string;
  let mime: string;
  let bom = '';

  switch (format) {
    case 'csv': {
      const header = cols.join(',');
      const body = rows
        .map((row) => cols.map((c) => escapeCsv(formatCellFn(row[c]))).join(','))
        .join('\n');
      content = `${header}\n${body}`;
      bom = '\uFEFF';
      mime = 'text/csv;charset=utf-8';
      break;
    }
    case 'tsv': {
      const header = cols.join('\t');
      const body = rows
        .map((row) =>
          cols.map((c) => formatCellFn(row[c]).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')
        )
        .join('\n');
      content = `${header}\n${body}`;
      bom = '\uFEFF';
      mime = 'text/tab-separated-values;charset=utf-8';
      break;
    }
    case 'json': {
      const arr = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        cols.forEach((c) => {
          obj[c] = row[c];
        });
        return obj;
      });
      content = JSON.stringify(arr, null, 2);
      mime = 'application/json;charset=utf-8';
      break;
    }
  }

  const blob = new Blob([bom + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 数据映射行：角色标签 + 列选择，可选移除按钮（仅分组行） */
function MappingRow({
  roleLabel,
  value,
  columns,
  onChange,
  onRemove,
  removeLabel,
  emptyPlaceholder = '—',
}: {
  roleLabel: string;
  value: string;
  columns: string[];
  onChange: (v: string) => void;
  onRemove?: () => void;
  removeLabel?: string;
  emptyPlaceholder?: string;
}) {
  const options = columns.filter((c) => c !== 'index');
  return (
    <div className="panel-row chart-mapping-row">
      <span className="panel-row-label">{roleLabel}</span>
      <span className="panel-row-value chart-mapping-value">
        <select
          className="view-input chart-config-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={roleLabel}
        >
          <option value="">{emptyPlaceholder}</option>
          {options.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {onRemove && removeLabel && (
          <button
            type="button"
            className="chart-mapping-remove"
            onClick={onRemove}
            title={removeLabel}
            aria-label={removeLabel}
          >
            ×
          </button>
        )}
      </span>
    </div>
  );
}

/** Y列配置行：列选择 + 颜色选择 + 丰富的样式配置 */
function YColumnConfigRow({
  config,
  columns,
  onChange,
  onRemove,
  removeLabel,
  isSingle,
  index,
  chartType,
  seriesName,
  isVisible,
  onToggleVisibility,
  t,
}: {
  config: ChartYColumnConfig;
  columns: string[];
  onChange: (config: ChartYColumnConfig) => void;
  onRemove?: () => void;
  removeLabel?: string;
  isSingle: boolean;
  index: number;
  chartType: 'bar' | 'pie' | 'line' | 'scatter';
  seriesName?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  t: ReturnType<typeof getLocale>;
}) {
  const options = columns.filter((c) => c !== 'index');
  const [expanded, setExpanded] = useState(true);
  const s = useSettingsStore();
  const styleLabels = getStyleLabels(s.lang);

  return (
    <>
      <div className="panel-row chart-mapping-row">
        <span className="panel-row-label">
          {isSingle
            ? t.dataPanelYAxis
            : t.dataPanelYAxisWithIndex.replace('{index}', String(index + 1))}
        </span>
        <div className="panel-row-value chart-mapping-value">
          <select
            className="view-input chart-config-select"
            value={config.key}
            onChange={(e) => onChange({ ...config, key: e.target.value })}
            aria-label="列选择"
          >
            <option value="">—</option>
            {options.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="color"
            className="view-input"
            style={{ width: '32px', height: '22px', padding: '2px', flexShrink: 0 }}
            value={config.color || '#1d4ed8'}
            onChange={(e) => onChange({ ...config, color: e.target.value })}
            aria-label={t.dataPanelColor}
            title={t.dataPanelColor}
          />
          {/* 多系列时显示可见性开关 */}
          {!isSingle &&
            seriesName &&
            onToggleVisibility !== undefined &&
            isVisible !== undefined && (
              <button
                type="button"
                className="chart-visibility-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility();
                }}
                title={isVisible ? t.dataPanelHideSeries : t.dataPanelShowSeries}
                aria-label={isVisible ? t.dataPanelHideSeries : t.dataPanelShowSeries}
                style={{
                  width: '22px',
                  height: '22px',
                  padding: '2px',
                  flexShrink: 0,
                  border: '1px solid var(--border)',
                  borderRadius: '3px',
                  background: isVisible ? 'var(--accent)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isVisible ? 'var(--bg-target)' : 'var(--text2)',
                  fontSize: '12px',
                }}
              >
                {isVisible ? '✓' : ''}
              </button>
            )}
          <button
            type="button"
            className="chart-style-expand-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? t.dataPanelCollapseStyle : t.dataPanelExpandStyle}
            aria-label={expanded ? t.dataPanelCollapseStyle : t.dataPanelExpandStyle}
          >
            {expanded ? '▼' : '▶'}
          </button>
          {onRemove && removeLabel && (
            <button
              type="button"
              className="chart-mapping-remove"
              onClick={onRemove}
              title={removeLabel}
              aria-label={removeLabel}
            >
              ×
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="chart-panel-subsection" style={{ marginTop: '4px', marginBottom: '4px' }}>
          {chartType === 'bar' && (
            <>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelBarBase}</span>
                <div className="panel-option-value">
                  <select
                    className="view-input"
                    value={config.barBaseKey ?? ''}
                    onChange={(e) =>
                      onChange({ ...config, barBaseKey: e.target.value || undefined })
                    }
                  >
                    <option value="">—</option>
                    {options.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelFillStyle}</span>
                <div className="panel-option-value">
                  <select
                    className="view-input"
                    value={config.barFillStyle || 'solid'}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        barFillStyle: e.target.value as ChartYColumnConfig['barFillStyle'],
                      })
                    }
                  >
                    {styleLabels.barFillStyles.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelEdgeStyle}</span>
                <div className="panel-option-value">
                  <select
                    className="view-input"
                    value={config.barEdgeStyle || 'solid'}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        barEdgeStyle: e.target.value as ChartYColumnConfig['barEdgeStyle'],
                      })
                    }
                  >
                    {styleLabels.edgeStyles.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelEdgeWidth}</span>
                <div className="panel-option-value">
                  <NumberInput
                    value={config.barEdgeWidth ?? 1}
                    min={0}
                    max={10}
                    step={0.5}
                    defaultVal={1}
                    onChange={(n) => onChange({ ...config, barEdgeWidth: n })}
                  />
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelOpacity}</span>
                <div className="panel-option-value">
                  <NumberInput
                    value={config.barOpacity ?? 1}
                    min={0}
                    max={1}
                    step={0.1}
                    defaultVal={1}
                    onChange={(n) => onChange({ ...config, barOpacity: n })}
                  />
                </div>
              </div>
            </>
          )}
          {chartType === 'line' && (
            <>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelLineStyle}</span>
                <div className="panel-option-value">
                  <select
                    className="view-input"
                    value={config.lineStyle || 'solid'}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        lineStyle: e.target.value as ChartYColumnConfig['lineStyle'],
                      })
                    }
                  >
                    {styleLabels.lineStyles.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelLineWidth}</span>
                <div className="panel-option-value">
                  <NumberInput
                    value={config.lineWidth ?? 2}
                    min={0.5}
                    max={10}
                    step={0.5}
                    defaultVal={2}
                    onChange={(n) => onChange({ ...config, lineWidth: n })}
                  />
                </div>
              </div>
              <label
                className="panel-check panel-control-row"
                title={t.dataPanelFit}
                aria-label={t.dataPanelFit}
              >
                <span className="panel-check-label">{t.dataPanelFit}</span>
                <span className="panel-check-box-wrap">
                  <input
                    type="checkbox"
                    className="panel-check-input"
                    checked={config.lineFit ?? false}
                    onChange={(e) => onChange({ ...config, lineFit: e.target.checked })}
                  />
                  <span className="panel-check-box" aria-hidden />
                </span>
              </label>
              {config.lineFit && (
                <>
                  <div className="panel-control-row">
                    <span className="panel-option-label">{t.dataPanelFitType}</span>
                    <div className="panel-option-value">
                      <select
                        className="view-input"
                        value={config.lineFitType || 'linear'}
                        onChange={(e) =>
                          onChange({
                            ...config,
                            lineFitType: e.target.value as
                              | 'linear'
                              | 'polynomial'
                              | 'exponential'
                              | 'logarithmic'
                              | 'power'
                              | 'movingAverage',
                          })
                        }
                      >
                        <option value="linear">{t.dataPanelFitTypeLinear}</option>
                        <option value="polynomial">{t.dataPanelFitTypePolynomial}</option>
                        <option value="exponential">{t.dataPanelFitTypeExponential}</option>
                        <option value="logarithmic">{t.dataPanelFitTypeLogarithmic}</option>
                        <option value="power">{t.dataPanelFitTypePower}</option>
                        <option value="movingAverage">{t.dataPanelFitTypeMovingAverage}</option>
                      </select>
                    </div>
                  </div>
                  {config.lineFitType === 'polynomial' && (
                    <div className="panel-control-row">
                      <span className="panel-option-label">{t.dataPanelPolynomialDegree}</span>
                      <div className="panel-option-value">
                        <NumberInput
                          value={config.lineFitDegree ?? 2}
                          min={2}
                          max={5}
                          step={1}
                          defaultVal={2}
                          onChange={(n) => onChange({ ...config, lineFitDegree: n })}
                        />
                      </div>
                    </div>
                  )}
                  {config.lineFitType === 'movingAverage' && (
                    <div className="panel-control-row">
                      <span className="panel-option-label">{t.dataPanelWindowSize}</span>
                      <div className="panel-option-value">
                        <NumberInput
                          value={config.lineFitDegree ?? 3}
                          min={2}
                          max={20}
                          step={1}
                          defaultVal={3}
                          onChange={(n) => onChange({ ...config, lineFitDegree: n })}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              <label
                className="panel-check panel-control-row"
                title={t.dataPanelShowMarkers}
                aria-label={t.dataPanelShowMarkers}
              >
                <span className="panel-check-label">{t.dataPanelShowMarkers}</span>
                <span className="panel-check-box-wrap">
                  <input
                    type="checkbox"
                    className="panel-check-input"
                    checked={config.lineShowPoints ?? true}
                    onChange={(e) => onChange({ ...config, lineShowPoints: e.target.checked })}
                  />
                  <span className="panel-check-box" aria-hidden />
                </span>
              </label>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelMarkerStyle}</span>
                <div className="panel-option-value">
                  <select
                    className="view-input"
                    value={config.markerStyle || 'none'}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        markerStyle: e.target.value as ChartYColumnConfig['markerStyle'],
                      })
                    }
                  >
                    {styleLabels.markerStyles.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelMarkerSize}</span>
                <div className="panel-option-value">
                  <NumberInput
                    value={config.markerSize ?? 6}
                    min={2}
                    max={20}
                    step={1}
                    defaultVal={6}
                    onChange={(n) => onChange({ ...config, markerSize: n })}
                  />
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelMarkerFill}</span>
                <div className="panel-option-value">
                  <input
                    type="color"
                    className="view-input"
                    style={{ width: '100%', height: '22px', padding: '2px' }}
                    value={config.markerFillColor || config.color || '#1d4ed8'}
                    onChange={(e) => onChange({ ...config, markerFillColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelMarkerEdge}</span>
                <div className="panel-option-value">
                  <input
                    type="color"
                    className="view-input"
                    style={{ width: '100%', height: '22px', padding: '2px' }}
                    value={config.markerEdgeColor || '#ffffff'}
                    onChange={(e) => onChange({ ...config, markerEdgeColor: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
          {chartType === 'scatter' && (
            <>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelMarkerStyle}</span>
                <div className="panel-option-value">
                  <select
                    className="view-input"
                    value={config.scatterMarkerStyle || 'circle'}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        scatterMarkerStyle: e.target
                          .value as ChartYColumnConfig['scatterMarkerStyle'],
                      })
                    }
                  >
                    {styleLabels.markerStyles
                      .filter((s) => s.value !== 'none')
                      .map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelMarkerSize}</span>
                <div className="panel-option-value">
                  <NumberInput
                    value={config.scatterMarkerSize ?? 5}
                    min={2}
                    max={30}
                    step={1}
                    defaultVal={5}
                    onChange={(n) => onChange({ ...config, scatterMarkerSize: n })}
                  />
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelFillColor}</span>
                <div className="panel-option-value">
                  <input
                    type="color"
                    className="view-input"
                    style={{ width: '100%', height: '22px', padding: '2px' }}
                    value={config.scatterMarkerFillColor || config.color || '#1d4ed8'}
                    onChange={(e) =>
                      onChange({ ...config, scatterMarkerFillColor: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelEdgeColor}</span>
                <div className="panel-option-value">
                  <input
                    type="color"
                    className="view-input"
                    style={{ width: '100%', height: '22px', padding: '2px' }}
                    value={config.scatterMarkerEdgeColor || config.color || '#1d4ed8'}
                    onChange={(e) =>
                      onChange({ ...config, scatterMarkerEdgeColor: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelEdgeWidth}</span>
                <div className="panel-option-value">
                  <NumberInput
                    value={config.scatterMarkerEdgeWidth ?? 1}
                    min={0}
                    max={5}
                    step={0.5}
                    defaultVal={1}
                    onChange={(n) => onChange({ ...config, scatterMarkerEdgeWidth: n })}
                  />
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelOpacity}</span>
                <div className="panel-option-value">
                  <NumberInput
                    value={config.scatterMarkerOpacity ?? 1}
                    min={0}
                    max={1}
                    step={0.1}
                    defaultVal={1}
                    onChange={(n) => onChange({ ...config, scatterMarkerOpacity: n })}
                  />
                </div>
              </div>
            </>
          )}
          {chartType === 'pie' && (
            <>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelFillStyle}</span>
                <div className="panel-option-value">
                  <select
                    className="view-input"
                    value={config.pieFillStyle || 'solid'}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        pieFillStyle: e.target.value as ChartYColumnConfig['pieFillStyle'],
                      })
                    }
                  >
                    {styleLabels.barFillStyles.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelEdgeStyle}</span>
                <div className="panel-option-value">
                  <select
                    className="view-input"
                    value={config.pieEdgeStyle || 'solid'}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        pieEdgeStyle: e.target.value as ChartYColumnConfig['pieEdgeStyle'],
                      })
                    }
                  >
                    {styleLabels.edgeStyles.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="panel-control-row">
                <span className="panel-option-label">{t.dataPanelEdgeWidth}</span>
                <div className="panel-option-value">
                  <NumberInput
                    value={config.pieEdgeWidth ?? 1}
                    min={0}
                    max={10}
                    step={0.5}
                    defaultVal={1}
                    onChange={(n) => onChange({ ...config, pieEdgeWidth: n })}
                  />
                </div>
              </div>
            </>
          )}
          {/* 数据标签配置（所有图表类型通用） */}
          <div
            style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}
          >
            <label
              className="panel-check panel-control-row"
              title={t.dataPanelShowDataLabels}
              aria-label={t.dataPanelShowDataLabels}
            >
              <span className="panel-check-label">{t.dataPanelShowDataLabels}</span>
              <span className="panel-check-box-wrap">
                <input
                  type="checkbox"
                  className="panel-check-input"
                  checked={config.showDataLabels ?? false}
                  onChange={(e) => onChange({ ...config, showDataLabels: e.target.checked })}
                />
                <span className="panel-check-box" aria-hidden />
              </span>
            </label>
            {config.showDataLabels && (
              <>
                <div className="panel-control-row">
                  <span className="panel-option-label">{t.dataPanelDataLabelFontSize}</span>
                  <div className="panel-option-value">
                    <NumberInput
                      value={config.dataLabelFontSize ?? 0}
                      min={0}
                      max={20}
                      step={1}
                      defaultVal={0}
                      onChange={(n) => onChange({ ...config, dataLabelFontSize: n })}
                    />
                  </div>
                </div>
                <div className="panel-control-row">
                  <span className="panel-option-label">{t.dataPanelDataLabelDecimals}</span>
                  <div className="panel-option-value">
                    <NumberInput
                      value={config.dataLabelDecimals ?? 2}
                      min={0}
                      max={6}
                      step={1}
                      defaultVal={2}
                      onChange={(n) => onChange({ ...config, dataLabelDecimals: n })}
                    />
                  </div>
                </div>
                <div className="panel-control-row">
                  <span className="panel-option-label">{t.dataPanelDataLabelPosition}</span>
                  <div className="panel-option-value">
                    <select
                      className="view-input"
                      value={config.dataLabelPosition || 'auto'}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          dataLabelPosition: e.target.value as 'top' | 'bottom' | 'auto',
                        })
                      }
                    >
                      <option value="top">{t.dataPanelDataLabelPositionTop}</option>
                      <option value="bottom">{t.dataPanelDataLabelPositionBottom}</option>
                      <option value="auto">{t.dataPanelDataLabelPositionAuto}</option>
                    </select>
                  </div>
                </div>
                <div className="panel-control-row">
                  <span className="panel-option-label">{t.dataPanelDataLabelOffsetX}</span>
                  <div className="panel-option-value">
                    <NumberInput
                      value={config.dataLabelOffsetX ?? 0}
                      min={-50}
                      max={50}
                      step={1}
                      defaultVal={0}
                      onChange={(n) => onChange({ ...config, dataLabelOffsetX: n })}
                    />
                  </div>
                </div>
                <div className="panel-control-row">
                  <span className="panel-option-label">{t.dataPanelDataLabelOffsetY}</span>
                  <div className="panel-option-value">
                    <NumberInput
                      value={config.dataLabelOffsetY ?? 0}
                      min={-50}
                      max={50}
                      step={1}
                      defaultVal={0}
                      onChange={(n) => onChange({ ...config, dataLabelOffsetY: n })}
                    />
                  </div>
                </div>
                <label
                  className="panel-check panel-control-row"
                  title={t.dataPanelDataLabelBold}
                  aria-label={t.dataPanelDataLabelBold}
                >
                  <span className="panel-check-label">{t.dataPanelDataLabelBold}</span>
                  <span className="panel-check-box-wrap">
                    <input
                      type="checkbox"
                      className="panel-check-input"
                      checked={config.dataLabelBold ?? false}
                      onChange={(e) => onChange({ ...config, dataLabelBold: e.target.checked })}
                    />
                    <span className="panel-check-box" aria-hidden />
                  </span>
                </label>
                <label
                  className="panel-check panel-control-row"
                  title={t.dataPanelDataLabelItalic}
                  aria-label={t.dataPanelDataLabelItalic}
                >
                  <span className="panel-check-label">{t.dataPanelDataLabelItalic}</span>
                  <span className="panel-check-box-wrap">
                    <input
                      type="checkbox"
                      className="panel-check-input"
                      checked={config.dataLabelItalic ?? false}
                      onChange={(e) => onChange({ ...config, dataLabelItalic: e.target.checked })}
                    />
                    <span className="panel-check-box" aria-hidden />
                  </span>
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** 数据映射：固定一个 X 列 + 多个 Y 列（可添加/移除，支持颜色和样式配置） */
function MappingEditor({
  chartXKey,
  chartYKeys,
  columns,
  set,
  t,
  chartType,
  chartSeriesVisibility,
  toggleSeriesVisibility,
}: {
  chartXKey: string;
  chartYKeys: ChartYColumnConfig[];
  columns: string[];
  set: (v: { chartXKey?: string; chartYKeys?: ChartYColumnConfig[] }) => void;
  t: ReturnType<typeof getLocale>;
  chartType: 'bar' | 'pie' | 'line' | 'scatter';
  chartSeriesVisibility: Record<string, boolean>;
  toggleSeriesVisibility: (seriesName: string) => void;
}) {
  const ySlots = chartYKeys.length > 0 ? chartYKeys : [{ key: '' }];
  const isSingleY = ySlots.length === 1;
  const addY = () => set({ chartYKeys: [...ySlots, { key: '' }] });
  const setYAt = (i: number, config: ChartYColumnConfig) => {
    set({ chartYKeys: ySlots.map((y, j) => (j === i ? config : y)) });
  };
  const removeYAt = (i: number) => set({ chartYKeys: ySlots.filter((_, j) => j !== i) });
  return (
    <div className="chart-mapping-editor">
      <MappingRow
        roleLabel={t.chartXAxis}
        value={chartXKey}
        columns={columns}
        onChange={(v) => set({ chartXKey: v })}
      />
      <div className="chart-mapping-y-block">
        <span className="chart-mapping-y-block-label">{t.chartYColumnsLabel}</span>
        <div className="chart-mapping-y-rows">
          {ySlots.map((config, i) => {
            const seriesName = config.key;
            const isVisible = seriesName ? chartSeriesVisibility[seriesName] !== false : true;
            return (
              <YColumnConfigRow
                key={i}
                config={config}
                columns={columns}
                onChange={(newConfig) => setYAt(i, newConfig)}
                onRemove={!isSingleY ? () => removeYAt(i) : undefined}
                t={t}
                removeLabel={t.chartRemove}
                isSingle={isSingleY}
                index={i}
                chartType={chartType}
                seriesName={seriesName}
                isVisible={isVisible}
                onToggleVisibility={
                  seriesName ? () => toggleSeriesVisibility(seriesName) : undefined
                }
              />
            );
          })}
          <button
            type="button"
            className="chart-add-mapping-btn"
            onClick={addY}
            aria-label={t.chartAddYColumn}
          >
            <span className="chart-add-mapping-icon">+</span>
            {t.chartAddYColumn}
          </button>
        </div>
      </div>
    </div>
  );
}

type DataPanelResizeEdge = 'top' | 'left' | 'right' | null;

export const DataPanel = forwardRef<HTMLDivElement, object>(function DataPanel(_, ref) {
  const { graph } = useGraphStore();
  const s = useSettingsStore();
  const {
    dataPanelOpen,
    viewMode,
    set,
    chartXKey,
    chartYKeys = [],
    dataPanelHiddenColumns,
    dataPanelWidth,
    dataPanelHeight,
    chartSeriesVisibility = {},
  } = s;
  const t = getLocale(s.lang);

  // 切换系列可见性
  const toggleSeriesVisibility = (seriesName: string) => {
    const currentVisibility = chartSeriesVisibility[seriesName] !== false;
    set({
      chartSeriesVisibility: {
        ...chartSeriesVisibility,
        [seriesName]: !currentVisibility,
      },
    });
  };
  const [dataTab, setDataTab] = useState<'view' | 'table'>('view');
  const [sortKey, setSortKey] = useState<string>('index');
  const [sortAsc, setSortAsc] = useState(true);
  const [resizeEdge, setResizeEdge] = useState<DataPanelResizeEdge>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const effectiveWidth = Math.max(
    DATA_PANEL_MIN_WIDTH,
    Math.min(DATA_PANEL_MAX_WIDTH(), dataPanelWidth || DATA_PANEL_DEFAULT_WIDTH)
  );
  const effectiveHeight = Math.max(
    DATA_PANEL_MIN_HEIGHT,
    Math.min(DATA_PANEL_MAX_HEIGHT(), dataPanelHeight || DATA_PANEL_DEFAULT_HEIGHT)
  );

  useEffect(() => {
    if (!resizeEdge) return;
    const centerX = () => window.innerWidth / 2;
    const onMove = (e: MouseEvent) => {
      if (resizeEdge === 'top') {
        const inner = innerRef.current;
        if (!inner) return;
        const bottom = inner.getBoundingClientRect().bottom;
        const h = bottom - e.clientY;
        set({
          dataPanelHeight: Math.max(DATA_PANEL_MIN_HEIGHT, Math.min(DATA_PANEL_MAX_HEIGHT(), h)),
        });
      } else if (resizeEdge === 'left') {
        const w = 2 * (centerX() - e.clientX);
        set({
          dataPanelWidth: Math.max(DATA_PANEL_MIN_WIDTH, Math.min(DATA_PANEL_MAX_WIDTH(), w)),
        });
      } else if (resizeEdge === 'right') {
        const w = 2 * (e.clientX - centerX());
        set({
          dataPanelWidth: Math.max(DATA_PANEL_MIN_WIDTH, Math.min(DATA_PANEL_MAX_WIDTH(), w)),
        });
      }
    };
    const onUp = () => {
      setResizeEdge(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = resizeEdge === 'top' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizeEdge, set]);

  const { rows, columns } = useMemo(() => {
    if (!graph) return { rows: [] as Record<string, unknown>[], columns: [] as string[] };
    const rows = getOperatorRows({ nodes: graph.nodes });
    const columns = getTableColumns(rows);
    return { rows, columns };
  }, [graph]);

  const hiddenSet = useMemo(() => new Set(dataPanelHiddenColumns ?? []), [dataPanelHiddenColumns]);
  const selectedColumns = useMemo(
    () => columns.filter((c) => !hiddenSet.has(c)),
    [columns, hiddenSet]
  );

  const toggleColumnSelected = (col: string) => {
    if (PRIMARY_KEY_COLUMNS.includes(col)) return;
    const hidden = dataPanelHiddenColumns ?? [];
    if (hidden.includes(col)) {
      set({ dataPanelHiddenColumns: hidden.filter((c) => c !== col) });
    } else {
      set({ dataPanelHiddenColumns: [...hidden, col] });
    }
  };

  useEffect(() => {
    if (selectedColumns.length === 0) return;
    const updates: { chartXKey?: string; chartYKeys?: ChartYColumnConfig[] } = {};
    if (chartXKey && !selectedColumns.includes(chartXKey)) {
      updates.chartXKey = '';
    }
    const validYKeys = chartYKeys.filter((yc) => !yc.key || selectedColumns.includes(yc.key));
    if (validYKeys.length !== chartYKeys.length) {
      updates.chartYKeys = validYKeys;
    }
    if (Object.keys(updates).length > 0) set(updates);
  }, [selectedColumns, chartXKey, chartYKeys, set]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va ?? '').localeCompare(String(vb ?? ''));
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, sortKey, sortAsc]);

  const viewLabels: Record<ViewModeId, string> = {
    graph: t.viewGraph,
    bar: t.viewBar,
    pie: t.viewPie,
    line: t.viewLine,
    scatter: t.viewScatter,
  };

  if (!dataPanelOpen) return null;

  const startResize = (edge: DataPanelResizeEdge) => (e: React.MouseEvent) => {
    e.preventDefault();
    setResizeEdge(edge);
  };

  return (
    <div ref={ref} className="data-panel-wrap">
      <div
        ref={innerRef}
        className="data-panel-resizable"
        style={{ width: effectiveWidth, height: effectiveHeight }}
      >
        <div
          className="float-panel-splitter float-panel-splitter-h data-panel-splitter-top"
          role="separator"
          aria-orientation="horizontal"
          onMouseDown={startResize('top')}
        />
        <div className="data-panel-resizable-body">
          <div
            className="float-panel-splitter float-panel-splitter-v data-panel-splitter-left"
            role="separator"
            aria-orientation="vertical"
            onMouseDown={startResize('left')}
          />
          <div className="view-dropdown panel-glass data-panel-inner">
            <div className="view-tabs">
              <button
                type="button"
                className={`view-tab ${dataTab === 'view' ? 'active' : ''}`}
                onClick={() => setDataTab('view')}
              >
                {t.dataTabView}
              </button>
              <button
                type="button"
                className={`view-tab ${dataTab === 'table' ? 'active' : ''}`}
                onClick={() => setDataTab('table')}
              >
                {t.dataTabTable}
              </button>
            </div>
            <div className="view-pane">
              {dataTab === 'view' ? (
                <div className="view-scroll panel-content data-view-pane">
                  <div className="segment-group" role="group" aria-label={t.dataTabView}>
                    {VIEW_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={viewMode === mode}
                        className={`segment-item ${viewMode === mode ? 'active' : ''}`}
                        onClick={() => set({ viewMode: mode })}
                      >
                        {viewLabels[mode]}
                      </button>
                    ))}
                  </div>
                  {viewMode !== 'graph' && (
                    <div className="chart-panel">
                      <section className="chart-panel-section">
                        <h3 className="chart-panel-section-title">{t.chartDataMapping}</h3>
                        <MappingEditor
                          chartXKey={chartXKey}
                          chartYKeys={chartYKeys}
                          columns={selectedColumns}
                          set={set}
                          t={t}
                          chartType={
                            viewMode === 'bar'
                              ? 'bar'
                              : viewMode === 'pie'
                                ? 'pie'
                                : viewMode === 'line'
                                  ? 'line'
                                  : 'scatter'
                          }
                          chartSeriesVisibility={chartSeriesVisibility}
                          toggleSeriesVisibility={toggleSeriesVisibility}
                        />
                      </section>
                    </div>
                  )}
                </div>
              ) : (
                <div className="view-scroll panel-content">
                  {!graph ? (
                    <p className="detail-empty-hint">{t.detailEmptyHint}</p>
                  ) : (
                    <div className="data-table-wrap">
                      <div className="data-table-toolbar">
                        {(['csv', 'json', 'tsv'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            className="data-table-export-btn"
                            onClick={() =>
                              downloadTable(selectedColumns, sortedRows, fmt, formatCellForExport)
                            }
                            title={`导出选中列为 ${fmt.toUpperCase()}`}
                            aria-label={`导出 ${fmt.toUpperCase()}`}
                          >
                            .{fmt}
                          </button>
                        ))}
                      </div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            {columns.map((col) => {
                              const isPrimary = PRIMARY_KEY_COLUMNS.includes(col);
                              const checked = !hiddenSet.has(col);
                              const colLabel =
                                col === 'index'
                                  ? t.tableIndex
                                  : col === 'id'
                                    ? t.tableId
                                    : col === 'name'
                                      ? t.tableName
                                      : col;
                              return (
                                <th key={col} className="data-table-th" scope="col">
                                  <div className="data-table-th-inner">
                                    <span
                                      className="data-table-th-label"
                                      onClick={() => {
                                        if (sortKey === col) setSortAsc((a) => !a);
                                        else setSortKey(col);
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          if (sortKey === col) setSortAsc((a) => !a);
                                          else setSortKey(col);
                                        }
                                      }}
                                    >
                                      {colLabel}
                                      {sortKey === col && (sortAsc ? ' ↑' : ' ↓')}
                                    </span>
                                    <label
                                      className="panel-check data-table-th-check"
                                      title={isPrimary ? t.tableColumnSelectHint : colLabel}
                                      aria-label={colLabel}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="panel-check-label" aria-hidden>
                                        {''}
                                      </span>
                                      <span className="panel-check-box-wrap">
                                        <input
                                          type="checkbox"
                                          className="panel-check-input"
                                          checked={checked}
                                          disabled={isPrimary}
                                          onChange={() => toggleColumnSelected(col)}
                                          aria-label={colLabel}
                                        />
                                        <span className="panel-check-box" aria-hidden />
                                      </span>
                                    </label>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRows.map((row, i) => (
                            <tr key={i}>
                              {columns.map((col) => (
                                <td key={col} className="data-table-td">
                                  {formatCell(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div
            className="float-panel-splitter float-panel-splitter-v data-panel-splitter-right"
            role="separator"
            aria-orientation="vertical"
            onMouseDown={startResize('right')}
          />
        </div>
      </div>
    </div>
  );
});
