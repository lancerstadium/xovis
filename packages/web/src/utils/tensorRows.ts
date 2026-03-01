import type { Graph, Tensor } from '@xovis/core';
import { flattenMetadata } from './flattenMetadata';

export type TensorRow = Record<string, unknown> & {
  index: number;
  tensorId: string;
  tensorName: string;
  id: string;
  name: string;
  size: number;
  start: number;
  end: number;
  offset: number;
  tensorIndex: number;
};

const DTYPE_BYTES: Record<string, number> = {
  float32: 4,
  float16: 2,
  int32: 4,
  int64: 8,
  uint8: 1,
  bool: 1,
  string: 1,
};

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickNumber(flat: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const n = toFiniteNumber(flat[key]);
    if (n != null) return n;
  }
  return null;
}

function inferTensorSize(tensor: Tensor, flat: Record<string, unknown>): number {
  const byMeta = pickNumber(flat, [
    'size',
    'bytes',
    'memory.size',
    'memory.bytes',
    'tensor.size',
    'tensor.bytes',
  ]);
  if (byMeta != null && byMeta >= 0) return byMeta;
  if (!Array.isArray(tensor.shape) || tensor.shape.length === 0) return 0;
  const elems = tensor.shape.reduce((acc, v) => (v > 0 ? acc * v : acc), 1);
  const bytes = DTYPE_BYTES[String(tensor.dtype ?? 'float32').toLowerCase()] ?? 4;
  return Math.max(0, elems * bytes);
}

export function getTensorRows(graph: Graph | null): TensorRow[] {
  if (!graph?.tensors?.length) return [];
  return graph.tensors.map((tensor, i) => {
    const flat = flattenMetadata(tensor.metadata);
    const start =
      pickNumber(flat, [
        'start',
        'attr.start',
        'attrs.start',
        'attributes.start',
        'exec.start',
        'execution.start',
        'range.start',
        'time.start',
      ]) ?? NaN;
    const end =
      pickNumber(flat, [
        'end',
        'attr.end',
        'attrs.end',
        'attributes.end',
        'exec.end',
        'execution.end',
        'range.end',
        'time.end',
      ]) ?? NaN;
    const offset =
      pickNumber(flat, [
        'offset',
        'attr.offset',
        'attrs.offset',
        'attributes.offset',
        'memory.offset',
        'alloc.offset',
        'buffer.offset',
      ]) ?? NaN;
    const size = inferTensorSize(tensor, flat);
    const row: TensorRow = {
      index: i + 1,
      tensorId: String(tensor.id ?? `tensor_${i}`),
      tensorName: String(tensor.name ?? ''),
      id: String(tensor.id ?? `tensor_${i}`),
      name: String(tensor.name ?? ''),
      size,
      start,
      end,
      offset,
      tensorIndex: i,
    };
    Object.entries(flat).forEach(([k, v]) => {
      if (!(k in row)) row[k] = v;
    });
    return row;
  });
}

export function getActivationTensorRows(rows: TensorRow[]): TensorRow[] {
  return rows.filter((row) => row.tensorName === 'activation');
}

export function getTensorTableColumns(rows: TensorRow[]): string[] {
  if (rows.length === 0) return ['index', 'id', 'name', 'start', 'end', 'offset', 'size'];
  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
  const hiddenInternal = new Set(['tensorId', 'tensorName', 'tensorIndex']);
  const order = ['index', 'id', 'name', 'start', 'end', 'offset', 'size'];
  const rest = Array.from(keys)
    .filter((k) => !order.includes(k) && !hiddenInternal.has(k))
    .sort();
  return [...order, ...rest];
}
