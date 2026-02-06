/**
 * CSV 解析工具
 * 支持标准 CSV 格式，自动处理引号和转义
 */

export interface ParsedCsvRow {
  [key: string]: string | number;
}

export interface ParsedCsv {
  headers: string[];
  rows: ParsedCsvRow[];
}

/**
 * 解析 CSV 字符串
 * @param csvText CSV 文本内容
 * @param options 解析选项
 * @returns 解析后的 CSV 数据
 */
export function parseCsv(
  csvText: string,
  options: {
    delimiter?: string;
    hasHeaders?: boolean;
    autoDetectNumbers?: boolean;
  } = {}
): ParsedCsv {
  const { delimiter = ',', hasHeaders = true, autoDetectNumbers = true } = options;

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // 解析 CSV 行（处理引号和转义）
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 转义的引号
          current += '"';
          i += 2;
        } else {
          // 开始或结束引号
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // 字段分隔符
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    result.push(current);
    return result;
  };

  // 解析所有行
  const parsedLines = lines.map(parseLine);

  // 确定列数（使用第一行的列数）
  const columnCount = parsedLines[0]?.length ?? 0;

  // 获取表头
  let headers: string[] = [];
  let dataStartIndex = 0;

  if (hasHeaders && parsedLines.length > 0) {
    headers = parsedLines[0].map((h) => h.trim());
    dataStartIndex = 1;
  } else {
    // 如果没有表头，生成默认表头
    headers = Array.from({ length: columnCount }, (_, i) => `Column${i + 1}`);
  }

  // 解析数据行
  const rows: ParsedCsvRow[] = [];
  for (let i = dataStartIndex; i < parsedLines.length; i++) {
    const line = parsedLines[i];
    const row: ParsedCsvRow = {};
    headers.forEach((header, colIndex) => {
      const value = line[colIndex]?.trim() ?? '';
      if (autoDetectNumbers) {
        // 尝试转换为数字
        const numValue = Number(value);
        row[header] = value === '' || isNaN(numValue) ? value : numValue;
      } else {
        row[header] = value;
      }
    });
    rows.push(row);
  }

  return { headers, rows };
}
