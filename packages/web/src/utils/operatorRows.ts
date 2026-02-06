/**
 * 从计算图算子节点生成表格行（展平 metadata 和 attributes），供数据面板与图表共用
 * 支持 JSON 计算图（metadata）和 CSV 数据（attributes）
 */
import type { GraphNode } from '@xovis/core';
import { flattenMetadata } from './flattenMetadata';

// 内部元数据字段，不应在表格中显示
const INTERNAL_META_KEYS = new Set(['isTensorNode', 'tensorIndex', 'isCsvData', 'rowIndex']);

export function getOperatorRows(graph: { nodes: GraphNode[] }): Record<string, unknown>[] {
  const ops = graph.nodes.filter((n: GraphNode) => !n.metadata?.isTensorNode);
  const allKeys = new Set<string>(['index', 'id', 'name']);

  // 收集所有可能的键：从 metadata 和 attributes
  ops.forEach((n: GraphNode) => {
    // 从 metadata 收集键，过滤掉内部字段
    Object.keys(flattenMetadata(n.metadata))
      .filter((k) => !INTERNAL_META_KEYS.has(k))
      .forEach((k) => allKeys.add(k));
    // 从 attributes 收集键（用于 CSV 数据）
    if (n.attributes) {
      Object.keys(n.attributes).forEach((k) => allKeys.add(k));
    }
  });

  const keys = Array.from(allKeys);
  return ops.map((n, i) => {
    const row: Record<string, unknown> = { index: i + 1, id: n.id, name: n.name };
    const flatMetadata = flattenMetadata(n.metadata);

    keys.forEach((k) => {
      if (k === 'index' || k === 'id' || k === 'name') return;
      // 跳过内部元数据字段
      if (INTERNAL_META_KEYS.has(k)) return;
      // 优先从 attributes 获取（CSV 数据），然后从 metadata 获取
      if (n.attributes && k in n.attributes) {
        row[k] = n.attributes[k];
      } else if (flatMetadata[k] !== undefined) {
        row[k] = flatMetadata[k];
      }
    });
    return row;
  });
}

export function getTableColumns(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return ['index', 'id', 'name'];
  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
  const order = ['index', 'id', 'name'];
  const rest = Array.from(keys)
    .filter((k) => !order.includes(k))
    .sort();
  return [...order, ...rest];
}
