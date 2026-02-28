import { create } from 'zustand';
import type { Graph, GraphOperator, GraphEdge } from '@xovis/core';

interface GraphState {
  graph: Graph | null;
  selected: GraphOperator | GraphEdge | null;
  /** 设置后 GraphView 会平移使该 id（节点或边）居中，然后清空 */
  centerOnId: string | null;
  /** 大图加载中：为 true 时 App 显示加载层，布局就绪后由 App 置为 false */
  graphLoading: boolean;
  setGraph: (g: Graph | null) => void;
  setSelected: (s: GraphOperator | GraphEdge | null) => void;
  setCenterOnId: (id: string | null) => void;
  setGraphLoading: (v: boolean) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graph: null,
  selected: null,
  centerOnId: null,
  graphLoading: false,
  setGraph: (graph) => set({ graph, selected: null }),
  setSelected: (selected) => set({ selected }),
  setCenterOnId: (centerOnId) => set({ centerOnId }),
  setGraphLoading: (graphLoading) => set({ graphLoading }),
}));
