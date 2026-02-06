/**
 * 展平 metadata 为点分隔键（如 performance.time.cpu），数组/日期等按值保留
 */
export function flattenMetadata(obj: unknown, prefix = ''): Record<string, unknown> {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object') return prefix ? { [prefix]: obj } : {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, flattenMetadata(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}
