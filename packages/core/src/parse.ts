/**
 * JSON 计算图解析（见 docs/json-spec.md，扩展信息统一在 metadata）
 */

import type { Graph, GraphNode, GraphEdge, Tensor } from './types';

const DTYPES = ['float32', 'float16', 'int32', 'int64', 'uint8', 'bool', 'string'] as const;
function toDtype(s: string): Tensor['dtype'] {
  const lower = s?.toLowerCase();
  return DTYPES.includes(lower as (typeof DTYPES)[number]) ? (lower as Tensor['dtype']) : 'float32';
}

function parseShape(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
}

function deriveEdges(nodes: GraphNode[], tensors: Tensor[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const tensorToProducers = new Map<number, string[]>();
  const tensorToTensorNode = new Map<number, string>();

  nodes.forEach((n) => {
    if (n.metadata?.isTensorNode) return;
    n.outputs.forEach((ti) => {
      if (!tensorToProducers.has(ti)) tensorToProducers.set(ti, []);
      tensorToProducers.get(ti)!.push(n.id);
    });
  });
  nodes.forEach((n) => {
    const ti = n.metadata?.tensorIndex as number | undefined;
    if (ti !== undefined && n.metadata?.isTensorNode) tensorToTensorNode.set(ti, n.id);
  });

  nodes.forEach((target) => {
    if (target.metadata?.isTensorNode) return;
    target.inputs.forEach((ti) => {
      const t = tensors[ti];
      if (!t) return;
      const sources = tensorToTensorNode.has(ti)
        ? [tensorToTensorNode.get(ti)!]
        : (tensorToProducers.get(ti) ?? []);
      sources.forEach((src) => {
        if (src === target.id) return;
        let eid = t.id;
        if (seen.has(eid)) eid = `${t.id}_${src}_${target.id}`;
        seen.add(eid);
        edges.push({
          id: eid,
          source: src,
          target: target.id,
          sourceOutput: t.id,
          targetInput: t.id,
          data: { shape: t.shape, dtype: t.dtype },
        });
      });
    });
  });

  nodes.forEach((n) => {
    if (!n.metadata?.isTensorNode) return;
    const ti = n.metadata.tensorIndex as number;
    const t = tensors[ti];
    if (!t || t.name !== 'output') return;
    (tensorToProducers.get(ti) ?? []).forEach((src) => {
      let eid = t.id;
      if (seen.has(eid)) eid = `${t.id}_${src}_${n.id}`;
      seen.add(eid);
      edges.push({
        id: eid,
        source: src,
        target: n.id,
        sourceOutput: t.id,
        targetInput: t.id,
        data: { shape: t.shape, dtype: t.dtype },
      });
    });
  });

  return edges;
}

export function parseGraph(json: string): Graph {
  let raw = JSON.parse(json) as Record<string, unknown>;
  if (raw?.graph && typeof raw.graph === 'object') raw = raw.graph as Record<string, unknown>;
  if (!raw || !Array.isArray(raw.tensors) || !Array.isArray(raw.nodes)) {
    throw new Error('Invalid graph: missing tensors or nodes');
  }

  const NAMES: Tensor['name'][] = ['input', 'output', 'weight', 'activation'];
  const toName = (v: unknown): Tensor['name'] => {
    const s = String(v ?? '').toLowerCase();
    return NAMES.includes(s as Tensor['name']) ? (s as Tensor['name']) : 'activation';
  };
  const tensors: Tensor[] = (raw.tensors as Record<string, unknown>[]).map((t, i) => {
    const id = t.id != null ? String(t.id).trim() : `tensor_${i}`;
    const meta =
      t.metadata && typeof t.metadata === 'object' && !Array.isArray(t.metadata)
        ? (t.metadata as Record<string, unknown>)
        : {};
    return {
      id,
      name: toName(t.name ?? t.role),
      shape: parseShape(t.shape),
      dtype: toDtype(String(t.dtype ?? 'float32')),
      ...(Object.keys(meta).length > 0 ? { metadata: meta } : {}),
    };
  });

  const opNodes: GraphNode[] = (raw.nodes as Record<string, unknown>[]).map((n) => {
    const inputs = Array.isArray(n.inputs)
      ? (n.inputs.filter((x) => typeof x === 'number') as number[])
      : [];
    const outputs = Array.isArray(n.outputs)
      ? (n.outputs.filter((x) => typeof x === 'number') as number[])
      : [];
    const meta = (n.metadata && typeof n.metadata === 'object' ? n.metadata : {}) as Record<
      string,
      unknown
    >;
    const attrs: Record<string, unknown> =
      n.attributes && typeof n.attributes === 'object' && !Array.isArray(n.attributes)
        ? { ...(n.attributes as Record<string, unknown>) }
        : {};
    const name = String(n.name ?? n.id ?? '');
    return {
      id: String(n.id ?? ''),
      name: name || 'Unknown',
      inputs,
      outputs,
      attributes: attrs,
      metadata: Object.keys(meta).length ? meta : undefined,
    };
  });

  const tensorNodes: GraphNode[] = [];
  tensors.forEach((t, i) => {
    if (t.name === 'activation') return;
    tensorNodes.push({
      id: t.id,
      name: t.name.charAt(0).toUpperCase() + t.name.slice(1),
      inputs: [],
      outputs: t.name === 'input' || t.name === 'weight' ? [i] : [],
      attributes: {},
      metadata: { isTensorNode: true, tensorIndex: i },
    });
  });

  const nodes = [...opNodes, ...tensorNodes];
  const edges = deriveEdges(nodes, tensors);

  let inputs: number[] = Array.isArray(raw.inputs)
    ? (raw.inputs as number[]).filter((x) => typeof x === 'number')
    : [];
  let outputs: number[] = Array.isArray(raw.outputs)
    ? (raw.outputs as number[]).filter((x) => typeof x === 'number')
    : [];
  if (inputs.length === 0)
    inputs = tensors.map((_, i) => i).filter((i) => tensors[i].name === 'input');
  if (outputs.length === 0)
    outputs = tensors.map((_, i) => i).filter((i) => tensors[i].name === 'output');

  const metadata =
    raw.metadata &&
    typeof raw.metadata === 'object' &&
    Object.keys(raw.metadata as object).length > 0
      ? (raw.metadata as Record<string, unknown>)
      : undefined;

  return {
    id: String(raw.id ?? 'graph'),
    name: String(raw.name ?? raw.id ?? 'graph'),
    tensors,
    nodes,
    edges,
    inputs,
    outputs,
    metadata,
  };
}
