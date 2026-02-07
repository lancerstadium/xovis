import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '../locale';

/** Y轴列配置：包含列名、颜色和丰富的样式设置 */
export type ChartYColumnConfig = {
  key: string;
  color?: string;
  // 通用样式
  styleType?: 'solid' | 'gradient' | 'dashed' | 'dotted' | 'dashdot' | 'double-dash';
  // 柱状图/扇形图样式
  barFillStyle?: 'solid' | 'gradient' | 'hatched' | 'hatched-h' | 'hatched-v' | 'hatched-cross' | 'stripes' | 'pattern';
  barEdgeStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  barEdgeWidth?: number;
  barOpacity?: number;
  /** 柱状图起始数据列（默认为空，柱子从坐标轴底绘制） */
  barBaseKey?: string;
  // 折线图样式
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'dashdot' | 'double-dash';
  lineWidth?: number;
  lineFit?: boolean; // 是否启用拟合
  lineFitType?: 'linear' | 'polynomial' | 'exponential' | 'logarithmic' | 'power' | 'movingAverage'; // 拟合类型
  lineFitDegree?: number; // 多项式拟合的阶数（2-5）或移动平均的窗口大小（2-20）
  lineShowPoints?: boolean;
  markerStyle?: 'none' | 'circle' | 'square' | 'diamond' | 'star' | 'cross' | 'plus' | 'x';
  markerSize?: number;
  markerFillColor?: string;
  markerEdgeColor?: string;
  markerEdgeWidth?: number;
  // 数据标签样式（显示数值）
  showDataLabels?: boolean; // 是否显示数据标签
  dataLabelBold?: boolean; // 数据标签是否加粗
  dataLabelItalic?: boolean; // 数据标签是否斜体
  dataLabelPosition?: 'top' | 'bottom' | 'auto'; // 数据标签位置
  dataLabelOffsetX?: number; // 数据标签X偏移
  dataLabelOffsetY?: number; // 数据标签Y偏移
  dataLabelFontSize?: number; // 数据标签字体大小（0=自动）
  dataLabelDecimals?: number; // 数据标签小数位数（0-6）
  // 散点图样式
  scatterMarkerStyle?:
    | 'circle'
    | 'square'
    | 'diamond'
    | 'star'
    | 'cross'
    | 'plus'
    | 'x'
    | 'triangle';
  scatterMarkerSize?: number;
  scatterMarkerFillColor?: string;
  scatterMarkerEdgeColor?: string;
  scatterMarkerEdgeWidth?: number;
  scatterMarkerOpacity?: number;
  // 扇形图样式
  pieFillStyle?: 'solid' | 'gradient' | 'hatched' | 'hatched-h' | 'hatched-v' | 'hatched-cross' | 'stripes' | 'pattern';
  pieEdgeStyle?: 'solid' | 'dashed' | 'none';
  pieEdgeWidth?: number;
};

/** 柱状图/扇形图填充样式选项 */
export const FILL_STYLES = [
  { value: 'solid', label: '纯色' },
  { value: 'gradient', label: '渐变' },
  { value: 'hatched', label: '斜线' },
  { value: 'hatched-h', label: '横线' },
  { value: 'hatched-v', label: '竖线' },
  { value: 'hatched-cross', label: '交叉' },
  { value: 'stripes', label: '条纹' },
  { value: 'pattern', label: '圆点' },
] as const;

/** @deprecated 使用 FILL_STYLES */
export const BAR_FILL_STYLES = FILL_STYLES;

/** 边框样式选项 */
export const EDGE_STYLES = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
  { value: 'none', label: '无边框' },
] as const;

/** 折线图线型选项 */
export const LINE_STYLES = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
  { value: 'dashdot', label: '点划线' },
  { value: 'double-dash', label: '双虚线' },
] as const;

/** 标记样式选项 */
export const MARKER_STYLES = [
  { value: 'none', label: '无标记' },
  { value: 'circle', label: '圆形' },
  { value: 'square', label: '方形' },
  { value: 'diamond', label: '菱形' },
  { value: 'star', label: '星形' },
  { value: 'cross', label: '十字' },
  { value: 'plus', label: '加号' },
  { value: 'x', label: 'X形' },
  { value: 'triangle', label: '三角形' },
] as const;

type PresetColors = {
  bg: string;
  bgTarget: string;
  bgSidebar: string;
  border: string;
  text: string;
  text2: string;
  accent: string;
  toolbarBg: string;
  toolbarHover: string;
  toolbarText: string;
  nodeFill: string;
  nodeStroke: string;
  nodeTextColor: string;
  /** 点显属性区域背景（节点下半块） */
  nodeAttrFill: string;
  tensorFill: string;
  tensorStroke: string;
  edgeStroke: string;
};

type PresetShape = { nodeCornerRadius: number; edgeCurvature: number };

/* 浅色算子色板：多组区分，低饱和 / 高对比用略深色 */
const OP_LIGHT_A = [
  '#e8eef4',
  '#eaeaf0',
  '#e6f0ea',
  '#f2efe8',
  '#f0e8ee',
  '#e6f2f4',
  '#eee8f2',
  '#e8e8ea',
];
const OP_LIGHT_B = [
  '#e2e8f0',
  '#e4e4ec',
  '#e0ece4',
  '#ece8e2',
  '#ece0e8',
  '#e0ecee',
  '#eae0ea',
  '#e4e4e6',
];
const OP_LIGHT_C = [
  '#f0f4f8',
  '#f2f0f4',
  '#eef4f0',
  '#f6f2ec',
  '#f4ecf0',
  '#eef6f8',
  '#f4eef6',
  '#f0f0f2',
];
const OP_LIGHT_D = [
  '#dbeafe',
  '#e0e7ff',
  '#d1fae5',
  '#fef3c7',
  '#fce7f3',
  '#cffafe',
  '#f3e8ff',
  '#e5e7eb',
];
const OP_LIGHT_E = [
  '#dcfce7',
  '#fae8ff',
  '#e0f2fe',
  '#fef9c3',
  '#ede9fe',
  '#ffedd5',
  '#fce7f3',
  '#f1f5f9',
];
/* 浅色高对比：节点略深一点便于区分 */
const OP_LIGHT_HC_A = [
  '#bfdbfe',
  '#c7d2fe',
  '#bbf7d0',
  '#fde68a',
  '#fbcfe8',
  '#a5f3fc',
  '#e9d5ff',
  '#cbd5e1',
];
const OP_LIGHT_HC_B = [
  '#93c5fd',
  '#a5b4fc',
  '#86efac',
  '#fcd34d',
  '#f9a8d4',
  '#67e8f9',
  '#d8b4fe',
  '#94a3b8',
];
const OP_LIGHT_HC_C = [
  '#60a5fa',
  '#818cf8',
  '#4ade80',
  '#fbbf24',
  '#f472b6',
  '#22d3ee',
  '#c084fc',
  '#64748b',
];
/* 深色：低饱和（低对比用）/ 中饱和 / 包豪斯高饱和 */
const OP_DARK_A = [
  '#1e3a4a',
  '#252d42',
  '#1e3d32',
  '#3a3220',
  '#3a2438',
  '#1e3d48',
  '#2e2642',
  '#2a3038',
];
const OP_DARK_B = [
  '#243548',
  '#2a2a3c',
  '#223834',
  '#363428',
  '#362834',
  '#223844',
  '#2c2838',
  '#2c3038',
];
const OP_DARK_C = [
  '#1c2e3c',
  '#222836',
  '#1a3430',
  '#322c20',
  '#302430',
  '#1a3440',
  '#262234',
  '#262a32',
];
/* 深色低对比：更柔、略灰 */
const OP_DARK_LOW = [
  '#2a3544',
  '#2e3038',
  '#283a36',
  '#3a3832',
  '#363240',
  '#283a44',
  '#32363a',
  '#303238',
];
const OP_DARK_SAT = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#ca8a04',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#475569',
];
const OP_DARK_BAUHAUS = [
  '#1e40af',
  '#15803d',
  '#b91c1c',
  '#a16207',
  '#6b21a8',
  '#0e7490',
  '#be185d',
  '#334155',
];
/* 张量角色色：input / output / weight / activation，顺序固定便于一致分配 */
const TENSOR_LIGHT = ['#cce0f2', '#f0dcc8', '#e2d8f0', '#d4e8dc'];
const TENSOR_LIGHT_ALT = ['#d8e8f4', '#f4e4d4', '#ead8f2', '#dcecdc'];
const TENSOR_LIGHT_HC = ['#93c5fd', '#fdba74', '#c4b5fd', '#86efac'];
const TENSOR_DARK = ['#1e3a4a', '#3a3228', '#2a2642', '#243a32'];
const TENSOR_DARK_ALT = ['#243e52', '#403830', '#302842', '#283a36'];
const TENSOR_DARK_LOW = ['#364454', '#444038', '#3a3248', '#384440'];
const TENSOR_DARK_BAUHAUS = ['#2563eb', '#ea580c', '#7c3aed', '#22c55e'];

/** 浅色1：白底冷蓝（白/近白、蓝强调） */
const presetLight1: PresetColors = {
  bg: '#f8fafc',
  bgTarget: '#ffffff',
  bgSidebar: '#f1f5f9',
  border: '#c8d2de',
  text: '#0f1419',
  text2: '#3d4f5c',
  accent: '#1d4ed8',
  toolbarBg: '#475569',
  toolbarHover: '#334155',
  toolbarText: '#f8fafc',
  nodeFill: '#ffffff',
  nodeStroke: '#94a3b8',
  nodeTextColor: '#1e293b',
  nodeAttrFill: '#f1f5f9',
  tensorFill: '#f8fafc',
  tensorStroke: '#94a3b8',
  edgeStroke: '#94a3b8',
};

/** 浅色2：白底中性灰（纯白/近白、无色调） */
const presetLight2: PresetColors = {
  bg: '#fafafa',
  bgTarget: '#ffffff',
  bgSidebar: '#f5f5f5',
  border: '#e5e5e5',
  text: '#171717',
  text2: '#525252',
  accent: '#404040',
  toolbarBg: '#525252',
  toolbarHover: '#737373',
  toolbarText: '#fafafa',
  nodeFill: '#ffffff',
  nodeStroke: '#a3a3a3',
  nodeTextColor: '#262626',
  nodeAttrFill: '#fafafa',
  tensorFill: '#fafafa',
  tensorStroke: '#a3a3a3',
  edgeStroke: '#a3a3a3',
};

/** 浅色3：纸白暖（米白/近白、棕灰字） */
const presetLight3: PresetColors = {
  bg: '#fffefb',
  bgTarget: '#ffffff',
  bgSidebar: '#faf8f5',
  border: '#e8e4de',
  text: '#292524',
  text2: '#57534e',
  accent: '#78716c',
  toolbarBg: '#78716c',
  toolbarHover: '#a8a29e',
  toolbarText: '#fafaf9',
  nodeFill: '#ffffff',
  nodeStroke: '#a8a29e',
  nodeTextColor: '#292524',
  nodeAttrFill: '#fefdfb',
  tensorFill: '#fafaf9',
  tensorStroke: '#a8a29e',
  edgeStroke: '#a8a29e',
};

/** 浅色4：白底青（白/近白、青强调） */
const presetLight4: PresetColors = {
  bg: '#fafcfd',
  bgTarget: '#ffffff',
  bgSidebar: '#f5fafb',
  border: '#cbdce8',
  text: '#0f172a',
  text2: '#475569',
  accent: '#0e7490',
  toolbarBg: '#0f766e',
  toolbarHover: '#0d9488',
  toolbarText: '#f0fdfa',
  nodeFill: '#ffffff',
  nodeStroke: '#99a2b0',
  nodeTextColor: '#1e293b',
  nodeAttrFill: '#f0fdfa',
  tensorFill: '#ccfbf1',
  tensorStroke: '#99a2b0',
  edgeStroke: '#99a2b0',
};

/** 浅色5：云白蓝（白/近白、蓝强调） */
const presetLight5: PresetColors = {
  bg: '#f8fafc',
  bgTarget: '#ffffff',
  bgSidebar: '#fafbfc',
  border: '#c7d5e4',
  text: '#1e293b',
  text2: '#64748b',
  accent: '#2563eb',
  toolbarBg: '#1e40af',
  toolbarHover: '#2563eb',
  toolbarText: '#eff6ff',
  nodeFill: '#ffffff',
  nodeStroke: '#94a3b8',
  nodeTextColor: '#1e293b',
  nodeAttrFill: '#f8fafc',
  tensorFill: '#dbeafe',
  tensorStroke: '#94a3b8',
  edgeStroke: '#94a3b8',
};

/** 浅色6：极简白（纯白/近白、细描边） */
const presetLight6: PresetColors = {
  bg: '#ffffff',
  bgTarget: '#ffffff',
  bgSidebar: '#fafafa',
  border: '#e5e5e5',
  text: '#262626',
  text2: '#737373',
  accent: '#0c7ea0',
  toolbarBg: '#737373',
  toolbarHover: '#525252',
  toolbarText: '#fafafa',
  nodeFill: '#ffffff',
  nodeStroke: '#d4d4d4',
  nodeTextColor: '#404040',
  nodeAttrFill: '#fafafa',
  tensorFill: '#fafafa',
  tensorStroke: '#d4d4d4',
  edgeStroke: '#d4d4d4',
};

/** 浅色7：白底蓝二（近白、深蓝强调） */
const presetLight7: PresetColors = {
  bg: '#f5f7fa',
  bgTarget: '#ffffff',
  bgSidebar: '#f1f5f9',
  border: '#c8d4e4',
  text: '#0f172a',
  text2: '#475569',
  accent: '#1e40af',
  toolbarBg: '#1e3a5f',
  toolbarHover: '#1e40af',
  toolbarText: '#f0f9ff',
  nodeFill: '#ffffff',
  nodeStroke: '#64748b',
  nodeTextColor: '#1e293b',
  nodeAttrFill: '#e0f2fe',
  tensorFill: '#dbeafe',
  tensorStroke: '#64748b',
  edgeStroke: '#64748b',
};

/** 浅色8：白底青二（近白、青强调） */
const presetLight8: PresetColors = {
  bg: '#fafafa',
  bgTarget: '#ffffff',
  bgSidebar: '#f5f5f5',
  border: '#d4d4d4',
  text: '#171717',
  text2: '#525252',
  accent: '#0369a1',
  toolbarBg: '#155e75',
  toolbarHover: '#0e7490',
  toolbarText: '#ecfeff',
  nodeFill: '#ffffff',
  nodeStroke: '#a3a3a3',
  nodeTextColor: '#262626',
  nodeAttrFill: '#f0f9ff',
  tensorFill: '#e0f2fe',
  tensorStroke: '#a3a3a3',
  edgeStroke: '#a3a3a3',
};

/** 浅色9：米白暖（米白/近白、暖强调） */
const presetLight9: PresetColors = {
  bg: '#fffdf9',
  bgTarget: '#ffffff',
  bgSidebar: '#fef9f0',
  border: '#e8dfd0',
  text: '#292524',
  text2: '#78716c',
  accent: '#b45309',
  toolbarBg: '#92400e',
  toolbarHover: '#b45309',
  toolbarText: '#fffbeb',
  nodeFill: '#ffffff',
  nodeStroke: '#d6d3d1',
  nodeTextColor: '#292524',
  nodeAttrFill: '#fefce8',
  tensorFill: '#fef9c3',
  tensorStroke: '#d6d3d1',
  edgeStroke: '#d6d3d1',
};

/** 浅色10：白底青绿（近白、青绿强调） */
const presetLight10: PresetColors = {
  bg: '#f8fcfb',
  bgTarget: '#ffffff',
  bgSidebar: '#f0fdf4',
  border: '#bbf7d0',
  text: '#064e3b',
  text2: '#047857',
  accent: '#0d9488',
  toolbarBg: '#0f766e',
  toolbarHover: '#0d9488',
  toolbarText: '#f0fdfa',
  nodeFill: '#ffffff',
  nodeStroke: '#6ee7b7',
  nodeTextColor: '#064e3b',
  nodeAttrFill: '#ccfbf1',
  tensorFill: '#99f6e4',
  tensorStroke: '#5eead4',
  edgeStroke: '#5eead4',
};

/** 浅色11：高对比蓝（纯白底、深蓝字） */
const presetLight11: PresetColors = {
  bg: '#ffffff',
  bgTarget: '#ffffff',
  bgSidebar: '#f8fafc',
  border: '#cbd5e1',
  text: '#0f172a',
  text2: '#334155',
  accent: '#2563eb',
  toolbarBg: '#1e293b',
  toolbarHover: '#334155',
  toolbarText: '#f8fafc',
  nodeFill: '#ffffff',
  nodeStroke: '#64748b',
  nodeTextColor: '#0f172a',
  nodeAttrFill: '#f1f5f9',
  tensorFill: '#e2e8f0',
  tensorStroke: '#64748b',
  edgeStroke: '#64748b',
};

/** 浅色12：高对比红灰（纸白、红强调） */
const presetLight12: PresetColors = {
  bg: '#fafafa',
  bgTarget: '#ffffff',
  bgSidebar: '#f5f5f5',
  border: '#e5e5e5',
  text: '#171717',
  text2: '#404040',
  accent: '#dc2626',
  toolbarBg: '#991b1b',
  toolbarHover: '#b91c1c',
  toolbarText: '#fef2f2',
  nodeFill: '#ffffff',
  nodeStroke: '#525252',
  nodeTextColor: '#171717',
  nodeAttrFill: '#fef2f2',
  tensorFill: '#fee2e2',
  tensorStroke: '#525252',
  edgeStroke: '#525252',
};

/** 浅色13：淡白绿（极淡绿侧栏、绿强调，与14/15区分） */
const presetLight13: PresetColors = {
  bg: '#ffffff',
  bgTarget: '#ffffff',
  bgSidebar: '#f6fcf8',
  border: '#e0f0e6',
  text: '#1a1a1a',
  text2: '#555555',
  accent: '#059669',
  toolbarBg: '#0d9660',
  toolbarHover: '#10b981',
  toolbarText: '#ecfdf5',
  nodeFill: '#ffffff',
  nodeStroke: '#a7f3d0',
  nodeTextColor: '#1a1a1a',
  nodeAttrFill: '#f0fdf4',
  tensorFill: '#d1fae5',
  tensorStroke: '#6ee7b7',
  edgeStroke: '#a7f3d0',
};

/** 浅色14：淡白橙（极淡橙侧栏、橙强调，与13/15区分） */
const presetLight14: PresetColors = {
  bg: '#ffffff',
  bgTarget: '#ffffff',
  bgSidebar: '#fffbf6',
  border: '#f0e8e0',
  text: '#1a1a1a',
  text2: '#555555',
  accent: '#ea580c',
  toolbarBg: '#c2410c',
  toolbarHover: '#ea580c',
  toolbarText: '#fff7ed',
  nodeFill: '#ffffff',
  nodeStroke: '#fed7aa',
  nodeTextColor: '#1a1a1a',
  nodeAttrFill: '#fffbeb',
  tensorFill: '#ffedd5',
  tensorStroke: '#fdba74',
  edgeStroke: '#fed7aa',
};

/** 浅色15：淡白紫（极淡紫侧栏、紫强调，与13/14区分） */
const presetLight15: PresetColors = {
  bg: '#ffffff',
  bgTarget: '#ffffff',
  bgSidebar: '#f8f6fc',
  border: '#e8e0f0',
  text: '#1a1a1a',
  text2: '#555555',
  accent: '#7c3aed',
  toolbarBg: '#5b21b6',
  toolbarHover: '#7c3aed',
  toolbarText: '#faf5ff',
  nodeFill: '#ffffff',
  nodeStroke: '#e9d5ff',
  nodeTextColor: '#1a1a1a',
  nodeAttrFill: '#f5f3ff',
  tensorFill: '#ede9fe',
  tensorStroke: '#c4b5fd',
  edgeStroke: '#e9d5ff',
};

/** 深色1：蓝黑（黑底偏蓝、蓝强调） */
const presetDark1: PresetColors = {
  bg: '#0a0e14',
  bgTarget: '#0f172a',
  bgSidebar: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  text2: '#cbd5e1',
  accent: '#38bdf8',
  toolbarBg: '#1e3a5f',
  toolbarHover: '#2563eb',
  toolbarText: '#f0f9ff',
  nodeFill: '#1e293b',
  nodeStroke: '#475569',
  nodeTextColor: '#f8fafc',
  nodeAttrFill: '#334155',
  tensorFill: '#0f172a',
  tensorStroke: '#475569',
  edgeStroke: '#475569',
};

/** 深色2：纯黑（中性黑、青强调） */
const presetDark2: PresetColors = {
  bg: '#050505',
  bgTarget: '#0a0a0a',
  bgSidebar: '#171717',
  border: '#404040',
  text: '#fafafa',
  text2: '#d4d4d4',
  accent: '#22d3ee',
  toolbarBg: '#164e63',
  toolbarHover: '#0e7490',
  toolbarText: '#ecfeff',
  nodeFill: '#171717',
  nodeStroke: '#525252',
  nodeTextColor: '#fafafa',
  nodeAttrFill: '#262626',
  tensorFill: '#0a0a0a',
  tensorStroke: '#525252',
  edgeStroke: '#525252',
};

/** 深色3：Nord 黑（黑底偏蓝灰、青强调） */
const presetDark3: PresetColors = {
  bg: '#0d0f14',
  bgTarget: '#1a1e28',
  bgSidebar: '#232834',
  border: '#3b4252',
  text: '#eceff4',
  text2: '#d8dee9',
  accent: '#88c0d0',
  toolbarBg: '#4c566a',
  toolbarHover: '#5e81ac',
  toolbarText: '#eceff4',
  nodeFill: '#2e3440',
  nodeStroke: '#5e81ac',
  nodeTextColor: '#eceff4',
  nodeAttrFill: '#3b4252',
  tensorFill: '#232834',
  tensorStroke: '#5e81ac',
  edgeStroke: '#5e81ac',
};

/** 深色4：墨绿黑（黑底偏绿、青绿强调） */
const presetDark4: PresetColors = {
  bg: '#060a08',
  bgTarget: '#0d1612',
  bgSidebar: '#132118',
  border: '#1e3329',
  text: '#f0fdf4',
  text2: '#bbf7d0',
  accent: '#2dd4bf',
  toolbarBg: '#134e4a',
  toolbarHover: '#0f766e',
  toolbarText: '#f0fdfa',
  nodeFill: '#132118',
  nodeStroke: '#3d5248',
  nodeTextColor: '#f0fdf4',
  nodeAttrFill: '#1a2e22',
  tensorFill: '#0d1612',
  tensorStroke: '#3d5248',
  edgeStroke: '#3d5248',
};

/** 深色5：暖黑（黑底偏棕、琥珀强调） */
const presetDark5: PresetColors = {
  bg: '#0c0a09',
  bgTarget: '#171412',
  bgSidebar: '#292524',
  border: '#44403c',
  text: '#fafaf9',
  text2: '#e7e5e4',
  accent: '#fbbf24',
  toolbarBg: '#78350f',
  toolbarHover: '#b45309',
  toolbarText: '#fffbeb',
  nodeFill: '#1c1917',
  nodeStroke: '#78716c',
  nodeTextColor: '#fafaf9',
  nodeAttrFill: '#292524',
  tensorFill: '#171412',
  tensorStroke: '#78716c',
  edgeStroke: '#78716c',
};

/** 深色6：紫黑（黑底偏紫、紫强调） */
const presetDark6: PresetColors = {
  bg: '#0a0810',
  bgTarget: '#12101a',
  bgSidebar: '#1a1625',
  border: '#2d2a3e',
  text: '#f5f3ff',
  text2: '#ddd6fe',
  accent: '#a78bfa',
  toolbarBg: '#4c1d95',
  toolbarHover: '#6d28d9',
  toolbarText: '#faf5ff',
  nodeFill: '#1a1625',
  nodeStroke: '#4c4a5e',
  nodeTextColor: '#f5f3ff',
  nodeAttrFill: '#252036',
  tensorFill: '#12101a',
  tensorStroke: '#4c4a5e',
  edgeStroke: '#4c4a5e',
};

/** 深色7：蓝黑二（与1区分、更亮蓝强调） */
const presetDark7: PresetColors = {
  bg: '#080c14',
  bgTarget: '#0f172a',
  bgSidebar: '#172554',
  border: '#1e3a8a',
  text: '#f0f9ff',
  text2: '#bae6fd',
  accent: '#7dd3fc',
  toolbarBg: '#1e40af',
  toolbarHover: '#3b82f6',
  toolbarText: '#dbeafe',
  nodeFill: '#1e293b',
  nodeStroke: '#60a5fa',
  nodeTextColor: '#f0f9ff',
  nodeAttrFill: '#1e3a8a',
  tensorFill: '#0f172a',
  tensorStroke: '#60a5fa',
  edgeStroke: '#60a5fa',
};

/** 深色8：纯黑青（与2区分、青绿强调） */
const presetDark8: PresetColors = {
  bg: '#030405',
  bgTarget: '#0a0a0a',
  bgSidebar: '#0f172a',
  border: '#334155',
  text: '#e0f2fe',
  text2: '#bae6fd',
  accent: '#67e8f9',
  toolbarBg: '#155e75',
  toolbarHover: '#0891b2',
  toolbarText: '#ecfeff',
  nodeFill: '#171717',
  nodeStroke: '#22d3ee',
  nodeTextColor: '#e0f2fe',
  nodeAttrFill: '#262626',
  tensorFill: '#164e63',
  tensorStroke: '#22d3ee',
  edgeStroke: '#22d3ee',
};

/** 深色9：Nord 黑二（与3区分、略亮节点） */
const presetDark9: PresetColors = {
  bg: '#0a0c10',
  bgTarget: '#151922',
  bgSidebar: '#2e3440',
  border: '#4c566a',
  text: '#eceff4',
  text2: '#d8dee9',
  accent: '#81a1c1',
  toolbarBg: '#5e81ac',
  toolbarHover: '#88c0d0',
  toolbarText: '#eceff4',
  nodeFill: '#2e3440',
  nodeStroke: '#5e81ac',
  nodeTextColor: '#eceff4',
  nodeAttrFill: '#3b4252',
  tensorFill: '#232834',
  tensorStroke: '#5e81ac',
  edgeStroke: '#5e81ac',
};

/** 深色10：墨绿黑二（与4区分、更亮青绿） */
const presetDark10: PresetColors = {
  bg: '#050907',
  bgTarget: '#0a1210',
  bgSidebar: '#14532d',
  border: '#166534',
  text: '#dcfce7',
  text2: '#bbf7d0',
  accent: '#5eead4',
  toolbarBg: '#0f766e',
  toolbarHover: '#14b8a6',
  toolbarText: '#ccfbf1',
  nodeFill: '#0d1912',
  nodeStroke: '#2dd4bf',
  nodeTextColor: '#dcfce7',
  nodeAttrFill: '#134e4a',
  tensorFill: '#0a1210',
  tensorStroke: '#2dd4bf',
  edgeStroke: '#2dd4bf',
};

/** 深色11：暖黑二（与5区分、更亮黄） */
const presetDark11: PresetColors = {
  bg: '#0a0806',
  bgTarget: '#141210',
  bgSidebar: '#422006',
  border: '#78350f',
  text: '#fef3c7',
  text2: '#fde68a',
  accent: '#fcd34d',
  toolbarBg: '#a16207',
  toolbarHover: '#ca8a04',
  toolbarText: '#fef9c3',
  nodeFill: '#1c1917',
  nodeStroke: '#fbbf24',
  nodeTextColor: '#fef3c7',
  nodeAttrFill: '#292524',
  tensorFill: '#422006',
  tensorStroke: '#fbbf24',
  edgeStroke: '#fbbf24',
};

/** 深色12：纯黑 + 蓝强调 */
const presetDark12: PresetColors = {
  bg: '#000000',
  bgTarget: '#050505',
  bgSidebar: '#0a0a0a',
  border: '#262626',
  text: '#ffffff',
  text2: '#e5e5e5',
  accent: '#3b82f6',
  toolbarBg: '#1e3a8a',
  toolbarHover: '#2563eb',
  toolbarText: '#dbeafe',
  nodeFill: '#0a0a0a',
  nodeStroke: '#404040',
  nodeTextColor: '#ffffff',
  nodeAttrFill: '#171717',
  tensorFill: '#171717',
  tensorStroke: '#525252',
  edgeStroke: '#404040',
};
/** 深色13：绿黑（黑底偏绿，与14/15明显区分） */
const presetDark13: PresetColors = {
  bg: '#030503',
  bgTarget: '#050805',
  bgSidebar: '#0a100a',
  border: '#1a2e1a',
  text: '#ecfdf5',
  text2: '#bbf7d0',
  accent: '#22c55e',
  toolbarBg: '#14532d',
  toolbarHover: '#16a34a',
  toolbarText: '#f0fdf4',
  nodeFill: '#080d08',
  nodeStroke: '#166534',
  nodeTextColor: '#ecfdf5',
  nodeAttrFill: '#0a120a',
  tensorFill: '#050a06',
  tensorStroke: '#15803d',
  edgeStroke: '#166534',
};

/** 深色14：暖黑（黑底偏橙棕，与13/15明显区分） */
const presetDark14: PresetColors = {
  bg: '#050403',
  bgTarget: '#080605',
  bgSidebar: '#100d0a',
  border: '#2e261a',
  text: '#fef3c7',
  text2: '#fde68a',
  accent: '#f59e0b',
  toolbarBg: '#78350f',
  toolbarHover: '#d97706',
  toolbarText: '#fffbeb',
  nodeFill: '#0d0a08',
  nodeStroke: '#92400e',
  nodeTextColor: '#fef3c7',
  nodeAttrFill: '#120d0a',
  tensorFill: '#0a0805',
  tensorStroke: '#b45309',
  edgeStroke: '#92400e',
};

/** 深色15：紫黑（黑底偏紫，与13/14明显区分） */
const presetDark15: PresetColors = {
  bg: '#050305',
  bgTarget: '#080508',
  bgSidebar: '#0d0a10',
  border: '#2a1a2e',
  text: '#f5f3ff',
  text2: '#ddd6fe',
  accent: '#a855f7',
  toolbarBg: '#4c1d95',
  toolbarHover: '#7c3aed',
  toolbarText: '#faf5ff',
  nodeFill: '#0a080d',
  nodeStroke: '#5b21b6',
  nodeTextColor: '#f5f3ff',
  nodeAttrFill: '#0a0612',
  tensorFill: '#08050a',
  tensorStroke: '#6d28d9',
  edgeStroke: '#5b21b6',
};

export type ThemeId =
  | 'light1'
  | 'light2'
  | 'light3'
  | 'light4'
  | 'light5'
  | 'light6'
  | 'light7'
  | 'light8'
  | 'light9'
  | 'light10'
  | 'light11'
  | 'light12'
  | 'light13'
  | 'light14'
  | 'light15'
  | 'dark1'
  | 'dark2'
  | 'dark3'
  | 'dark4'
  | 'dark5'
  | 'dark6'
  | 'dark7'
  | 'dark8'
  | 'dark9'
  | 'dark10'
  | 'dark11'
  | 'dark12'
  | 'dark13'
  | 'dark14'
  | 'dark15';

/** 各预设的节点圆角与边弧度（参与预设切换；浅/深同号可不同形，便于区分） */
const PRESET_SHAPES: Record<ThemeId, PresetShape> = {
  light1: { nodeCornerRadius: 4, edgeCurvature: 0 },
  light2: { nodeCornerRadius: 0, edgeCurvature: 0.05 },
  light3: { nodeCornerRadius: 10, edgeCurvature: 0.2 },
  light4: { nodeCornerRadius: 6, edgeCurvature: 0.1 },
  light5: { nodeCornerRadius: 4, edgeCurvature: 0.15 },
  light6: { nodeCornerRadius: 8, edgeCurvature: 0 },
  light7: { nodeCornerRadius: 2, edgeCurvature: 0.1 },
  light8: { nodeCornerRadius: 6, edgeCurvature: 0.25 },
  light9: { nodeCornerRadius: 12, edgeCurvature: 0.2 },
  light10: { nodeCornerRadius: 6, edgeCurvature: 0.15 },
  light11: { nodeCornerRadius: 4, edgeCurvature: 0.1 },
  light12: { nodeCornerRadius: 8, edgeCurvature: 0.05 },
  light13: { nodeCornerRadius: 6, edgeCurvature: 0.2 },
  light14: { nodeCornerRadius: 10, edgeCurvature: 0.15 },
  light15: { nodeCornerRadius: 8, edgeCurvature: 0.1 },
  dark1: { nodeCornerRadius: 6, edgeCurvature: 0.1 },
  dark2: { nodeCornerRadius: 2, edgeCurvature: 0 },
  dark3: { nodeCornerRadius: 8, edgeCurvature: 0.25 },
  dark4: { nodeCornerRadius: 4, edgeCurvature: 0.15 },
  dark5: { nodeCornerRadius: 10, edgeCurvature: 0.2 },
  dark6: { nodeCornerRadius: 6, edgeCurvature: 0.05 },
  dark7: { nodeCornerRadius: 4, edgeCurvature: 0.15 },
  dark8: { nodeCornerRadius: 8, edgeCurvature: 0.1 },
  dark9: { nodeCornerRadius: 12, edgeCurvature: 0.2 },
  dark10: { nodeCornerRadius: 6, edgeCurvature: 0.25 },
  dark11: { nodeCornerRadius: 10, edgeCurvature: 0.15 },
  dark12: { nodeCornerRadius: 4, edgeCurvature: 0 },
  dark13: { nodeCornerRadius: 6, edgeCurvature: 0.1 },
  dark14: { nodeCornerRadius: 8, edgeCurvature: 0.15 },
  dark15: { nodeCornerRadius: 6, edgeCurvature: 0.2 },
};

type FullPreset = PresetColors &
  PresetShape & { operatorPalette: string[]; tensorRoleColors: string[] };

const PRESETS: Record<ThemeId, FullPreset> = {
  /* 浅色 1–10：中低对比，节点色板 A/B/C/D/E 轮换以区分 */
  light1: {
    ...presetLight1,
    ...PRESET_SHAPES.light1,
    operatorPalette: [...OP_LIGHT_A],
    tensorRoleColors: [...TENSOR_LIGHT],
  },
  light2: {
    ...presetLight2,
    ...PRESET_SHAPES.light2,
    operatorPalette: [...OP_LIGHT_B],
    tensorRoleColors: [...TENSOR_LIGHT_ALT],
  },
  light3: {
    ...presetLight3,
    ...PRESET_SHAPES.light3,
    operatorPalette: [...OP_LIGHT_C],
    tensorRoleColors: [...TENSOR_LIGHT],
  },
  light4: {
    ...presetLight4,
    ...PRESET_SHAPES.light4,
    operatorPalette: [...OP_LIGHT_D],
    tensorRoleColors: [...TENSOR_LIGHT_ALT],
  },
  light5: {
    ...presetLight5,
    ...PRESET_SHAPES.light5,
    operatorPalette: [...OP_LIGHT_E],
    tensorRoleColors: [...TENSOR_LIGHT],
  },
  light6: {
    ...presetLight6,
    ...PRESET_SHAPES.light6,
    operatorPalette: [...OP_LIGHT_A],
    tensorRoleColors: [...TENSOR_LIGHT_ALT],
  },
  light7: {
    ...presetLight7,
    ...PRESET_SHAPES.light7,
    operatorPalette: [...OP_LIGHT_B],
    tensorRoleColors: [...TENSOR_LIGHT],
  },
  light8: {
    ...presetLight8,
    ...PRESET_SHAPES.light8,
    operatorPalette: [...OP_LIGHT_C],
    tensorRoleColors: [...TENSOR_LIGHT_ALT],
  },
  light9: {
    ...presetLight9,
    ...PRESET_SHAPES.light9,
    operatorPalette: [...OP_LIGHT_D],
    tensorRoleColors: [...TENSOR_LIGHT],
  },
  light10: {
    ...presetLight10,
    ...PRESET_SHAPES.light10,
    operatorPalette: [...OP_LIGHT_E],
    tensorRoleColors: [...TENSOR_LIGHT_ALT],
  },
  /* 浅色 11–15：高对比，节点用略深色板 + 高对比张量色 */
  light11: {
    ...presetLight11,
    ...PRESET_SHAPES.light11,
    operatorPalette: [...OP_LIGHT_HC_A],
    tensorRoleColors: [...TENSOR_LIGHT_HC],
  },
  light12: {
    ...presetLight12,
    ...PRESET_SHAPES.light12,
    operatorPalette: [...OP_LIGHT_HC_B],
    tensorRoleColors: [...TENSOR_LIGHT_HC],
  },
  light13: {
    ...presetLight13,
    ...PRESET_SHAPES.light13,
    operatorPalette: [...OP_LIGHT_HC_C],
    tensorRoleColors: [...TENSOR_LIGHT_HC],
  },
  light14: {
    ...presetLight14,
    ...PRESET_SHAPES.light14,
    operatorPalette: [...OP_LIGHT_HC_A],
    tensorRoleColors: [...TENSOR_LIGHT_HC],
  },
  light15: {
    ...presetLight15,
    ...PRESET_SHAPES.light15,
    operatorPalette: [...OP_LIGHT_HC_B],
    tensorRoleColors: [...TENSOR_LIGHT_HC],
  },
  /* 深色 1–6：高对比 */
  dark1: {
    ...presetDark1,
    ...PRESET_SHAPES.dark1,
    operatorPalette: [...OP_DARK_SAT],
    tensorRoleColors: [...TENSOR_DARK_BAUHAUS],
  },
  dark2: {
    ...presetDark2,
    ...PRESET_SHAPES.dark2,
    operatorPalette: [...OP_DARK_A],
    tensorRoleColors: [...TENSOR_DARK],
  },
  dark3: {
    ...presetDark3,
    ...PRESET_SHAPES.dark3,
    operatorPalette: [...OP_DARK_B],
    tensorRoleColors: [...TENSOR_DARK_ALT],
  },
  dark4: {
    ...presetDark4,
    ...PRESET_SHAPES.dark4,
    operatorPalette: [...OP_DARK_SAT],
    tensorRoleColors: [...TENSOR_DARK_BAUHAUS],
  },
  dark5: {
    ...presetDark5,
    ...PRESET_SHAPES.dark5,
    operatorPalette: [...OP_DARK_C],
    tensorRoleColors: [...TENSOR_DARK],
  },
  dark6: {
    ...presetDark6,
    ...PRESET_SHAPES.dark6,
    operatorPalette: [...OP_DARK_SAT],
    tensorRoleColors: [...TENSOR_DARK_ALT],
  },
  /* 深色 7–11：部分低对比（节点更柔、略灰） */
  dark7: {
    ...presetDark7,
    ...PRESET_SHAPES.dark7,
    operatorPalette: [...OP_DARK_LOW],
    tensorRoleColors: [...TENSOR_DARK_LOW],
  },
  dark8: {
    ...presetDark8,
    ...PRESET_SHAPES.dark8,
    operatorPalette: [...OP_DARK_LOW],
    tensorRoleColors: [...TENSOR_DARK_LOW],
  },
  dark9: {
    ...presetDark9,
    ...PRESET_SHAPES.dark9,
    operatorPalette: [...OP_DARK_A],
    tensorRoleColors: [...TENSOR_DARK_LOW],
  },
  dark10: {
    ...presetDark10,
    ...PRESET_SHAPES.dark10,
    operatorPalette: [...OP_DARK_LOW],
    tensorRoleColors: [...TENSOR_DARK],
  },
  dark11: {
    ...presetDark11,
    ...PRESET_SHAPES.dark11,
    operatorPalette: [...OP_DARK_LOW],
    tensorRoleColors: [...TENSOR_DARK_LOW],
  },
  /* 深色 12–15：纯黑底 + 包豪斯高饱和节点 */
  dark12: {
    ...presetDark12,
    ...PRESET_SHAPES.dark12,
    operatorPalette: [...OP_DARK_BAUHAUS],
    tensorRoleColors: [...TENSOR_DARK_BAUHAUS],
  },
  dark13: {
    ...presetDark13,
    ...PRESET_SHAPES.dark13,
    operatorPalette: [...OP_DARK_BAUHAUS],
    tensorRoleColors: [...TENSOR_DARK_BAUHAUS],
  },
  dark14: {
    ...presetDark14,
    ...PRESET_SHAPES.dark14,
    operatorPalette: [...OP_DARK_BAUHAUS],
    tensorRoleColors: [...TENSOR_DARK_BAUHAUS],
  },
  dark15: {
    ...presetDark15,
    ...PRESET_SHAPES.dark15,
    operatorPalette: [...OP_DARK_BAUHAUS],
    tensorRoleColors: [...TENSOR_DARK_BAUHAUS],
  },
};

export const THEME_IDS: ThemeId[] = [
  'light1',
  'light2',
  'light3',
  'light4',
  'light5',
  'light6',
  'light7',
  'light8',
  'light9',
  'light10',
  'light11',
  'light12',
  'light13',
  'light14',
  'light15',
  'dark1',
  'dark2',
  'dark3',
  'dark4',
  'dark5',
  'dark6',
  'dark7',
  'dark8',
  'dark9',
  'dark10',
  'dark11',
  'dark12',
  'dark13',
  'dark14',
  'dark15',
];

export type ThemeMode = 'light' | 'dark';
export const THEME_PRESET_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

export function themeToMode(theme: ThemeId): ThemeMode {
  return theme.startsWith('light') ? 'light' : 'dark';
}

export function themeToPresetNum(theme: ThemeId): number {
  const n = parseInt(theme.replace(/^light|^dark/, ''), 10);
  return n >= 1 && n <= 15 ? n : 1;
}

export function modeAndPresetToTheme(mode: ThemeMode, preset: number): ThemeId {
  const p = preset >= 1 && preset <= 15 ? preset : 1;
  return (mode === 'light' ? `light${p}` : `dark${p}`) as ThemeId;
}

export interface ViewSettings {
  lang: Lang;
  theme: ThemeId;
  /** 静默模式：浮窗按钮默认全透明，指针移入判定区域时渐变显示 */
  silentMode: boolean;
  rankDir: 'LR' | 'TB';
  fontFamily: string;
  fontSize: number;
  nodeWidth: number;
  nodeHeight: number;
  nodeGap: number;
  rankGap: number;
  sidebarWidth: number;
  /** 详情/数据浮窗高度（0=自动，由 max-height 约束） */
  sidebarHeight: number;
  /** 设置浮窗宽度，支持右侧拖拽拉伸 */
  viewMenuWidth: number;
  /** 设置浮窗高度（0=自动） */
  viewMenuHeight: number;
  /** 数据面板宽度（0=自动，调节左右时保持居中） */
  dataPanelWidth: number;
  /** 数据面板高度（0=自动） */
  dataPanelHeight: number;
  sidebarOpen: boolean;
  edgeWidth: number;
  nodeStrokeWidth: number;
  /** 节点圆角（算子节点；张量节点取 min(本值, 高/2)） */
  nodeCornerRadius: number;
  /** 边弧度 0=直线，>0 为二次贝塞尔弯曲程度 */
  edgeCurvature: number;
  edgeLabelShowShape: boolean;
  /** 节点上是否显示属性（Netron 风格：上半名字、下半属性） */
  nodeLabelShowAttrs: boolean;
  /** 显示权重节点 */
  showWeightNodes: boolean;
  /** 显示IO节点（输入输出节点） */
  showIONodes: boolean;
  /** 节点名字粗体 */
  nodeNameBold: boolean;
  /** 节点名字斜体 */
  nodeNameItalic: boolean;
  /** 属性文字粗体 */
  nodeAttrBold: boolean;
  /** 属性文字斜体 */
  nodeAttrItalic: boolean;
  /** 图阴影 */
  nodeShadowBlur: number;
  bg: string;
  bgTarget: string;
  bgSidebar: string;
  border: string;
  text: string;
  text2: string;
  accent: string;
  toolbarBg: string;
  toolbarHover: string;
  toolbarText: string;
  nodeFill: string;
  nodeStroke: string;
  nodeTextColor: string;
  /** 点显属性区域背景（节点下半块） */
  nodeAttrFill: string;
  tensorFill: string;
  tensorStroke: string;
  edgeStroke: string;
  operatorPalette: string[];
  tensorRoleColors: string[];
  /** 数据面板是否打开（底部横幅） */
  dataPanelOpen: boolean;
  /** 表格中未选中的列（主键 index/id 必选，不可取消） */
  dataPanelHiddenColumns: string[];
  /** 画布视图模式：计算图 | 柱状图 | 扇形图 | 折线图 | 散点图 */
  viewMode: 'graph' | 'bar' | 'pie' | 'line' | 'scatter';
  /** 图表 X 轴/分类列（展平 metadata 键） */
  chartXKey: string;
  /** 图表 Y 轴/数值列（可多列，每列一个系列，包含颜色和样式配置） */
  chartYKeys: ChartYColumnConfig[];
  /** 图表：柱状图组内间距（同组柱子之间） */
  chartBarGapInner: number;
  /** 图表：柱状图组外间距（不同组之间） */
  chartBarGapOuter: number;
  /** 图表：柱状图柱子宽度（0表示自适应） */
  chartBarWidth: number;
  /** 图表：折线/描边粗细 */
  chartLineWidth: number;
  /** 图表：散点半径 */
  chartScatterRadius: number;
  /** 图表：轴/数据点标签字号（0=全局×0.8） */
  chartLabelFontSize: number;
  /** 图表：扇形图扇区描边 */
  chartPieStroke: number;
  /** 图表：内边距 */
  chartPadding: number;
  /** 图表：标题（可选） */
  chartTitle: string;
  /** 图表：X 轴标题（可选） */
  chartXTitle: string;
  /** 图表：Y 轴标题（可选） */
  chartYTitle: string;
  /** 图表：标题字号（0=沿用标签字号×1.2） */
  chartTitleFontSize: number;
  /** 图表：轴标题字号（0=沿用标签字号） */
  chartAxisTitleFontSize: number;
  /** 图表：显示坐标轴线 */
  chartShowAxisLine: boolean;
  /** 图表：坐标轴线宽 */
  chartAxisStrokeWidth: number;
  /** 图表：坐标轴样式（全包/半包/无） */
  chartAxisBoxStyle: 'full' | 'half' | 'none';
  /** 图表：坐标轴线样式（实线/虚线/点线/点划线） */
  chartAxisStrokeStyle: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  /** 图表：刻度样式（内全包/内半包/外全包/外半包） */
  chartAxisTickStyle: 'inside-full' | 'inside-half' | 'outside-full' | 'outside-half';
  /** 图表：显示轴刻度标签 */
  chartShowAxisLabels: boolean;
  /** 图表：显示网格线 */
  chartShowGrid: boolean;
  /** 图表：网格线宽 */
  chartGridStrokeWidth: number;
  /** 图表：网格线颜色 */
  chartGridColor: string;
  /** 图表：网格线样式 */
  chartGridStrokeStyle: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  /** 图表：坐标轴颜色 */
  chartAxisColor: string;
  /** 图表：刻度颜色 */
  chartTickColor: string;
  /** 图表：显示图例（多系列时有效） */
  chartShowLegend: boolean;
  /** 图表：图例一行最大列数（0表示自动） */
  chartLegendMaxColumns: number;
  /** 图表：图例位置（上/下/左/右/左上/右上/左下/右下） */
  chartLegendPosition:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';
  /** 图表：图例内外（勾选后在图表内部，未勾选在图表外部） */
  chartLegendInside: boolean;
  /** 图表：图例名称最大长度（0=不限制） */
  chartLegendMaxLength: number;
  /** 图表：图例区域宽（0=自动） */
  chartLegendWidth: number;
  /** 图表：图例区域高（0=自动） */
  chartLegendHeight: number;
  /** 图表：图例 X 偏移（像素） */
  chartLegendOffsetX: number;
  /** 图表：图例 Y 偏移（像素） */
  chartLegendOffsetY: number;
  /** 图表：交换 X/Y 轴（交换X和Y轴的数据映射） */
  chartSwapXY: boolean;
  /** 图表：图例字号（0=沿用标签字号） */
  chartLegendFontSize: number;
  /** 图表：画布宽度（导出与显示） */
  chartWidth: number;
  /** 图表：画布高度 */
  chartHeight: number;
  /** 图表：坐标轴左padding（刻度离左边界距离，百分比0-50） */
  chartAxisPaddingLeft: number;
  /** 图表：坐标轴右padding（刻度离右边界距离，百分比0-50） */
  chartAxisPaddingRight: number;
  /** 图表：坐标轴上padding（刻度离上边界距离，百分比0-50） */
  chartAxisPaddingTop: number;
  /** 图表：坐标轴下padding（刻度离下边界距离，百分比0-50） */
  chartAxisPaddingBottom: number;
  /** 图表：坐标轴刻度线长度（0=不画刻度线） */
  chartAxisTickLength: number;
  /** 图表：轴刻度数值小数位（0=自动） */
  chartAxisLabelDecimals: number;
  /** 图表：导出缩放倍率（1=原始，2=高清） */
  chartExportScale: number;
  /** 图表：网格线数量（水平/竖直各几条，如 4 即 0.25/0.5/0.75/1） */
  chartGridLineCount: number;
  /** 图表：图例项间距 */
  chartLegendItemSpacing: number;
  /** 图表：在柱/点上显示数值 */
  chartShowDataLabels: boolean;
  /** 图表：轴标签最大字符数（0=默认 8） */
  chartLabelMaxLength: number;
  /** 图表：数据标签字号（0=沿用轴标签字号） */
  chartDataLabelFontSize: number;
  /** 图表：数值小数位数（0–6） */
  chartDataLabelDecimals: number;
  /** 图表：柱状图柱圆角 */
  chartBarCornerRadius: number;
  /** 图表：柱状图柱描边宽（0=无） */
  chartBarStrokeWidth: number;
  /** 图表：柱状图最小柱高（像素，0=自动） */
  chartBarMinHeight: number;
  /** 图表：柱状图最小柱宽（0=自动防重叠，>0 可能溢出） */
  chartBarMinWidth: number;
  /** 图表：折线平滑（贝塞尔） */
  chartLineSmooth: boolean;
  /** 图表：折线显示数据点 */
  chartLineShowPoints: boolean;
  /** 图表：折线数据点半径（0=沿用线宽×1.5） */
  chartLinePointRadius: number;
  /** 图表：散点描边宽 */
  chartScatterStrokeWidth: number;
  /** 图表：散点填充不透明度（0–1） */
  chartScatterOpacity: number;
  /** 图表：扇形图内径占比（0=实心，>0 为环形） */
  chartPieInnerRadius: number;
  /** 图表：扇形图标签位置 */
  chartPieLabelPosition: 'outside' | 'inside' | 'none';
  /** 图表：扇形图起始角度（度，0=3 点钟方向） */
  chartPieStartAngle: number;
  /** 图表：扇形图标签最大字数（0=使用通用标签最大字数） */
  chartPieLabelMaxLength: number;
  /** 图表：网格线不透明度（0–1） */
  chartGridOpacity: number;
  /** 图表：图例符号大小 */
  chartLegendSymbolSize: number;
  /** 图表：坐标轴刻度数量（0=自动） */
  chartAxisTickCount: number;
  /** 图表：显示坐标轴刻度线 */
  chartShowAxisTicks: boolean;
  /** 图表：坐标轴标签加粗 */
  chartAxisLabelBold: boolean;
  /** 图表：坐标轴标签斜体 */
  chartAxisLabelItalic: boolean;
  /** 图表：数据标签加粗 */
  chartDataLabelBold: boolean;
  /** 图表：数据标签斜体 */
  chartDataLabelItalic: boolean;
  /** 图表：数据标签位置（上/下/自适应） */
  chartDataLabelPosition: 'top' | 'bottom' | 'auto';
  /** 图表：数据标签 X 偏移（像素） */
  chartDataLabelOffsetX: number;
  /** 图表：数据标签 Y 偏移（像素） */
  chartDataLabelOffsetY: number;
  /** 图表：图例文字加粗 */
  chartLegendBold: boolean;
  /** 图表：图例文字斜体 */
  chartLegendItalic: boolean;
  /** 图表：系列可见性（系列名称 -> 是否可见） */
  chartSeriesVisibility: Record<string, boolean>;
  /** 导出：文件格式 */
  exportFormat: 'svg' | 'png' | 'jpg' | 'webp' | 'pdf';
  /** 导出：位图DPI（100-600，PNG/JPG格式有效，影响分辨率，默认300） */
  exportImageDpi: number;
  /** 导出：JPG/WebP质量（0-100，仅JPG/WebP格式有效，默认95） */
  exportImageQuality: number;
  /** 导出：背景色类型（'white' | 'none' | 'custom'，类似MATLAB的BackgroundColor） */
  exportBackgroundColor: 'white' | 'none' | 'custom';
  /** 导出：自定义背景色（当exportBackgroundColor为'custom'时使用） */
  exportBackgroundColorValue: string;
  /** 导出：宽度（像素，0=使用图表/画布宽度，类似MATLAB的Width） */
  exportWidth: number;
  /** 导出：高度（像素，0=使用图表/画布高度，类似MATLAB的Height） */
  exportHeight: number;
  /** 导出：边距（像素，类似MATLAB的Padding，默认0） */
  exportPadding: number;
}

const defaults: ViewSettings = {
  lang: 'zh',
  theme: 'light1',
  silentMode: false,
  rankDir: 'LR',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, sans-serif',
  fontSize: 18,
  nodeWidth: 100,
  nodeHeight: 44,
  nodeGap: 60,
  rankGap: 60,
  sidebarWidth: 320,
  sidebarHeight: 0,
  viewMenuWidth: 280,
  viewMenuHeight: 0,
  dataPanelWidth: 0,
  dataPanelHeight: 0,
  sidebarOpen: false,
  dataPanelOpen: false,
  dataPanelHiddenColumns: [],
  viewMode: 'graph',
  chartXKey: '',
  chartYKeys: [],
  chartBarGapInner: 0,
  chartBarGapOuter: 8,
  chartBarWidth: 0,
  chartLineWidth: 2,
  chartScatterRadius: 5,
  chartLabelFontSize: 0,
  chartPieStroke: 1,
  chartPadding: 10,
  chartTitle: '',
  chartXTitle: '',
  chartYTitle: '',
  chartTitleFontSize: 0,
  chartAxisTitleFontSize: 0,
  chartShowAxisLine: true,
  chartAxisStrokeWidth: 1,
  chartShowAxisLabels: true,
  chartShowGrid: true,
  chartGridStrokeWidth: 0.5,
  chartGridColor: '',
  chartGridStrokeStyle: 'dashed',
  chartAxisColor: '',
  chartTickColor: '',
  chartShowLegend: true,
  chartLegendMaxColumns: 0,
  chartLegendPosition: 'top-right',
  chartLegendInside: true,
  chartLegendMaxLength: 12,
  chartLegendWidth: 0,
  chartLegendHeight: 0,
  chartLegendOffsetX: 0,
  chartLegendOffsetY: 0,
  chartSwapXY: false,
  chartLegendFontSize: 0,
  chartAxisBoxStyle: 'full',
  chartAxisStrokeStyle: 'solid',
  chartAxisTickStyle: 'outside-half',
  chartWidth: 720,
  chartHeight: 480,
  chartAxisPaddingLeft: 20,
  chartAxisPaddingRight: 20,
  chartAxisPaddingTop: 10,
  chartAxisPaddingBottom: 10,
  chartAxisTickLength: 0,
  chartAxisLabelDecimals: 0,
  chartExportScale: 2,
  chartGridLineCount: 4,
  chartLegendItemSpacing: 8,
  chartShowDataLabels: false,
  chartLabelMaxLength: 0,
  chartDataLabelFontSize: 0,
  chartDataLabelDecimals: 2,
  chartBarCornerRadius: 0,
  chartBarStrokeWidth: 0,
  chartBarMinHeight: 0,
  chartBarMinWidth: 0,
  chartLineSmooth: false,
  chartLineShowPoints: true,
  chartLinePointRadius: 0,
  chartScatterStrokeWidth: 1,
  chartScatterOpacity: 0.85,
  chartPieInnerRadius: 0,
  chartPieLabelPosition: 'outside',
  chartPieStartAngle: 0,
  chartPieLabelMaxLength: 0,
  chartGridOpacity: 0.3,
  chartLegendSymbolSize: 10,
  chartAxisTickCount: 0,
  chartShowAxisTicks: false,
  chartAxisLabelBold: false,
  chartAxisLabelItalic: false,
  chartDataLabelBold: false,
  chartDataLabelItalic: false,
  chartDataLabelPosition: 'top',
  chartDataLabelOffsetX: 0,
  chartDataLabelOffsetY: 0,
  chartLegendBold: false,
  chartLegendItalic: false,
  chartSeriesVisibility: {},
  exportFormat: 'svg',
  exportImageDpi: 300,
  exportImageQuality: 95,
  exportBackgroundColor: 'white',
  exportBackgroundColorValue: '#ffffff',
  exportWidth: 0,
  exportHeight: 0,
  exportPadding: 0,
  edgeWidth: 1,
  nodeStrokeWidth: 1,
  edgeLabelShowShape: true,
  nodeLabelShowAttrs: false,
  showWeightNodes: false,
  showIONodes: true,
  nodeNameBold: false,
  nodeNameItalic: false,
  nodeAttrBold: false,
  nodeAttrItalic: false,
  nodeShadowBlur: 0,
  ...PRESETS.light1,
};

function getFullPreset(theme: ThemeId): FullPreset {
  return { ...PRESETS[theme] };
}

export const useSettingsStore = create<
  ViewSettings & {
    set: (p: Partial<ViewSettings>) => void;
    applyPreset: (theme: ThemeId) => void;
  }
>()(
  persist(
    (setState) => ({
      ...defaults,
      set: (patch) => setState((s) => ({ ...s, ...patch })),
      applyPreset: (theme) => setState((s) => ({ ...s, theme, ...getFullPreset(theme) })),
    }),
    {
      name: 'xovis-settings',
      partialize: (s) =>
        Object.fromEntries(
          Object.entries(s).filter(
            ([k]) => k !== 'set' && k !== 'applyPreset' && k !== 'dataPanelOpen'
          )
        ) as Omit<ViewSettings, 'set' | 'applyPreset'>,
      migrate: (state: unknown) => {
        const s = state as { theme?: string; tensorShadowBlur?: number } & Partial<ViewSettings>;
        const raw: string = s?.theme ?? '';
        let theme: ThemeId;
        if (THEME_IDS.includes(raw as ThemeId)) theme = raw as ThemeId;
        else if (raw === 'dark') theme = 'dark1';
        else if (raw.startsWith('light')) {
          const n = parseInt(raw.slice(5), 10);
          theme = (n >= 1 && n <= 15 ? `light${n}` : 'light15') as ThemeId;
        } else if (raw.startsWith('dark')) {
          const n = parseInt(raw.slice(4), 10);
          theme = (n >= 1 && n <= 15 ? `dark${n}` : 'dark15') as ThemeId;
        } else theme = 'light1';
        const rest = { ...s };
        delete (rest as Record<string, unknown>).tensorShadowBlur;
        const out = { ...rest, theme } as ViewSettings;
        if (out.nodeCornerRadius == null) out.nodeCornerRadius = PRESETS[theme].nodeCornerRadius;
        if (out.edgeCurvature == null) out.edgeCurvature = PRESETS[theme].edgeCurvature;
        if (out.nodeAttrFill == null) out.nodeAttrFill = PRESETS[theme].nodeAttrFill;
        if (out.tensorRoleColors && out.tensorRoleColors.length === 3)
          out.tensorRoleColors = [...out.tensorRoleColors, PRESETS[theme].tensorRoleColors[3]];
        if (out.nodeNameBold == null) out.nodeNameBold = false;
        if (out.nodeNameItalic == null) out.nodeNameItalic = false;
        if (out.nodeAttrBold == null) out.nodeAttrBold = false;
        if (out.nodeAttrItalic == null) out.nodeAttrItalic = false;
        if (out.silentMode == null) out.silentMode = false;
        if (out.viewMenuWidth == null) out.viewMenuWidth = 280;
        if (out.viewMenuHeight == null) out.viewMenuHeight = 0;
        if (out.dataPanelWidth == null) out.dataPanelWidth = 0;
        if (out.dataPanelHeight == null) out.dataPanelHeight = 0;
        if (out.sidebarHeight == null) out.sidebarHeight = 0;
        if (out.dataPanelOpen == null) out.dataPanelOpen = false;
        if (out.dataPanelHiddenColumns == null) out.dataPanelHiddenColumns = [];
        if (out.viewMode == null) out.viewMode = 'graph';
        if (out.chartXKey == null) out.chartXKey = '';
        if (out.chartYKeys == null) {
          const legacy = s as { chartYKey?: string; chartSeriesKey?: string };
          out.chartYKeys = legacy.chartYKey ? [{ key: legacy.chartYKey }] : [];
        }
        delete (out as unknown as Record<string, unknown>).chartYKey;
        delete (out as unknown as Record<string, unknown>).chartSeriesKey;
        if (out.chartBarGapInner == null)
          out.chartBarGapInner = (out as { chartBarGap?: number }).chartBarGap ?? 0;
        if (out.chartBarGapOuter == null)
          out.chartBarGapOuter = (out as { chartBarGap?: number }).chartBarGap ?? 8;
        if (out.chartBarWidth == null) out.chartBarWidth = 0;
        if (out.chartLineWidth == null) out.chartLineWidth = 2;
        if (out.chartScatterRadius == null) out.chartScatterRadius = 5;
        if (out.chartLabelFontSize == null) out.chartLabelFontSize = 0;
        if (out.chartPieStroke == null) out.chartPieStroke = 1;
        if (out.chartPadding == null) out.chartPadding = 10;
        if (out.chartTitle == null) out.chartTitle = '';
        if (out.chartXTitle == null) out.chartXTitle = '';
        if (out.chartYTitle == null) out.chartYTitle = '';
        if (out.chartTitleFontSize == null) out.chartTitleFontSize = 0;
        if (out.chartAxisTitleFontSize == null) out.chartAxisTitleFontSize = 0;
        if (out.chartShowAxisLine == null) out.chartShowAxisLine = true;
        if (out.chartAxisStrokeWidth == null) out.chartAxisStrokeWidth = 1;
        if (out.chartShowAxisLabels == null) out.chartShowAxisLabels = true;
        if (out.chartShowGrid == null) out.chartShowGrid = true;
        if (out.chartGridStrokeWidth == null) out.chartGridStrokeWidth = 0.5;
        if (out.chartGridColor == null) out.chartGridColor = '';
        if (out.chartGridStrokeStyle == null) out.chartGridStrokeStyle = 'dashed';
        if (out.chartAxisColor == null) out.chartAxisColor = '';
        if (out.chartTickColor == null) out.chartTickColor = '';
        if (out.chartShowLegend == null) out.chartShowLegend = true;
        if (out.chartLegendMaxColumns == null) out.chartLegendMaxColumns = 0;
        if (out.chartLegendPosition == null) out.chartLegendPosition = 'top-right';
        if (out.chartLegendInside == null) out.chartLegendInside = true;
        if (out.chartLegendMaxLength == null) out.chartLegendMaxLength = 12;
        // 迁移旧数据：如果 chartLegendPosition 是 'inside'（旧版本的值），转换为新格式
        if ((out.chartLegendPosition as unknown) === 'inside') {
          out.chartLegendPosition = 'top';
          out.chartLegendInside = true;
        }
        if (out.chartLegendWidth == null) out.chartLegendWidth = 0;
        if (out.chartLegendHeight == null) out.chartLegendHeight = 0;
        if (out.chartLegendOffsetX == null) out.chartLegendOffsetX = 0;
        if (out.chartLegendOffsetY == null) out.chartLegendOffsetY = 0;
        if (out.chartSwapXY == null) out.chartSwapXY = false;
        if (out.chartLegendFontSize == null) out.chartLegendFontSize = 0;
        if (out.chartAxisBoxStyle == null) out.chartAxisBoxStyle = 'full';
        if (out.chartAxisStrokeStyle == null) out.chartAxisStrokeStyle = 'solid';
        if (out.chartAxisTickStyle == null) out.chartAxisTickStyle = 'outside-half';
        if (out.chartWidth == null) out.chartWidth = 720;
        if (out.chartHeight == null) out.chartHeight = 480;
        if (out.chartAxisPaddingLeft == null) out.chartAxisPaddingLeft = 20;
        if (out.chartAxisPaddingRight == null) out.chartAxisPaddingRight = 20;
        if (out.chartAxisPaddingTop == null) out.chartAxisPaddingTop = 10;
        if (out.chartAxisPaddingBottom == null) out.chartAxisPaddingBottom = 10;
        if (out.chartAxisTickLength == null) out.chartAxisTickLength = 0;
        if (out.chartAxisLabelDecimals == null) out.chartAxisLabelDecimals = 0;
        if (out.chartExportScale == null) out.chartExportScale = 2;
        if (out.chartGridLineCount == null) out.chartGridLineCount = 4;
        if (out.chartLegendItemSpacing == null) out.chartLegendItemSpacing = 8;
        if (out.chartShowDataLabels == null) out.chartShowDataLabels = false;
        if (out.chartLabelMaxLength == null) out.chartLabelMaxLength = 0;
        if (out.chartDataLabelFontSize == null) out.chartDataLabelFontSize = 0;
        if (out.chartDataLabelDecimals == null) out.chartDataLabelDecimals = 2;
        if (out.chartBarCornerRadius == null) out.chartBarCornerRadius = 0;
        if (out.chartBarStrokeWidth == null) out.chartBarStrokeWidth = 0;
        if (out.chartBarMinHeight == null) out.chartBarMinHeight = 0;
        if (out.chartBarMinWidth == null) out.chartBarMinWidth = 0;
        if (out.chartLineSmooth == null) out.chartLineSmooth = false;
        if (out.chartLineShowPoints == null) out.chartLineShowPoints = true;
        if (out.chartLinePointRadius == null) out.chartLinePointRadius = 0;
        if (out.chartScatterStrokeWidth == null) out.chartScatterStrokeWidth = 1;
        if (out.chartScatterOpacity == null) out.chartScatterOpacity = 0.85;
        if (out.chartPieInnerRadius == null) out.chartPieInnerRadius = 0;
        if (out.chartPieLabelPosition == null) out.chartPieLabelPosition = 'outside';
        if (out.chartPieStartAngle == null) out.chartPieStartAngle = 0;
        if (out.chartPieLabelMaxLength == null) out.chartPieLabelMaxLength = 0;
        if (out.chartGridOpacity == null) out.chartGridOpacity = 0.3;
        if (out.chartLegendSymbolSize == null) out.chartLegendSymbolSize = 10;
        if (out.chartAxisTickCount == null) out.chartAxisTickCount = 0;
        if (out.chartShowAxisTicks == null) out.chartShowAxisTicks = false;
        if (out.chartAxisLabelBold == null) out.chartAxisLabelBold = false;
        if (out.chartAxisLabelItalic == null) out.chartAxisLabelItalic = false;
        if (out.chartDataLabelBold == null) out.chartDataLabelBold = false;
        if (out.chartDataLabelItalic == null) out.chartDataLabelItalic = false;
        if (out.chartDataLabelPosition == null) out.chartDataLabelPosition = 'top';
        if (out.chartDataLabelOffsetX == null) out.chartDataLabelOffsetX = 0;
        if (out.chartDataLabelOffsetY == null) out.chartDataLabelOffsetY = 0;
        if (out.chartLegendBold == null) out.chartLegendBold = false;
        if (out.chartLegendItalic == null) out.chartLegendItalic = false;
        if (out.chartLegendMaxLength == null) out.chartLegendMaxLength = 12;
        if (out.chartSeriesVisibility == null) out.chartSeriesVisibility = {};
        if (out.showWeightNodes == null) out.showWeightNodes = false;
        if (out.showIONodes == null) out.showIONodes = true;
        if (out.exportFormat == null) out.exportFormat = 'svg';
        // 迁移旧的设置到新格式
        const oldSettings = out as {
          exportPngQuality?: number;
          exportPngDpi?: number;
          exportImageQuality?: number;
        };

        // 迁移DPI设置
        if (out.exportImageDpi == null) {
          if (oldSettings.exportPngDpi != null) {
            out.exportImageDpi = oldSettings.exportPngDpi;
          } else {
            out.exportImageDpi = 300;
          }
        }

        // 迁移质量设置
        if (out.exportImageQuality == null) {
          if (oldSettings.exportImageQuality != null) {
            // 如果已经是0-100范围，直接使用
            const oldQ = oldSettings.exportImageQuality;
            out.exportImageQuality = oldQ > 1 ? oldQ : Math.round(oldQ * 100);
          } else if (oldSettings.exportPngQuality != null) {
            // 旧版本使用0-1的质量值，转换为0-100
            out.exportImageQuality = Math.round(oldSettings.exportPngQuality * 100);
          } else {
            out.exportImageQuality = 95;
          }
        }

        // 清理旧字段
        delete oldSettings.exportPngQuality;
        delete oldSettings.exportPngDpi;

        // 迁移背景色设置
        if (out.exportBackgroundColor == null) {
          out.exportBackgroundColor = 'white';
        }
        if (out.exportBackgroundColorValue == null) {
          out.exportBackgroundColorValue = '#ffffff';
        }

        // 迁移导出尺寸和边距设置
        if (out.exportWidth == null) {
          out.exportWidth = 0;
        }
        if (out.exportHeight == null) {
          out.exportHeight = 0;
        }
        if (out.exportPadding == null) {
          out.exportPadding = 0;
        }

        return out;
      },
      version: 21,
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== 'undefined') {
          const root = document.documentElement;
          if (state.theme)
            root.setAttribute('data-theme', state.theme.startsWith('light') ? 'light' : 'dark');
          if (state.silentMode !== undefined)
            root.setAttribute('data-silent', state.silentMode ? 'true' : 'false');
        }
      },
    }
  )
);
