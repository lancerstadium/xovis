import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader, CanvasPanel, Detail, ViewMenu } from './components';
import { DataPanel } from './components/DataPanel';
import type { CanvasPanelHandle } from './components/CanvasPanel';
import { useSettingsStore, useGraphStore } from './stores';
import { getLocale } from './locale';
import './App.css';

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX_RATIO = 0.5;
const SIDEBAR_HEIGHT_MIN = 120;
/** 详情浮窗距视口间距，用于圆角浮窗排布与拖拽计算 */
const DETAIL_CARD_GAP = 12;
/** 上/下按钮行高度（inset 10 + 按钮 28 + 间距 6），浮窗高度需同时扣除上下两段 */
const FLOAT_TRIGGER_ROW = 10 + 28 + 6;
/** 浮窗最大高度 = 视口 - 上边距 - 间距 - 下边距 */
const floatPanelMaxHeight = () =>
  typeof window !== 'undefined'
    ? window.innerHeight - FLOAT_TRIGGER_ROW - DETAIL_CARD_GAP - FLOAT_TRIGGER_ROW
    : 400;

const CSS_COLOR_KEYS = [
  'bg',
  'bgTarget',
  'bgSidebar',
  'border',
  'text',
  'text2',
  'accent',
  'toolbarBg',
  'toolbarHover',
  'toolbarText',
  'nodeFill',
  'nodeStroke',
  'nodeTextColor',
  'nodeAttrFill',
  'tensorFill',
  'tensorStroke',
  'edgeStroke',
] as const;
const CSS_VAR_MAP: Record<string, string> = {
  bg: '--bg',
  bgTarget: '--bg-target',
  bgSidebar: '--bg-sidebar',
  border: '--border',
  text: '--text',
  text2: '--text2',
  accent: '--accent',
  toolbarBg: '--toolbar-bg',
  toolbarHover: '--toolbar-hover',
  toolbarText: '--toolbar-text',
  nodeFill: '--node-fill',
  nodeStroke: '--node-stroke',
  nodeTextColor: '--node-text',
  nodeAttrFill: '--node-attr-fill',
  tensorFill: '--tensor-fill',
  tensorStroke: '--tensor-stroke',
  edgeStroke: '--edge-stroke',
};

export default function App() {
  const s = useSettingsStore();
  const { theme, lang, sidebarWidth, sidebarHeight, sidebarOpen, dataPanelOpen, set } = s;
  const { graph, selected } = useGraphStore();
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewTriggerRef = useRef<HTMLButtonElement>(null);
  const canvasPanelRef = useRef<CanvasPanelHandle | null>(null);
  const detailWrapRef = useRef<HTMLDivElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const dataPanelWrapRef = useRef<HTMLDivElement>(null);
  const dataTriggerRef = useRef<HTMLDivElement>(null);
  const [resizeAxis, setResizeAxis] = useState<'width' | 'height' | null>(null);
  const t = getLocale(lang);

  /** 浮窗统一：点击空白关闭（详情、数据、设置均用点击外部逻辑，排除面板 + 触发按钮） */
  const closeDetail = useCallback(() => set({ sidebarOpen: false }), [set]);
  const closeDataPanel = useCallback(() => set({ dataPanelOpen: false }), [set]);

  // 点击外部关闭详情（原 useClickOutside）
  useEffect(() => {
    if (!sidebarOpen) return;
    const fn = (e: MouseEvent) => {
      const target = e.target as Node;
      if (detailWrapRef.current?.contains(target) || detailTriggerRef.current?.contains(target))
        return;
      closeDetail();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [sidebarOpen, closeDetail]);

  // 点击外部关闭数据面板（原 useClickOutside）
  useEffect(() => {
    if (!dataPanelOpen) return;
    const fn = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dataPanelWrapRef.current?.contains(target) || dataTriggerRef.current?.contains(target))
        return;
      closeDataPanel();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [dataPanelOpen, closeDataPanel]);

  useEffect(() => {
    const mode = theme.startsWith('light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-silent', s.silentMode ? 'true' : 'false');
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      const basePath = (import.meta as any).env?.BASE_URL || '/';
      link.href = mode === 'dark' ? `${basePath}favicon-dark.svg` : `${basePath}favicon.svg`;
    }
  }, [theme, s.silentMode]);

  useEffect(() => {
    document.title = t.appTitle;
  }, [t.appTitle]);

  useEffect(() => {
    const root = document.documentElement.style;
    CSS_COLOR_KEYS.forEach((k) => {
      const v = s[k];
      if (v && CSS_VAR_MAP[k]) root.setProperty(CSS_VAR_MAP[k], v.startsWith('#') ? v : `#${v}`);
    });
  }, [s]);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--float-trigger-row', `${FLOAT_TRIGGER_ROW}px`);
    root.setProperty('--float-trigger-row-bottom', `${FLOAT_TRIGGER_ROW}px`);
    root.setProperty('--float-panel-gap', `${DETAIL_CARD_GAP}px`);
    root.setProperty(
      '--float-panel-max-height',
      'calc(100vh - var(--float-trigger-row) - var(--float-panel-gap) - var(--float-trigger-row-bottom))'
    );
  }, []);

  /** 详情浮窗宽度：靠右时拖左缘，宽度 = 右缘 - 鼠标 X */
  const handleResizeWidth = useCallback(
    (e: MouseEvent) => {
      const rightEdge = window.innerWidth - DETAIL_CARD_GAP;
      const w = rightEdge - e.clientX;
      const maxW = Math.min(
        window.innerWidth - DETAIL_CARD_GAP * 2,
        window.innerWidth * SIDEBAR_MAX_RATIO
      );
      set({ sidebarWidth: Math.max(SIDEBAR_MIN, Math.min(maxW, w)) });
    },
    [set]
  );

  const handleResizeHeight = useCallback(
    (e: MouseEvent) => {
      const wrap = detailWrapRef.current;
      if (!wrap) return;
      const top = wrap.getBoundingClientRect().top;
      const h = Math.round(e.clientY - top);
      set({
        sidebarHeight: Math.max(SIDEBAR_HEIGHT_MIN, Math.min(floatPanelMaxHeight(), h)),
      });
    },
    [set]
  );

  useEffect(() => {
    if (!resizeAxis) return;
    const onMove = (e: MouseEvent) =>
      resizeAxis === 'width' ? handleResizeWidth(e) : handleResizeHeight(e);
    const onUp = () => {
      setResizeAxis(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = resizeAxis === 'width' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizeAxis, handleResizeWidth, handleResizeHeight]);

  /* 有选中时自动打开详情；点击空白取消选中时关闭详情，仅无选中且点右上角按钮时才展示图信息 */
  useEffect(() => {
    set({ sidebarOpen: !!selected });
  }, [selected, set]);

  return (
    <div className="app">
      <main className="main">
        {/* 画布：计算图或图表（与数据面板视图互斥），可导出 SVG */}
        <div className="target target-full">
          <CanvasPanel ref={canvasPanelRef} />
        </div>

        {/* 左下角：导入 + 导出 SVG */}
        <div className="floating-trigger toolbar-bl">
          <Loader />
          {graph && <ExportSvgButton canvasPanelRef={canvasPanelRef} />}
        </div>
        {/* 正下方：数据按钮 */}
        {graph && (
          <div ref={dataTriggerRef} className="floating-trigger toolbar-bc">
            <button
              type="button"
              className="btn icon-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                set({ dataPanelOpen: !dataPanelOpen });
              }}
              title={dataPanelOpen ? t.dataClose : t.dataTitle}
              aria-label={dataPanelOpen ? t.dataClose : t.dataTitle}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
            </button>
          </div>
        )}
        {dataPanelOpen && <DataPanel ref={dataPanelWrapRef} />}
        {graph && (
          <div className="floating-trigger toolbar-right">
            <button
              type="button"
              className="btn icon-btn"
              onClick={() => canvasPanelRef.current?.resetView()}
              aria-label={t.viewReset}
              title={t.viewReset}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        )}

        {/* 左上角：设置浮窗 */}
        <div className="floating-trigger floating-trigger-tl" aria-hidden="true">
          <div style={{ position: 'relative' }}>
            <button
              ref={viewTriggerRef}
              type="button"
              className="btn icon-btn"
              onClick={() => setViewMenuOpen((v) => !v)}
              title={t.navSettings}
              aria-label={t.navSettings}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <ViewMenu
              open={viewMenuOpen}
              onClose={() => setViewMenuOpen(false)}
              anchorRef={viewTriggerRef}
            />
          </div>
        </div>

        {/* 右上角：详情开关（点击空白关闭，由 useClickOutside 统一处理） */}
        <button
          ref={detailTriggerRef}
          type="button"
          className="btn icon-btn floating-trigger floating-trigger-tr"
          onClick={() => set({ sidebarOpen: !sidebarOpen })}
          title={sidebarOpen ? t.detailClose : t.detailTitle}
          aria-label={sidebarOpen ? t.detailClose : t.detailTitle}
        >
          {sidebarOpen ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          )}
        </button>

        {/* 右上角详情浮窗：靠右、左缘与底边可调 */}
        {sidebarOpen && (
          <div
            ref={detailWrapRef}
            className="detail-card-wrap detail-card-wrap-right float-panel-wrap"
            style={{
              left: 'auto',
              right: DETAIL_CARD_GAP,
              width: sidebarWidth,
              ...(sidebarHeight > 0 ? { height: sidebarHeight } : {}),
            }}
          >
            <div className="detail-card-inner">
              <div
                className="float-panel-splitter float-panel-splitter-v"
                role="separator"
                aria-orientation="vertical"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setResizeAxis('width');
                }}
              />
              <aside className="sidebar panel-glass">
                <div className="sidebar-content panel-content">
                  <Detail />
                </div>
              </aside>
            </div>
            <div
              className="float-panel-splitter float-panel-splitter-h"
              role="separator"
              aria-orientation="horizontal"
              onMouseDown={(e) => {
                e.preventDefault();
                setResizeAxis('height');
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

/** 图中用到的 CSS 变量，导出时注入到 SVG 根节点以保证与画面完全一致 */
const GRAPH_CSS_VARS = [
  '--text',
  '--text2',
  '--accent',
  '--edge-stroke',
  '--node-stroke',
  '--node-text',
  '--node-attr-fill',
  '--tensor-fill',
  '--tensor-stroke',
  '--border',
  '--bg',
  '--bg-target',
];

function ExportSvgButton({
  canvasPanelRef,
}: {
  canvasPanelRef: React.RefObject<CanvasPanelHandle | null>;
}) {
  const { graph } = useGraphStore();
  const s = useSettingsStore();
  const {
    lang,
    viewMode,
    chartExportScale,
    chartWidth,
    chartHeight,
    exportFormat,
    exportImageDpi,
    exportImageQuality,
    exportBackgroundColor,
    exportBackgroundColorValue,
    exportWidth,
    exportHeight,
    exportPadding,
  } = s;
  const t = getLocale(lang);

  const onClick = async () => {
    const el = canvasPanelRef.current?.getSvgElement?.() ?? null;
    if (!el) return;
    if (viewMode === 'graph' && !graph) return;

    // 深度克隆SVG，确保包含所有元素
    const svg = el.cloneNode(true) as SVGSVGElement;
    if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // 确定SVG的基础尺寸（类似MATLAB的Width/Height选项）
    let baseWidth: number;
    let baseHeight: number;
    let baseViewBox: string;

    if (viewMode === 'graph') {
      // 计算图：使用viewBox或getBBox获取所有元素的边界
      const originalViewBox = el.getAttribute('viewBox');

      if (originalViewBox) {
        // 使用原始viewBox确保包含所有元素
        const [, , vw, vh] = originalViewBox.split(/\s+/).map(Number);
        baseWidth = vw || 800;
        baseHeight = vh || 520;
        baseViewBox = originalViewBox;
      } else {
        // 如果没有viewBox，使用getBBox计算
        const box = el.getBBox();
        const pad = 20;
        baseWidth = box.width + pad * 2;
        baseHeight = box.height + pad * 2;
        baseViewBox = `${box.x - pad} ${box.y - pad} ${baseWidth} ${baseHeight}`;
      }
    } else {
      // 图表视图：使用设置的宽高，确保包含所有坐标轴、刻度、标签等
      baseWidth = chartWidth || 800;
      baseHeight = chartHeight || 520;
      baseViewBox = `0 0 ${baseWidth} ${baseHeight}`;
    }

    // 应用导出尺寸设置（类似MATLAB的Width/Height，0表示使用默认值）
    const contentWidth = exportWidth > 0 ? exportWidth : baseWidth;
    const contentHeight = exportHeight > 0 ? exportHeight : baseHeight;

    // 应用边距设置（类似MATLAB的Padding）
    const padding = exportPadding || 0;
    const finalWidth = contentWidth + padding * 2;
    const finalHeight = contentHeight + padding * 2;

    // 如果有边距或自定义尺寸，需要调整viewBox
    let finalViewBox = baseViewBox;
    if (padding > 0 || exportWidth > 0 || exportHeight > 0) {
      const viewBoxParts = baseViewBox.split(/\s+/).map(Number);
      const vx = viewBoxParts[0] || 0;
      const vy = viewBoxParts[1] || 0;
      const vw = viewBoxParts[2] || baseWidth;
      const vh = viewBoxParts[3] || baseHeight;

      // 计算缩放比例（如果自定义了尺寸）
      const scaleX = exportWidth > 0 ? contentWidth / vw : 1;
      const scaleY = exportHeight > 0 ? contentHeight / vh : 1;

      // 调整viewBox以包含边距
      finalViewBox = `${vx - padding} ${vy - padding} ${vw * scaleX + padding * 2} ${vh * scaleY + padding * 2}`;
    }

    // 设置SVG的尺寸和viewBox（包含边距和自定义尺寸）
    svg.setAttribute('width', String(finalWidth));
    svg.setAttribute('height', String(finalHeight));
    svg.setAttribute('viewBox', finalViewBox);

    // 设置背景色（类似MATLAB的BackgroundColor选项）
    // 对所有格式都设置，因为位图格式需要从SVG转换
    if (exportBackgroundColor === 'white') {
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const viewBoxParts = finalViewBox.split(/\s+/).map(Number);
      const vx = viewBoxParts[0] || 0;
      const vy = viewBoxParts[1] || 0;
      const vw = viewBoxParts[2] || finalWidth;
      const vh = viewBoxParts[3] || finalHeight;
      bgRect.setAttribute('x', String(vx));
      bgRect.setAttribute('y', String(vy));
      bgRect.setAttribute('width', String(vw));
      bgRect.setAttribute('height', String(vh));
      bgRect.setAttribute('fill', '#ffffff');
      svg.insertBefore(bgRect, svg.firstChild);
    } else if (exportBackgroundColor === 'custom') {
      const bgColor = exportBackgroundColorValue.startsWith('#')
        ? exportBackgroundColorValue
        : `#${exportBackgroundColorValue}`;
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const viewBoxParts = finalViewBox.split(/\s+/).map(Number);
      const vx = viewBoxParts[0] || 0;
      const vy = viewBoxParts[1] || 0;
      const vw = viewBoxParts[2] || finalWidth;
      const vh = viewBoxParts[3] || finalHeight;
      bgRect.setAttribute('x', String(vx));
      bgRect.setAttribute('y', String(vy));
      bgRect.setAttribute('width', String(vw));
      bgRect.setAttribute('height', String(vh));
      bgRect.setAttribute('fill', bgColor);
      svg.insertBefore(bgRect, svg.firstChild);
    }
    // 'none' 表示透明，SVG和PNG/WebP支持透明，JPG不支持（会在Canvas阶段处理）

    // 收集所有CSS变量（包括图表相关的）
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const varStyle = GRAPH_CSS_VARS.map(
      (v) => `${v}:${computed.getPropertyValue(v).trim() || 'inherit'}`
    ).join(';');

    // 注入CSS变量到SVG的style属性
    const existing = svg.getAttribute('style') || '';
    svg.setAttribute('style', [existing, varStyle].filter(Boolean).join(';'));

    // 确保所有文本元素都继承字体设置
    const allTextElements = svg.querySelectorAll('text');
    allTextElements.forEach((textEl) => {
      const computedStyle = window.getComputedStyle(textEl);
      const fontFamily = computedStyle.fontFamily || s.fontFamily;
      const fontSize = computedStyle.fontSize || `${s.fontSize}px`;
      textEl.setAttribute('font-family', fontFamily);
      textEl.setAttribute('font-size', fontSize);
    });

    // 对于PDF导出，需要将CSS变量替换为实际颜色值（svg2pdf.js不支持CSS变量）
    // 同时确保网格线、坐标轴框和刻度线与文字颜色一致
    if (exportFormat === 'pdf') {
      const textColor = computed.getPropertyValue('--text').trim() || '#000000';

      // 创建一个函数来解析CSS变量
      const resolveCssVar = (value: string): string => {
        if (!value) return '';
        // 替换var(--text)和var(--text2)
        value = value.replace(/var\(--text2?\)/g, textColor);
        // 替换其他CSS变量
        const varMatch = value.match(/var\(([^)]+)\)/);
        if (varMatch) {
          const varName = varMatch[1].trim();
          const varValue = computed.getPropertyValue(varName).trim();
          if (varValue) {
            value = value.replace(/var\([^)]+\)/g, varValue);
          }
        }
        return value;
      };

      // 替换所有使用CSS变量的stroke和fill属性
      // 同时处理透明度：如果opacity是1，移除该属性（避免svg2pdf.js处理问题）
      const allElements = svg.querySelectorAll('*');
      allElements.forEach((el) => {
        const element = el as SVGElement;

        // 处理stroke属性
        const stroke = element.getAttribute('stroke');
        if (stroke) {
          const resolvedStroke = resolveCssVar(stroke);
          if (resolvedStroke && resolvedStroke !== stroke) {
            element.setAttribute('stroke', resolvedStroke);
          } else if (stroke.includes('var(')) {
            // 如果仍有未解析的变量，使用文本颜色作为后备
            element.setAttribute('stroke', textColor);
          }
        } else {
          // 对于line元素和没有fill的rect元素（可能是网格线、坐标轴、刻度），如果没有stroke，使用文本颜色
          const tagName = element.tagName.toLowerCase();
          if (
            tagName === 'line' ||
            (tagName === 'rect' && element.getAttribute('fill') === 'none')
          ) {
            element.setAttribute('stroke', textColor);
          }
        }

        // 处理fill属性
        const fill = element.getAttribute('fill');
        if (fill) {
          const resolvedFill = resolveCssVar(fill);
          if (resolvedFill && resolvedFill !== fill) {
            element.setAttribute('fill', resolvedFill);
          } else if (fill.includes('var(')) {
            // 对于文本元素，使用文本颜色
            if (element.tagName.toLowerCase() === 'text') {
              element.setAttribute('fill', textColor);
            }
          }
        }

        // 处理透明度属性：对于PDF导出，只移除opacity=1的属性（避免svg2pdf.js处理问题）
        // 如果用户设置了透明度（< 1），保留它以确保正常导出
        const opacity = element.getAttribute('opacity');
        if (opacity) {
          const opacityVal = parseFloat(opacity);
          if (opacityVal === 1) {
            // 只移除opacity=1（默认值），避免svg2pdf.js处理问题
            element.removeAttribute('opacity');
          } else if (!isNaN(opacityVal) && opacityVal < 1 && opacityVal > 0) {
            // 用户明确设置了透明度，保留它
            element.setAttribute('opacity', String(Math.max(0, Math.min(1, opacityVal))));
          }
        }
        
        // 处理fillOpacity：如果fill是纯色（不是渐变/pattern），且fillOpacity=1，移除它
        // 如果用户设置了fillOpacity < 1，保留它
        const fillOpacity = element.getAttribute('fillOpacity');
        if (fillOpacity) {
          const fillOpacityVal = parseFloat(fillOpacity);
          
          if (fillOpacityVal === 1) {
            // 对于纯色填充，移除fillOpacity=1（避免svg2pdf.js处理问题）
            // 对于渐变/pattern，也移除fillOpacity=1（避免问题）
            element.removeAttribute('fillOpacity');
          } else if (!isNaN(fillOpacityVal) && fillOpacityVal < 1 && fillOpacityVal > 0) {
            // 用户明确设置了透明度，保留它
            element.setAttribute('fillOpacity', String(Math.max(0, Math.min(1, fillOpacityVal))));
          }
        }
        
        // 处理strokeOpacity：如果strokeOpacity=1，移除它；如果用户设置了< 1，保留它
        const strokeOpacity = element.getAttribute('strokeOpacity');
        if (strokeOpacity) {
          const strokeOpacityVal = parseFloat(strokeOpacity);
          if (strokeOpacityVal === 1) {
            element.removeAttribute('strokeOpacity');
          } else if (!isNaN(strokeOpacityVal) && strokeOpacityVal < 1 && strokeOpacityVal > 0) {
            // 用户明确设置了透明度，保留它
            element.setAttribute('strokeOpacity', String(Math.max(0, Math.min(1, strokeOpacityVal))));
          }
        }
        
        // 处理渐变stop中的stopOpacity
        // 如果stopOpacity=1，移除它；如果用户设置了< 1，保留它
        if (element.tagName.toLowerCase() === 'stop') {
          const stopOpacity = element.getAttribute('stopOpacity');
          if (stopOpacity) {
            const stopOpacityVal = parseFloat(stopOpacity);
            if (stopOpacityVal === 1) {
              // 移除stopOpacity=1（避免svg2pdf.js处理问题）
              element.removeAttribute('stopOpacity');
            } else if (!isNaN(stopOpacityVal) && stopOpacityVal < 1 && stopOpacityVal > 0) {
              // 用户明确设置了透明度（如渐变效果），保留它
              element.setAttribute('stopOpacity', String(Math.max(0, Math.min(1, stopOpacityVal))));
            }
          }
        }
      });
    }

    const baseName =
      (viewMode === 'graph' && graph
        ? (graph.name ?? 'graph')
            .split(/[/\\]/)
            .pop()
            ?.replace(/\.[^.]+$/, '')
        : `chart-${viewMode}`) || 'export';

    // SVG格式直接导出
    if (exportFormat === 'svg') {
      const serialized = new XMLSerializer().serializeToString(svg);
      const withDeclaration = `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
      const blob = new Blob([withDeclaration], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const filename = `${baseName}.svg`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }

    // PDF格式：使用svg2pdf.js转换为矢量PDF（PPT可直接插入并可取消组合编辑）
    if (exportFormat === 'pdf') {
      try {
        // 确保SVG尺寸正确（使用最终尺寸，不缩放，因为PDF是矢量）
        svg.setAttribute('width', String(finalWidth));
        svg.setAttribute('height', String(finalHeight));

        // 动态导入PDF相关库
        const { jsPDF } = await import('jspdf');
        await import('svg2pdf.js');

        const mmPerInch = 25.4;
        const dpi = 96; // SVG使用96 DPI作为基准
        const widthMm = (finalWidth / dpi) * mmPerInch;
        const heightMm = (finalHeight / dpi) * mmPerInch;

        const pdf = new jsPDF({
          orientation: widthMm > heightMm ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [widthMm, heightMm],
        });

        // 使用svg2pdf.js将SVG转换为矢量PDF
        // 注意：SVG必须包含所有内联样式（我们已经做了）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfWithSvg = pdf as any;
        if (typeof pdfWithSvg.svg === 'function') {
          await pdfWithSvg.svg(svg, {
            x: 0,
            y: 0,
            width: widthMm,
            height: heightMm,
          });
        } else {
          throw new Error('svg2pdf.js not loaded correctly');
        }

        pdf.save(`${baseName}.pdf`);
        return;
      } catch (error) {
        console.error('PDF export failed:', error);
        // 如果矢量导出失败，回退到位图方式
        try {
          console.warn('Vector PDF export failed, falling back to rasterized PDF');
          // 使用Canvas渲染作为后备方案
          const baseWidth = finalWidth;
          const baseHeight = finalHeight;
          const pdfDpi = 300;
          const dpiScale = pdfDpi / 96;
          const scaledWidth = Math.round(baseWidth * dpiScale);
          const scaledHeight = Math.round(baseHeight * dpiScale);

          svg.setAttribute('width', String(scaledWidth));
          svg.setAttribute('height', String(scaledHeight));

          const svgData = new XMLSerializer().serializeToString(svg);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);

          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = svgUrl;
          });

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(svgUrl);
            return;
          }

          canvas.width = scaledWidth;
          canvas.height = scaledHeight;

          if (exportBackgroundColor === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, scaledWidth, scaledHeight);
          } else if (exportBackgroundColor === 'custom') {
            const bgColor = exportBackgroundColorValue.startsWith('#')
              ? exportBackgroundColorValue
              : `#${exportBackgroundColorValue}`;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, scaledWidth, scaledHeight);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
          URL.revokeObjectURL(svgUrl);

          const { jsPDF } = await import('jspdf');
          const mmPerInch = 25.4;
          const widthMm = (scaledWidth / pdfDpi) * mmPerInch;
          const heightMm = (scaledHeight / pdfDpi) * mmPerInch;

          const pdf = new jsPDF({
            orientation: widthMm > heightMm ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [widthMm, heightMm],
          });

          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
          pdf.save(`${baseName}.pdf`);
        } catch (fallbackError) {
          console.error('Fallback PDF export also failed:', fallbackError);
          alert('PDF导出失败，请尝试其他格式');
        }
        return;
      }
    }

    // PNG/JPG/WebP格式：需要转换为Canvas
    try {
      // 使用SVG的实际尺寸（已包含边距）
      const baseWidth = finalWidth;
      const baseHeight = finalHeight;

      // 计算DPI缩放比例（默认浏览器DPI为96，用户设置的DPI相对于96）
      // PNG和JPG支持DPI设置，WebP使用chartExportScale
      const dpiScale =
        exportFormat === 'png' || exportFormat === 'jpg'
          ? Math.max(100, Math.min(600, exportImageDpi || 300)) / 96
          : chartExportScale >= 1 && chartExportScale <= 4
            ? chartExportScale
            : 1;

      // 计算最终尺寸（考虑DPI和缩放）
      const scaledWidth = Math.round(baseWidth * dpiScale);
      const scaledHeight = Math.round(baseHeight * dpiScale);

      // 更新SVG尺寸以匹配最终导出尺寸
      svg.setAttribute('width', String(scaledWidth));
      svg.setAttribute('height', String(scaledHeight));
      // 保持viewBox不变，让SVG内容自动缩放

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        return;
      }

      // 设置canvas尺寸（使用计算后的最终尺寸，已包含DPI缩放）
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // 绘制背景色（类似MATLAB的BackgroundColor选项）
      // 注意：JPG不支持透明，如果选择'none'则使用白色
      if (
        exportBackgroundColor === 'white' ||
        (exportBackgroundColor === 'none' && exportFormat === 'jpg')
      ) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
      } else if (exportBackgroundColor === 'custom') {
        const bgColor = exportBackgroundColorValue.startsWith('#')
          ? exportBackgroundColorValue
          : `#${exportBackgroundColorValue}`;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
      }
      // 'none' + PNG/WebP：保持透明（不绘制背景）

      // 绘制图片到canvas（使用高质量渲染）
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
      URL.revokeObjectURL(svgUrl);

      // 导出为指定格式
      const mimeType =
        exportFormat === 'png'
          ? 'image/png'
          : exportFormat === 'jpg'
            ? 'image/jpeg'
            : exportFormat === 'webp'
              ? 'image/webp'
              : 'image/png';

      // 质量参数（PNG不支持质量参数；JPEG和WebP支持，范围0-1，需要将0-100转换为0-1）
      const quality =
        exportFormat === 'png'
          ? undefined
          : Math.max(0, Math.min(1, (exportImageQuality || 95) / 100));

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const ext = exportFormat === 'jpg' ? 'jpg' : exportFormat;
          const filename = `${baseName}.${ext}`;
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.rel = 'noopener';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        },
        mimeType,
        quality
      );
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 根据格式获取按钮标题
  const getExportTitle = () => {
    const formatLabels: Record<string, string> = {
      svg: t.settingsExportFormatSvg,
      png: t.settingsExportFormatPng,
      jpg: t.settingsExportFormatJpg,
      webp: t.settingsExportFormatWebp,
    };
    const formatLabel = formatLabels[exportFormat] || t.settingsExportFormatSvg;
    return `${t.exportImage} ${formatLabel.toUpperCase()}`;
  };

  return (
    <button
      type="button"
      className="btn icon-btn"
      onClick={onClick}
      title={getExportTitle()}
      aria-label={getExportTitle()}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}
