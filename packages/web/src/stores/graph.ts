import { create } from 'zustand';
import type { Graph, GraphNode, GraphEdge } from '@xovis/core';

interface GraphState {
  graph: Graph | null;
  selected: GraphNode | GraphEdge | null;
  setGraph: (g: Graph | null) => void;
  setSelected: (s: GraphNode | GraphEdge | null) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graph: null,
  selected: null,
  setGraph: (graph) => set({ graph, selected: null }),
  setSelected: (selected) => set({ selected }),
}));
