import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import dagre from '@dagrejs/dagre';
import { type Graph, type GraphNode, type GraphEdge, type Tensor } from '@xovis/core';
import { useGraphStore, useSettingsStore, useElectronTabsStore } from '../stores';
import { getLocale } from '../locale';
import { loadFile, isSupportedFile } from '../utils/loadFile';
import { getOperatorRows } from '../utils/operatorRows';
import {
  getTouchDistance,
  getPinchCenter,
  computePinchZoomPan,
  computeWheelZoomPan,
} from '../utils/panZoom';

/** 解析 hex 颜色为 r,g,b (0-255) */
function parseHex(hex: string): [number, number, number] {
  const m = hex.replace(/^#/, '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  return [0, 0, 0];
}

/** 线性插值两个 hex 颜色，t in [0,1] */
function lerpHex(hexStart: string, hexEnd: string, t: number): string {
  const [r1, g1, b1] = parseHex(hexStart);
  const [r2, g2, b2] = parseHex(hexEnd);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${[r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('')}`;
}

/** 算子节点只显示重要属性（常见 Conv/Pool 等） */
const OP_ATTR_ORDER = [
  'kernel_shape',
  'strides',
  'pads',
  'dilations',
  'group',
  'axis',
  'epsilon',
] as const;

/** 节点是否有可展示属性（有则放大+两段式，无则保持原尺寸纯色） */
function nodeHasAttrs(node: GraphNode, tensor: Tensor | null): boolean {
  if (tensor) return !!(tensor.shape?.length || tensor.dtype);
  const attrs = node.attributes ?? {};
  return OP_ATTR_ORDER.some((k) => attrs[k] !== undefined && attrs[k] !== null);
}

function nodeAttrsLines(node: GraphNode, tensor: Tensor | null): string[] {
  const formatVal = (v: unknown): string =>
    Array.isArray(v) ? `[${v.join(',')}]` : String(v ?? '');
  if (tensor) {
    const lines: string[] = [];
    if (tensor.shape?.length) lines.push(`[${tensor.shape.join(',')}]`);
    if (tensor.dtype) lines.push(tensor.dtype);
    return lines;
  }
  const attrs = node.attributes ?? {};
  const entries = OP_ATTR_ORDER.filter((k) => attrs[k] !== undefined && attrs[k] !== null)
    .slice(0, 6)
    .map((k) => `${k}: ${formatVal(attrs[k])}`);
  if (entries.length === 0) return [];
  return entries;
}

const EDGE_ROUND_RADIUS = 4;

/**
 * 生成边 path d 与标签中点（Netron 风格：折线圆角、两点轻弧、线端圆头）。
 */
function edgePathAndMid(
  points: Array<{ x: number; y: number }>,
  curvature: number
): { d: string; mid: { x: number; y: number } } {
  if (points.length < 2) {
    const p = points[0] ?? { x: 0, y: 0 };
    return { d: '', mid: p };
  }
  const start = points[0];
  const end = points[points.length - 1];

  const sharpPolyline = () => {
    let d = `M ${start.x} ${start.y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    const midIdx = Math.floor(points.length / 2);
    return { d, mid: points[midIdx] ?? end };
  };

  if (curvature <= 0) return sharpPolyline();

  if (points.length > 2) {
    const n = points.length;
    const radius = EDGE_ROUND_RADIUS;
    let d = `M ${start.x} ${start.y}`;
    for (let i = 1; i < n; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1] ?? end;
      const ax = curr.x - prev.x;
      const ay = curr.y - prev.y;
      const len0 = Math.hypot(ax, ay) || 1;
      const u0x = ax / len0;
      const u0y = ay / len0;
      const bx = next.x - curr.x;
      const by = next.y - curr.y;
      const len1 = Math.hypot(bx, by) || 1;
      const u1x = bx / len1;
      const u1y = by / len1;
      const r = Math.min(radius, len0 / 2, len1 / 2);
      d += ` L ${curr.x - r * u0x} ${curr.y - r * u0y} Q ${curr.x} ${curr.y} ${curr.x + r * u1x} ${curr.y + r * u1y}`;
    }
    d += ` L ${end.x} ${end.y}`;
    const midIdx = Math.floor(n / 2);
    return { d, mid: points[midIdx] ?? end };
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const k = Math.max(0, Math.min(1, curvature)) * 0.12;
  const cx = mx + (-dy / len) * len * k;
  const cy = my + (dx / len) * len * k;
  const mid = {
    x: 0.25 * start.x + 0.5 * cx + 0.25 * end.x,
    y: 0.25 * start.y + 0.5 * cy + 0.25 * end.y,
  };
  return { d: `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`, mid };
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
interface LayoutEdge {
  id: string;
  points: Array<{ x: number; y: number }>;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function useLayout(graph: Graph | null, layoutKey: number = 0) {
  const {
    nodeWidth,
    nodeHeight,
    nodeGap,
    rankGap,
    rankDir,
    nodeLabelShowAttrs,
    fontSize,
    showWeightNodes,
    showIONodes,
  } = useSettingsStore();
  const fs = fontSize ?? 12;
  const attrFontSize = Math.max(8, Math.round(fs * 0.78));
  const headRatio = 0.4;
  const charWidthName = fs * 0.62;
  const charWidthAttr = attrFontSize * 0.6;
  const paddingH = 20;
  const paddingAttr = 16;
  return useMemo(() => {
    if (!graph?.nodes?.length) return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[] };
    const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
    g.setGraph({ rankdir: rankDir, nodesep: nodeGap, ranksep: rankGap });
    (g as { setDefaultEdgeLabel: (cb: () => object) => void }).setDefaultEdgeLabel(() => ({}));
    const minHeadH = fs + 10;

    // 过滤节点：根据设置决定是否包含权重节点和IO节点
    const filteredNodes = graph.nodes.filter((n: GraphNode) => {
      const isTensor = n.metadata?.isTensorNode === true;
      if (!isTensor) return true; // 算子节点始终显示
      const tensor = graph.tensors ? graph.tensors[n.metadata?.tensorIndex as number] : null;
      if (!tensor) return true;
      const tensorName = tensor.name;
      // 权重节点
      if (tensorName === 'weight') return showWeightNodes;
      // IO节点（input/output）
      if (tensorName === 'input' || tensorName === 'output') return showIONodes;
      // 其他张量节点（如 activation）始终显示
      return true;
    });

    filteredNodes.forEach((n: GraphNode) => {
      const isTensor = n.metadata?.isTensorNode === true;
      const tensor =
        isTensor && graph.tensors ? graph.tensors[n.metadata?.tensorIndex as number] : null;
      const hasAttrs = nodeLabelShowAttrs && nodeHasAttrs(n, tensor ?? null);
      const wName = Math.max(nodeWidth, n.name.length * charWidthName + paddingH);
      let w = wName;
      let h = nodeHeight;
      if (hasAttrs) {
        const lines = nodeAttrsLines(n, tensor ?? null);
        const maxLineChars = lines.length ? Math.max(...lines.map((l: string) => l.length)) : 0;
        const wAttr = Math.ceil(maxLineChars * charWidthAttr) + paddingAttr;
        w = Math.max(wName, wAttr, nodeWidth);
        const bodyH = lines.length * (attrFontSize + 2) + 12;
        const minHByBody = bodyH / (1 - headRatio);
        const minHByHead = minHeadH / headRatio;
        h = Math.max(minHByBody, minHByHead, nodeHeight * 1.2);
      }
      g.setNode(n.id, { width: w, height: h });
    });

    // 只添加连接可见节点的边
    const visibleNodeIds = new Set(filteredNodes.map((n: GraphNode) => n.id));
    graph.edges?.forEach((e: GraphEdge) => {
      if (visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)) {
        g.setEdge(e.source, e.target, {}, e.id);
      }
    });
    dagre.layout(g);

    const nodes: LayoutNode[] = [];
    g.nodes().forEach((id: string) => {
      const n = g.node(id);
      const w = n?.width ?? nodeWidth;
      const h = n?.height ?? nodeHeight;
      if (n?.x != null && n?.y != null)
        nodes.push({
          id,
          x: n.x - w / 2,
          y: n.y - h / 2,
          width: w,
          height: h,
        });
    });
    const edges: LayoutEdge[] = [];
    g.edges().forEach((e: { v: string; w: string; name?: string }) => {
      const edge = g.edge(e);
      const points = (edge?.points ?? []) as Array<{ x: number; y: number }>;
      edges.push({ id: typeof e.name === 'string' ? e.name : `${e.v}-${e.w}`, points });
    });
    return { nodes, edges };
  }, [
    graph,
    layoutKey,
    nodeWidth,
    nodeHeight,
    nodeGap,
    rankGap,
    rankDir,
    nodeLabelShowAttrs,
    showWeightNodes,
    showIONodes,
    fs,
    attrFontSize,
    charWidthName,
    charWidthAttr,
  ]);
}

export interface GraphViewHandle {
  resetView: () => void;
  getSvgElement: () => SVGSVGElement | null;
}

export const GraphView = forwardRef<GraphViewHandle, object>(function GraphView(_, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const emptyLogoRef = useRef<HTMLSpanElement>(null);
  const { graph, selected, setSelected, setGraph, setGraphLoading, centerOnId, setCenterOnId } =
    useGraphStore();
  const s = useSettingsStore();
  const t = getLocale(s.lang);
  const {
    graphHeatAnalysisEnabled,
    graphHeatTargetKey,
    graphHeatStrokeWidthMultiplier = 1.8,
    chartCorrelationColorStart,
    chartCorrelationColorEnd,
  } = s;
  const [layoutKey, setLayoutKey] = useState(0);
  const graphRef = useRef(graph);
  graphRef.current = graph;
  useEffect(() => {
    if (!graph?.nodes?.length) return;
    setLayoutKey((k) => k + 1);
    let raf2: number | null = null;
    let rafReady: number | null = null;
    const raf1 = requestAnimationFrame(() => {
      setLayoutKey((k) => k + 1);
      // 大图时首帧布局可能仍用默认设置，多一帧延迟再算一次以保证 nodeLabelShowAttrs 等已就绪
      if (graph.nodes.length > 50) {
        raf2 = requestAnimationFrame(() => {
          setLayoutKey((k) => k + 1);
          // 最后一帧布局提交后再等一帧渲染（含属性），再通知加载完毕
          rafReady = requestAnimationFrame(() => {
            if (useGraphStore.getState().graph === graphRef.current) {
              useGraphStore.getState().setGraphLoading(false);
            }
          });
        });
      } else {
        rafReady = requestAnimationFrame(() => {
          if (useGraphStore.getState().graph === graphRef.current) {
            useGraphStore.getState().setGraphLoading(false);
          }
        });
      }
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 != null) cancelAnimationFrame(raf2);
      if (rafReady != null) cancelAnimationFrame(rafReady);
    };
  }, [graph]);
  const { nodes: layoutNodes, edges: layoutEdges } = useLayout(graph, layoutKey);

  /** 热分析：节点 id -> 归一化后的线条颜色（仅算子节点） */
  const nodeHeatColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!graph?.nodes?.length || !graphHeatAnalysisEnabled || !graphHeatTargetKey?.trim())
      return map;
    const rows = getOperatorRows({ nodes: graph.nodes });
    const key = graphHeatTargetKey.trim();
    const values = rows
      .map((r) => ({ id: String(r.id), v: Number(r[key]) }))
      .filter((x) => Number.isFinite(x.v));
    if (values.length === 0) return map;
    const min = Math.min(...values.map((x) => x.v));
    const max = Math.max(...values.map((x) => x.v));
    const span = max - min || 1;
    const start = chartCorrelationColorStart || '#2563eb';
    const end = chartCorrelationColorEnd || '#dc2626';
    values.forEach(({ id, v }) => {
      const t = (v - min) / span;
      map.set(id, lerpHex(start, end, t));
    });
    return map;
  }, [
    graph?.nodes,
    graphHeatAnalysisEnabled,
    graphHeatTargetKey,
    chartCorrelationColorStart,
    chartCorrelationColorEnd,
  ]);

  // 缩放和平移逻辑（与 panZoom 工具统一：滚轮以指针为锚点，pinch 以双指中心为锚点）
  const DRAG_THRESHOLD = 4;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panStart = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const didDrag = useRef(false);
  const panZoomRef = useRef({ pan: { x: 0, y: 0 }, zoom: 1 });
  panZoomRef.current = { pan, zoom };

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const mouseScreen = { x: e.clientX, y: e.clientY };
    const { pan: p, zoom: z } = panZoomRef.current;
    const { zoom: nextZoom, pan: nextPan } = computeWheelZoomPan(z, p, e.deltaY, mouseScreen, containerCenter);
    setZoom(nextZoom);
    setPan(nextPan);
  }, []);

  const pinchRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialCenter: { x: number; y: number };
  } | null>(null);
  const isPinchingRef = useRef(false);
  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && containerRef.current) {
      e.preventDefault();
      isPinchingRef.current = true;
      const { pan: p, zoom: z } = panZoomRef.current;
      pinchRef.current = {
        initialDistance: getTouchDistance(e.touches),
        initialZoom: z,
        initialPan: { ...p },
        initialCenter: getPinchCenter(e.touches),
      };
    }
  }, []);
  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current && containerRef.current) {
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const containerCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const ratio = getTouchDistance(e.touches) / pinchRef.current.initialDistance;
      const { zoom: nextZoom, pan: nextPan } = computePinchZoomPan(
        ratio,
        pinchRef.current.initialZoom,
        pinchRef.current.initialPan,
        pinchRef.current.initialCenter,
        getPinchCenter(e.touches),
        containerCenter
      );
      setZoom(nextZoom);
      setPan(nextPan);
    }
  }, []);
  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
      pinchRef.current = null;
      isPinchingRef.current = false;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || isPinchingRef.current) return;
      didDrag.current = false;
      setIsDragging(true);
      panStart.current = { x: pan.x, y: pan.y, clientX: e.clientX, clientY: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan.x, pan.y]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (isPinchingRef.current || !panStart.current) return;
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
          setGraphLoading(true);
          setGraph(result.graph);
          setDropError(null);
          if (typeof window !== 'undefined' && window.electronAPI && file.name) {
            const aid = useElectronTabsStore.getState().activeId;
            if (aid) {
              useElectronTabsStore.getState().setTabLabel(aid, file.name.replace(/^.*[/\\]/, ''));
            }
          }
          // 如果是CSV文件，自动切换到图表视图
          if (result.source === 'csv' && s.viewMode === 'graph') {
            s.set({ viewMode: 'bar' });
          }
        } else {
          setDropError(result.error);
        }
      } catch (err) {
        setDropError(err instanceof Error ? err.message : t.loadError);
      }
    },
    [setGraph, setGraphLoading, s, t.loadError]
  );

  useImperativeHandle(ref, () => ({ resetView, getSvgElement: () => svgRef.current }), [resetView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !graph) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [graph, onWheel, onTouchStart, onTouchMove, onTouchEnd]);

  useEffect(() => {
    setDropOver(false);
  }, [graph]);

  // 详情搜索点击后居中并放大：任意计算图下聚焦项都占视口同一比例（不因图大而变小）
  const FOCUS_VIEW_FRACTION = 0.35; // 聚焦项在视口短边上的占比（偏小以便看到更多周边）
  const FOCUS_ZOOM_MIN = 0.2;
  const FOCUS_ZOOM_MAX = 80; // 大图时需较大 zoom 才能让单节点占满比例，不压死
  useEffect(() => {
    if (!centerOnId || !containerRef.current || !graph) return;
    let nx = 0;
    let ny = 0;
    let sizeInGraph = 80; // 边的默认“尺寸”（无 bbox 时）
    const node = layoutNodes.find((n: LayoutNode) => n.id === centerOnId);
    if (node) {
      nx = node.x + node.width / 2;
      ny = node.y + node.height / 2;
      sizeInGraph = Math.max(node.width, node.height, 20);
    } else {
      const edge = layoutEdges.find((e: LayoutEdge) => e.id === centerOnId);
      if (edge?.points?.length) {
        const pts = edge.points;
        const mid = pts[Math.floor(pts.length / 2)] ?? pts[0];
        nx = mid.x;
        ny = mid.y;
        let ex0 = pts[0].x,
          ey0 = pts[0].y,
          ex1 = ex0,
          ey1 = ey0;
        pts.forEach((p) => {
          ex0 = Math.min(ex0, p.x);
          ey0 = Math.min(ey0, p.y);
          ex1 = Math.max(ex1, p.x);
          ey1 = Math.max(ey1, p.y);
        });
        sizeInGraph = Math.max(ex1 - ex0, ey1 - ey0, 40);
      } else {
        setCenterOnId(null);
        return;
      }
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    layoutNodes.forEach((n: LayoutNode) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });
    layoutEdges.forEach((e: LayoutEdge) => {
      e.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });
    const pad = 24;
    const vw = Math.max(0, maxX - minX) + pad * 2;
    const vh = Math.max(0, maxY - minY) + pad * 2;
    const vminX = minX - pad;
    const vminY = minY - pad;
    const rect = containerRef.current.getBoundingClientRect();
    const innerW = Math.max(1, rect.width - 16);
    const innerH = Math.max(1, rect.height - 16);
    const scale = Math.min(innerW / vw, innerH / vh) || 1;
    const targetPixels = Math.min(innerW, innerH) * FOCUS_VIEW_FRACTION;
    const zoomRaw = targetPixels / (sizeInGraph * scale) || 1;
    const zoom = Math.max(FOCUS_ZOOM_MIN, Math.min(FOCUS_ZOOM_MAX, zoomRaw));
    // viewBox 中心映射到内层 div 中心；transformOrigin 50% 50% 时 pan 应为 (center - p) * zoom
    const cx = innerW / 2;
    const cy = innerH / 2;
    const px = (nx - vminX - vw / 2) * scale + cx;
    const py = (ny - vminY - vh / 2) * scale + cy;
    setZoom(zoom);
    setPan({ x: (cx - px) * zoom, y: (cy - py) * zoom });
    setCenterOnId(null);
  }, [centerOnId, graph, layoutNodes, layoutEdges, setCenterOnId]);

  useEffect(() => {
    if (graph != null) return;
    const el = emptyLogoRef.current;
    if (!el) return;
    fetch(`${import.meta.env.BASE_URL || '/'}favicon-raw.svg`)
      .then((r) => r.text())
      .then((svg) => {
        const sized = svg.replace(/width="32"\s+height="32"/, 'width="48" height="48"');
        el.innerHTML = sized;
      })
      .catch(() => {});
  }, [graph]);

  const onGraphClick = useCallback(
    (e: React.MouseEvent) => {
      if (didDrag.current) return;
      const tgt = e.target as SVGElement;
      // 只有点击空白区域时才关闭详情窗
      if (tgt === svgRef.current || (tgt.tagName === 'g' && tgt.classList.contains('graphContent')))
        setSelected(null);
    },
    [setSelected]
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    graph?.nodes?.forEach((n: GraphNode) => m.set(n.id, n));
    return m;
  }, [graph]);
  const edgeMap = useMemo(() => {
    const m = new Map<string, GraphEdge>();
    graph?.edges?.forEach((e: GraphEdge) => m.set(e.id, e));
    return m;
  }, [graph]);

  const opColor = useMemo(() => {
    const pal = s.operatorPalette?.length ? s.operatorPalette : ['#ffffff'];
    return (name: string) => pal[hash(name) % pal.length];
  }, [s.operatorPalette]);

  const tensorRoleColors = s.tensorRoleColors ?? [
    s.tensorFill,
    s.tensorFill,
    s.tensorFill,
    s.tensorFill,
  ];
  const tensorColorByRole = (role: string) => {
    if (role === 'input') return tensorRoleColors[0] ?? s.tensorFill;
    if (role === 'output') return tensorRoleColors[1] ?? s.tensorFill;
    if (role === 'weight') return tensorRoleColors[2] ?? s.tensorFill;
    if (role === 'activation') return tensorRoleColors[3] ?? tensorRoleColors[1] ?? s.tensorFill;
    return s.tensorFill;
  };

  const viewBox = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    layoutNodes.forEach((n: LayoutNode) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });
    layoutEdges.forEach((e: LayoutEdge) => {
      e.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });
    const pad = 24;
    const vbW = Math.max(0, maxX - minX) + pad * 2;
    const vbH = Math.max(0, maxY - minY) + pad * 2;
    return layoutNodes.length || layoutEdges.some((e: LayoutEdge) => e.points.length)
      ? `${minX - pad} ${minY - pad} ${vbW} ${vbH}`
      : '0 0 400 200';
  }, [layoutNodes, layoutEdges]);

  const isNodeSelected = (id: string) => selected && 'inputs' in selected && selected.id === id;
  const isEdgeSelected = (id: string) => selected && 'source' in selected && selected.id === id;
  const edgeW = Math.max(0.5, Math.min(4, s.edgeWidth ?? 1));
  const nodeStrokeW = Math.max(0.5, Math.min(3, s.nodeStrokeWidth ?? 1));
  const heatMul = Math.max(0.5, Math.min(3, graphHeatStrokeWidthMultiplier ?? 1.8));
  const heatEdgeW = edgeW * heatMul;
  const heatNodeStrokeW = nodeStrokeW * heatMul;
  const nodeRx = Math.max(0, Math.min(20, s.nodeCornerRadius ?? 4));
  const edgeCurve = Math.max(0, Math.min(1, s.edgeCurvature ?? 0));

  // 过滤节点：根据设置决定是否渲染权重节点和IO节点
  const visibleNodes = useMemo(() => {
    if (!graph?.nodes) return [];
    return graph.nodes.filter((n: GraphNode) => {
      const isTensor = n.metadata?.isTensorNode === true;
      if (!isTensor) return true; // 算子节点始终显示
      const tensor = graph.tensors ? graph.tensors[n.metadata?.tensorIndex as number] : null;
      if (!tensor) return true;
      const tensorName = tensor.name;
      // 权重节点
      if (tensorName === 'weight') return s.showWeightNodes;
      // IO节点（input/output）
      if (tensorName === 'input' || tensorName === 'output') return s.showIONodes;
      // 其他张量节点（如 activation）始终显示
      return true;
    });
  }, [graph, s.showWeightNodes, s.showIONodes]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n: GraphNode) => n.id)),
    [visibleNodes]
  );

  return (
    <>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          boxSizing: 'border-box',
          touchAction: 'none',
          ...panZoomCursor(isDragging),
          ...(!graph && {
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: 'var(--text2)',
            margin: 8,
          }),
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
        {!graph ? (
          <>
            <span
              style={{
                color: 'var(--text2)',
                opacity: 0.6,
                width: 48,
                height: 48,
                display: 'inline-block',
              }}
              ref={emptyLogoRef}
              aria-hidden
            />
            <span style={{ fontWeight: 500, color: 'var(--text2)', opacity: 0.6 }}>
              {dropOver ? t.loadDropHint : t.graphEmpty}
            </span>
            {t.graphEmptySub && (
              <span style={{ fontSize: 12 }}>{dropOver ? '' : t.graphEmptySub}</span>
            )}
            {dropError && <span style={{ fontSize: 12, color: 'var(--accent)' }}>{dropError}</span>}
          </>
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              margin: 8,
              overflow: 'hidden',
              ...panZoomTransform,
            }}
          >
            <svg
              ref={svgRef}
              className="graph-svg"
              viewBox={viewBox}
              preserveAspectRatio="xMidYMid meet"
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                fontFamily: s.fontFamily,
                fontSize: s.fontSize,
              }}
              onClick={onGraphClick}
            >
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
                    zIndex: 1000,
                  }}
                >
                  {dropError}
                </div>
              )}
              <defs>
                <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx={0}
                    dy={1}
                    stdDeviation={s.nodeShadowBlur ? s.nodeShadowBlur / 2 : 0}
                    floodColor="black"
                    floodOpacity="0.2"
                  />
                </filter>
                {graphHeatAnalysisEnabled &&
                  layoutEdges.map((e: LayoutEdge) => {
                    const ge = edgeMap.get(e.id);
                    if (!ge || e.points.length < 2) return null;
                    const srcColor = nodeHeatColorMap.get(ge.source);
                    const tgtColor = nodeHeatColorMap.get(ge.target);
                    if (!srcColor || !tgtColor || srcColor === tgtColor) return null;
                    const start = e.points[0];
                    const end = e.points[e.points.length - 1];
                    return (
                      <linearGradient
                        key={e.id}
                        id={`heat-edge-${e.id}`}
                        gradientUnits="userSpaceOnUse"
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                      >
                        <stop offset="0" stopColor={srcColor} />
                        <stop offset="1" stopColor={tgtColor} />
                      </linearGradient>
                    );
                  })}
              </defs>
              <g className="graphContent">
                {layoutEdges.map((e: LayoutEdge) => {
                  const ge = edgeMap.get(e.id);
                  if (!ge) return null;
                  // 只显示连接可见节点的边
                  if (!visibleNodeIds.has(ge.source) || !visibleNodeIds.has(ge.target)) return null;
                  const { d, mid } = edgePathAndMid(e.points, edgeCurve);
                  const shape = ge?.data?.shape;
                  const shapeStr: string =
                    s.edgeLabelShowShape && Array.isArray(shape) && shape.length
                      ? `[${shape.join(',')}]`
                      : '';
                  const srcColor = nodeHeatColorMap.get(ge.source);
                  const tgtColor = nodeHeatColorMap.get(ge.target);
                  const edgeUseGradient =
                    graphHeatAnalysisEnabled && srcColor && tgtColor && srcColor !== tgtColor;
                  const edgeStroke = isEdgeSelected(e.id)
                    ? 'var(--accent)'
                    : edgeUseGradient
                      ? `url(#heat-edge-${e.id})`
                      : 'var(--edge-stroke)';
                  return (
                    <g
                      key={e.id}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        if (ge) {
                          // 如果点击的是已选中的边，清除选中状态并关闭详情窗
                          if (selected && 'source' in selected && selected.id === ge.id) {
                            setSelected(null);
                            return;
                          }
                          setSelected(ge);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {d && (
                        <path
                          d={d}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={20}
                          style={{ pointerEvents: 'stroke' }}
                        />
                      )}
                      <path
                        d={d}
                        fill="none"
                        stroke={edgeStroke}
                        strokeWidth={edgeUseGradient ? heatEdgeW : edgeW}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ pointerEvents: 'none' }}
                      />
                      {shapeStr && (
                        <text
                          x={mid.x}
                          y={mid.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="var(--text2)"
                          style={{ fontSize: 9, pointerEvents: 'none' }}
                        >
                          {shapeStr.length > 20 ? shapeStr.slice(0, 17) + '…' : shapeStr}
                        </text>
                      )}
                    </g>
                  );
                })}
                {layoutNodes.map((pos, nodeIdx) => {
                  const node = nodeMap.get(pos.id);
                  if (!node) return null;
                  // 检查节点是否应该显示
                  if (!visibleNodeIds.has(node.id)) return null;
                  const isTensor = node.metadata?.isTensorNode === true;
                  const tensor =
                    isTensor && graph ? graph.tensors[node.metadata?.tensorIndex as number] : null;
                  const fill =
                    isTensor && tensor ? tensorColorByRole(tensor.name) : opColor(node.name);
                  const heatStroke =
                    !isTensor && graphHeatAnalysisEnabled ? nodeHeatColorMap.get(node.id) : null;
                  const stroke = isTensor
                    ? 'var(--tensor-stroke)'
                    : (heatStroke ?? 'var(--node-stroke)');
                  const rx = isTensor ? Math.min(nodeRx, pos.height / 2) : nodeRx;
                  const sel = isNodeSelected(pos.id);
                  const showAttrs = s.nodeLabelShowAttrs;
                  const attrFontSize = Math.max(8, Math.round(s.fontSize * 0.78));
                  const attrLines = showAttrs ? nodeAttrsLines(node, tensor ?? null) : [];
                  const hasAttrsToShow = attrLines.length > 0;
                  const headRatio = 0.4;
                  const headH = hasAttrsToShow ? pos.height * headRatio : pos.height;
                  const clipId = `node-clip-${nodeIdx}`;
                  return (
                    <g
                      key={pos.id}
                      transform={`translate(${pos.x},${pos.y})`}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        // 如果点击的是已选中的节点，清除选中状态并关闭详情窗
                        if (selected && 'inputs' in selected && selected.id === node.id) {
                          setSelected(null);
                          return;
                        }
                        setSelected(node);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {isTensor && (
                        <rect
                          width={pos.width}
                          height={pos.height}
                          rx={rx}
                          ry={rx}
                          fill="var(--tensor-fill)"
                          stroke="none"
                          opacity={0.4}
                          transform="translate(2,2)"
                        />
                      )}
                      {showAttrs && hasAttrsToShow ? (
                        <>
                          {/* 先画色块，再画边框，避免色块盖住描边 */}
                          <path
                            d={`M ${rx},0 H ${pos.width - rx} Q ${pos.width},0 ${pos.width},${rx} V ${headH} H 0 V ${rx} Q 0,0 ${rx},0 Z`}
                            fill={fill}
                            stroke="none"
                          />
                          <path
                            d={`M 0,${headH} H ${pos.width} V ${pos.height - rx} Q ${pos.width},${pos.height} ${pos.width - rx},${pos.height} H ${rx} Q 0,${pos.height} 0,${pos.height - rx} V ${headH} Z`}
                            fill="var(--node-attr-fill)"
                            stroke="none"
                          />
                          <line
                            x1={4}
                            y1={headH}
                            x2={pos.width - 4}
                            y2={headH}
                            stroke="var(--border)"
                            strokeOpacity={0.8}
                            strokeWidth={1}
                          />
                          <rect
                            width={pos.width}
                            height={pos.height}
                            rx={rx}
                            ry={rx}
                            fill="none"
                            stroke={sel ? 'var(--accent)' : stroke}
                            strokeWidth={sel ? 2 : heatStroke ? heatNodeStrokeW : nodeStrokeW}
                            filter={s.nodeShadowBlur > 0 ? 'url(#node-shadow)' : undefined}
                          />
                          <text
                            x={pos.width / 2}
                            y={headH / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="var(--node-text)"
                            style={{
                              pointerEvents: 'none',
                              fontSize: s.fontSize,
                              fontWeight: s.nodeNameBold ? 'bold' : 'normal',
                              fontStyle: s.nodeNameItalic ? 'italic' : 'normal',
                            }}
                          >
                            {node.name}
                          </text>
                          <defs>
                            <clipPath id={clipId}>
                              <rect
                                x={2}
                                y={headH + 2}
                                width={pos.width - 4}
                                height={pos.height - headH - 4}
                                rx={2}
                              />
                            </clipPath>
                          </defs>
                          <g clipPath={`url(#${clipId})`}>
                            {attrLines.map((line, i) => (
                              <text
                                key={i}
                                x={pos.width / 2}
                                y={headH + 6 + (i + 0.6) * (attrFontSize + 2)}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="var(--text2)"
                                style={{
                                  pointerEvents: 'none',
                                  fontSize: attrFontSize,
                                  fontWeight: s.nodeAttrBold ? 'bold' : 'normal',
                                  fontStyle: s.nodeAttrItalic ? 'italic' : 'normal',
                                }}
                              >
                                {line}
                              </text>
                            ))}
                          </g>
                        </>
                      ) : (
                        /* 无属性或未开启点显属性：保持纯色单块 */
                        <>
                          <rect
                            width={pos.width}
                            height={pos.height}
                            rx={rx}
                            ry={rx}
                            fill={fill}
                            stroke={sel ? 'var(--accent)' : stroke}
                            strokeWidth={sel ? 2 : heatStroke ? heatNodeStrokeW : nodeStrokeW}
                            filter={s.nodeShadowBlur > 0 ? 'url(#node-shadow)' : undefined}
                          />
                          <text
                            x={pos.width / 2}
                            y={pos.height / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="var(--node-text)"
                            style={{
                              pointerEvents: 'none',
                              fontSize: s.fontSize,
                              fontWeight: s.nodeNameBold ? 'bold' : 'normal',
                              fontStyle: s.nodeNameItalic ? 'italic' : 'normal',
                            }}
                          >
                            {node.name}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}
      </div>
    </>
  );
});
