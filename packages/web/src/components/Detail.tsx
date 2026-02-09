import { useState, useMemo } from 'react';
import type { Graph, GraphNode, GraphEdge, Tensor } from '@xovis/core';
import { useGraphStore, useSettingsStore } from '../stores';
import { getLocale } from '../locale';

const INTERNAL_META = new Set(['isTensorNode', 'tensorIndex', 'isCsvData', 'rowIndex']);

function formatValue(v: unknown): React.ReactNode {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) {
    // 数组尽量一行显示
    return <pre>{JSON.stringify(v)}</pre>;
  }
  if (typeof v === 'object') return <pre>{JSON.stringify(v, null, 2)}</pre>;
  return String(v);
}

function Section({ title, entries }: { title: string; entries: [string, unknown][] }) {
  if (entries.length === 0) return null;
  return (
    <div className="panel-section">
      <div className="panel-section-title">{title}</div>
      {entries.map(([name, value]) => (
        <div key={name} className="panel-row">
          <div className="panel-row-label">{name}</div>
          <div className="panel-row-value panel-row-value-box">{formatValue(value)}</div>
        </div>
      ))}
    </div>
  );
}

function GraphDetail({ graph, t }: { graph: Graph; t: ReturnType<typeof getLocale> }) {
  const opCount = graph.nodes.filter((n: GraphNode) => !n.metadata?.isTensorNode).length;
  const base: [string, unknown][] = [
    [t.detailId, graph.id],
    [t.detailName, graph.name],
    [t.detailOperators, opCount],
    [t.detailTensors, graph.tensors.length],
    [t.detailInputs, graph.inputs?.length ?? 0],
    [t.detailOutputs, graph.outputs?.length ?? 0],
  ];
  const meta =
    graph.metadata && typeof graph.metadata === 'object'
      ? (Object.entries(graph.metadata) as [string, unknown][])
      : [];
  return (
    <>
      <Section title={t.detailGraph} entries={base} />
      <Section title={t.detailMetadata} entries={meta} />
    </>
  );
}

function OpNodeDetail({
  node,
  graph,
  typeLabel,
  t,
}: {
  node: GraphNode;
  graph: Graph;
  typeLabel: string;
  t: ReturnType<typeof getLocale>;
}) {
  const attrs = node.attributes ?? {};
  const meta = node.metadata && typeof node.metadata === 'object' ? node.metadata : {};
  const metaEntries = (Object.entries(meta) as [string, unknown][]).filter(
    ([k]) => !INTERNAL_META.has(k)
  );

  // 构建 Input 和 Output 数据
  const inputsEntries: [string, unknown][] = [];
  const outputsEntries: [string, unknown][] = [];

  if (node.inputs && Array.isArray(node.inputs) && graph.tensors) {
    node.inputs.forEach((tensorIdx: number) => {
      const tensor = graph.tensors[tensorIdx];
      if (tensor) {
        const tensorId = tensor.id || `tensor_${tensorIdx}`;
        const shape = tensor.shape && Array.isArray(tensor.shape) ? tensor.shape : null;
        inputsEntries.push([tensorId, shape ?? '—']);
      }
    });
  }

  if (node.outputs && Array.isArray(node.outputs) && graph.tensors) {
    node.outputs.forEach((tensorIdx: number) => {
      const tensor = graph.tensors[tensorIdx];
      if (tensor) {
        const tensorId = tensor.id || `tensor_${tensorIdx}`;
        const shape = tensor.shape && Array.isArray(tensor.shape) ? tensor.shape : null;
        outputsEntries.push([tensorId, shape ?? '—']);
      }
    });
  }

  return (
    <>
      <Section
        title={typeLabel}
        entries={[
          ['id', node.id],
          ['name', node.name],
        ]}
      />
      {inputsEntries.length > 0 && (
        <Section title={t.detailInputs || 'Input'} entries={inputsEntries} />
      )}
      {outputsEntries.length > 0 && (
        <Section title={t.detailOutputs || 'Output'} entries={outputsEntries} />
      )}
      <Section title={t.detailAttrs} entries={Object.entries(attrs) as [string, unknown][]} />
      <Section title={t.detailMetadata} entries={metaEntries} />
    </>
  );
}

function TensorNodeDetail({
  tensor,
  typeLabel,
  t,
}: {
  node: GraphNode;
  tensor: Tensor;
  typeLabel: string;
  t: ReturnType<typeof getLocale>;
}) {
  const entries: [string, unknown][] = [
    ['id', tensor.id],
    ['name', tensor.name],
  ];
  if (tensor.shape?.length) entries.push(['shape', tensor.shape]);
  if (tensor.dtype) entries.push(['dtype', tensor.dtype]);
  const meta = tensor.metadata && typeof tensor.metadata === 'object' ? tensor.metadata : {};
  const metaEntries = (Object.entries(meta) as [string, unknown][]).filter(
    ([k]) => !INTERNAL_META.has(k)
  );
  return (
    <>
      <Section title={typeLabel} entries={entries} />
      <Section title={t.detailMetadata} entries={metaEntries} />
    </>
  );
}

function EdgeDetail({ edge, typeLabel }: { edge: GraphEdge; typeLabel: string }) {
  const entries: [string, unknown][] = [
    ['id', edge.id],
    ['source', edge.source],
    ['target', edge.target],
  ];
  if (edge.data?.shape?.length) entries.push(['shape', edge.data.shape]);
  if (edge.data?.dtype) entries.push(['dtype', edge.data.dtype]);
  return <Section title={typeLabel} entries={entries} />;
}

const MATCH_RANK_NAME = 0;
const MATCH_RANK_ID = 1;
const MATCH_RANK_TENSOR_NAME = 2;
const MATCH_RANK_TENSOR_ID = 3;
const MATCH_RANK_TENSOR_ROLE_IO = 4;
const MATCH_RANK_JSON = 5;
const MATCH_RANK_NONE = 6;

/** 返回匹配优先级（数字越小越靠前）：先 name 后 id，再张量 name/id/role-io，最后 JSON 兜底。 */
function getMatchRank(
  obj: GraphNode | GraphEdge,
  q: string,
  graph?: Graph | null
): number {
  const lower = q.toLowerCase().trim();
  const id = String((obj as { id?: string }).id ?? '').toLowerCase();
  const name = String((obj as { name?: string }).name ?? '').toLowerCase();
  if (name.includes(lower)) return MATCH_RANK_NAME;
  if (id.includes(lower)) return MATCH_RANK_ID;
  if (!('metadata' in obj) || !graph?.tensors) {
    return JSON.stringify(obj).toLowerCase().includes(lower) ? MATCH_RANK_JSON : MATCH_RANK_NONE;
  }
  const node = obj as GraphNode;
  const ti = node.metadata?.tensorIndex as number | undefined;
  if (!node.metadata?.isTensorNode || ti === undefined || !graph.tensors[ti]) {
    return JSON.stringify(obj).toLowerCase().includes(lower) ? MATCH_RANK_JSON : MATCH_RANK_NONE;
  }
  const t = graph.tensors[ti];
  const tid = String(t.id ?? '').toLowerCase();
  const tname = String((t as { name?: string }).name ?? '').toLowerCase();
  const trole = String((t as { role?: string }).role ?? '').toLowerCase();
  if (tname.includes(lower)) return MATCH_RANK_TENSOR_NAME;
  if (tid.includes(lower)) return MATCH_RANK_TENSOR_ID;
  if (trole.includes(lower)) return MATCH_RANK_TENSOR_ROLE_IO;
  if (
    (lower === 'input' && Array.isArray(graph.inputs) && graph.inputs.includes(ti)) ||
    (lower === 'output' && Array.isArray(graph.outputs) && graph.outputs.includes(ti))
  )
    return MATCH_RANK_TENSOR_ROLE_IO;
  return JSON.stringify(obj).toLowerCase().includes(lower) ? MATCH_RANK_JSON : MATCH_RANK_NONE;
}

function matchQuery(obj: GraphNode | GraphEdge, q: string, graph?: Graph | null): boolean {
  return getMatchRank(obj, q, graph) < MATCH_RANK_NONE;
}

/** 与 GraphView 一致：当前设置下在图中可见的节点 id 集合（受 showWeightNodes / showIONodes 控制） */
function visibleNodeIdsFromGraph(
  graph: Graph | null,
  showWeightNodes: boolean,
  showIONodes: boolean
): Set<string> {
  if (!graph?.nodes?.length) return new Set();
  const ids = new Set<string>();
  for (const n of graph.nodes) {
    const isTensor = n.metadata?.isTensorNode === true;
    if (!isTensor) {
      ids.add(n.id);
      continue;
    }
    const tensor = graph.tensors?.[n.metadata?.tensorIndex as number];
    if (!tensor) {
      ids.add(n.id);
      continue;
    }
    const name = tensor.name;
    if (name === 'weight' && !showWeightNodes) continue;
    if ((name === 'input' || name === 'output') && !showIONodes) continue;
    ids.add(n.id);
  }
  return ids;
}

export function Detail() {
  const { graph, selected, setSelected, setCenterOnId } = useGraphStore();
  const { lang, showWeightNodes, showIONodes } = useSettingsStore();
  const t = getLocale(lang);
  const [query, setQuery] = useState('');

  const visibleNodeIds = useMemo(
    () => visibleNodeIdsFromGraph(graph, showWeightNodes, showIONodes),
    [graph, showWeightNodes, showIONodes]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!graph || !q) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };
    const nodes = graph.nodes
      .filter((n) => visibleNodeIds.has(n.id) && matchQuery(n, q, graph))
      .sort((a, b) => getMatchRank(a, q, graph) - getMatchRank(b, q, graph));
    const edges = (graph.edges ?? [])
      .filter(
        (e) =>
          visibleNodeIds.has(e.source) &&
          visibleNodeIds.has(e.target) &&
          matchQuery(e, q, graph)
      )
      .sort((a, b) => getMatchRank(a, q, graph) - getMatchRank(b, q, graph));
    return { nodes, edges };
  }, [graph, query, visibleNodeIds]);

  const hasSearch = query.trim().length > 0;
  const onSelect = (item: GraphNode | GraphEdge) => {
    setSelected(item);
    setCenterOnId(item.id ?? null);
    setQuery('');
  };

  return (
    <>
      {graph && (
        <div className="detail-search-bar">
          <input
            type="text"
            className="view-input"
            placeholder={t.detailSearchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.detailSearchPlaceholder}
          />
        </div>
      )}
      {hasSearch && graph ? (
        <div className="detail-search-results">
          {searchResults.nodes.length === 0 && searchResults.edges.length === 0 ? (
            <p className="detail-empty-hint">{t.detailSearchNoResults}</p>
          ) : (
            <>
              {searchResults.nodes.map((n) => {
                const isTensor = n.metadata?.isTensorNode && graph?.tensors?.[n.metadata?.tensorIndex as number];
                const tensor = isTensor ? graph!.tensors[n.metadata!.tensorIndex as number] : null;
                const displayId = tensor ? (tensor.id ?? n.id) : n.id;
                const displayName = tensor ? (tensor.name ?? n.name) : n.name;
                return (
                  <button
                    key={`node-${n.id}`}
                    type="button"
                    className="detail-search-item"
                    onClick={() => onSelect(n)}
                  >
                    <span className="detail-search-item-type">{t.detailNode}</span>
                    <span className="detail-search-item-label">
                      {displayId}
                      {displayName && displayName !== displayId ? ` · ${displayName}` : ''}
                    </span>
                  </button>
                );
              })}
              {searchResults.edges.map((e) => (
                <button
                  key={`edge-${e.id}`}
                  type="button"
                  className="detail-search-item"
                  onClick={() => onSelect(e)}
                >
                  <span className="detail-search-item-type">{t.detailEdge}</span>
                  <span className="detail-search-item-label">{e.id ?? `${e.source}→${e.target}`}</span>
                </button>
              ))}
            </>
          )}
        </div>
      ) : !selected ? (
        graph ? (
          <GraphDetail graph={graph} t={t} />
        ) : (
          <p className="detail-empty-hint">{t.detailEmptyHint}</p>
        )
      ) : 'source' in selected ? (
        <EdgeDetail edge={selected} typeLabel={t.detailEdge} />
      ) : (() => {
        const node = selected as GraphNode;
        const ti = node.metadata?.tensorIndex as number | undefined;
        const isTensor = node.metadata?.isTensorNode && ti !== undefined && graph?.tensors?.[ti];
        if (isTensor && graph) {
          return (
            <TensorNodeDetail node={node} tensor={graph.tensors[ti]} typeLabel={t.detailNode} t={t} />
          );
        }
        return graph ? <OpNodeDetail node={node} graph={graph} typeLabel={t.detailNode} t={t} /> : null;
      })()}
    </>
  );
}
