/**
 * 格式化工具
 */

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const d = decimals < 0 ? 0 : decimals;
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(d) + ' ' + u[i];
}

export function formatTime(ms: number, decimals = 2): string {
  if (ms < 1) return (ms * 1000).toFixed(decimals) + ' μs';
  if (ms < 1000) return ms.toFixed(decimals) + ' ms';
  return (ms / 1000).toFixed(decimals) + ' s';
}

export function formatPercent(value: number, decimals = 1): string {
  return value.toFixed(decimals) + '%';
}

export function formatNumber(num: number, decimals = 0): string {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
