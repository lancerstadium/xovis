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
  const meta =
    tensor.metadata && typeof tensor.metadata === 'object' ? tensor.metadata : {};
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

export function Detail() {
  const { graph, selected } = useGraphStore();
  const { lang } = useSettingsStore();
  const t = getLocale(lang);

  if (!selected) {
    if (graph) return <GraphDetail graph={graph} t={t} />;
    return <p className="detail-empty-hint">{t.detailEmptyHint}</p>;
  }

  if ('source' in selected) return <EdgeDetail edge={selected} typeLabel={t.detailEdge} />;

  const node = selected as GraphNode;
  const ti = node.metadata?.tensorIndex as number | undefined;
  const isTensor = node.metadata?.isTensorNode && ti !== undefined && graph?.tensors?.[ti];

  if (isTensor && graph) {
    return (
      <TensorNodeDetail
        node={node}
        tensor={graph.tensors[ti]}
        typeLabel={t.detailNode}
        t={t}
      />
    );
  }
  return graph ? <OpNodeDetail node={node} graph={graph} typeLabel={t.detailNode} t={t} /> : null;
}
