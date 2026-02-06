/**
 * 统一文件加载工具
 * 支持 JSON（计算图）和 CSV（图表数据）
 */
import type { Graph } from '@xovis/core';
import { parseGraph } from '@xovis/core';
import { parseCsv } from './parseCsv';
import { csvToGraph } from './csvToGraph';

export type FileLoadResult =
  | { success: true; graph: Graph; source: 'json' | 'csv' }
  | { success: false; error: string };

/**
 * 从文件内容加载数据
 * @param text 文件文本内容
 * @param fileName 文件名（用于判断类型）
 * @returns 加载结果
 */
export function loadFile(text: string, fileName?: string): FileLoadResult {
  const isCsv = fileName?.toLowerCase().endsWith('.csv') ?? false;

  try {
    if (isCsv) {
      const csv = parseCsv(text);
      if (csv.rows.length === 0) {
        return { success: false, error: 'CSV file is empty or invalid' };
      }
      const graph = csvToGraph(csv);
      return { success: true, graph, source: 'csv' };
    } else {
      const graph = parseGraph(text);
      return { success: true, graph, source: 'json' };
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to load file',
    };
  }
}

/**
 * 判断文件类型是否支持
 * @param file 文件对象
 * @returns 是否支持
 */
export function isSupportedFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  return (
    fileName.endsWith('.json') ||
    fileName.endsWith('.csv') ||
    fileType === 'application/json' ||
    fileType === 'text/csv' ||
    fileType === 'text/comma-separated-values'
  );
}
