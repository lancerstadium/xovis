declare module '@dagrejs/dagre' {
  const dagre: {
    layout: (graph: unknown, opts?: object) => void;
    graphlib: { Graph: new (opts?: { compound?: boolean; multigraph?: boolean }) => {
      setGraph: (l: object) => unknown;
      setDefaultNodeLabel: (cb: (id: string) => object) => unknown;
      setDefaultEdgeLabel: (cb: () => object) => unknown;
      setNode: (name: string, label?: object) => unknown;
      setParent: (child: string, parent: string) => unknown;
      setEdge: (v: string, w: string, label?: object, name?: string) => unknown;
      node: (id: string) => { x: number; y: number; width: number; height: number };
      edge: (v: string | { v: string; w: string; name?: string }, w?: string, name?: string) => { points: Array<{ x: number; y: number }> };
      edges: () => Array<{ v: string; w: string; name?: string }>;
      nodes: () => string[];
      graph: () => object;
    } };
  };
  export default dagre;
}
