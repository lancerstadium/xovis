/**
 * CSV 数据转换为 Graph 格式
 * 用于图表显示，不包含计算图结构（edges 为空）
 */
import type { Graph } from '@xovis/core';
import type { ParsedCsv } from './parseCsv';

/**
 * 将 CSV 数据转换为 Graph 格式
 * CSV 的每一行作为一个节点，列作为节点的属性
 */
export function csvToGraph(csv: ParsedCsv): Graph {
  const { headers, rows } = csv;

  // 将每一行转换为一个节点
  const nodes = rows.map((row, index) => {
    // 优先使用CSV中的id列（如果存在），否则使用生成的id
    const csvId = row.id !== undefined && row.id !== null && row.id !== '' 
      ? String(row.id) 
      : `csv-row-${index}`;
    const nodeName = String(row[headers[0]] ?? `Row${index + 1}`);

    // 将行数据转换为 attributes（排除id列，因为id已经是节点的id属性）
    const attributes: Record<string, unknown> = {};
    headers.forEach((header) => {
      // 跳过id列，避免重复
      if (header.toLowerCase() === 'id') return;
      const value = row[header];
      if (value !== undefined && value !== null && value !== '') {
        attributes[header] = value;
      }
    });

    return {
      id: csvId,
      name: nodeName,
      inputs: [],
      outputs: [],
      attributes,
      metadata: {
        isCsvData: true,
        rowIndex: index,
      },
    };
  });

  return {
    id: 'csv-data',
    name: 'CSV Data',
    tensors: [],
    nodes,
    edges: [],
    inputs: [],
    outputs: [],
    metadata: {
      source: 'csv',
      rowCount: rows.length,
      columnCount: headers.length,
    },
  };
}
