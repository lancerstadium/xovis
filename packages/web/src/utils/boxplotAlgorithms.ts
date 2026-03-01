import type { Graph } from '@xovis/core';
import type { TensorRow } from './tensorRows';

export type BoxplotAlgorithm = 'custom' | 'stacked' | 'first_fit' | 'best_fit';

export type TensorRect = {
  tensorId: string;
  tensorName: string;
  tensorIndex: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  size: number;
  start: number;
  end: number;
  row: TensorRow;
};

type Segment = { offset: number; size: number };

function overlap(a0: number, a1: number, b0: number, b1: number): boolean {
  // 论文定义为闭区间重叠：max(first) <= min(last)
  return a0 <= b1 && b0 <= a1;
}

function normalizeTime(start: number, end: number): { start: number; end: number } {
  if (!Number.isFinite(start) && !Number.isFinite(end)) return { start: 0, end: 1 };
  const s = Number.isFinite(start) ? start : end - 1;
  const e = Number.isFinite(end) ? end : s + 1;
  return e > s ? { start: s, end: e } : { start: s, end: s + 1 };
}

function mergeSegments(segments: Segment[]): Segment[] {
  if (segments.length <= 1) return segments;
  const sorted = [...segments].sort((a, b) => a.offset - b.offset);
  const out: Segment[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    const lastEnd = last.offset + last.size;
    if (cur.offset <= lastEnd) {
      const end = Math.max(lastEnd, cur.offset + cur.size);
      last.size = end - last.offset;
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

function releaseEnded(active: Array<{ end: number; offset: number; size: number }>, now: number): Segment[] {
  const freed: Segment[] = [];
  for (let i = active.length - 1; i >= 0; i--) {
    // 闭区间语义：end < now 才能释放（end == now 仍重叠）
    if (active[i].end < now) {
      freed.push({ offset: active[i].offset, size: active[i].size });
      active.splice(i, 1);
    }
  }
  return freed;
}

function pickSegment(
  freeSegments: Segment[],
  size: number,
  policy: 'first_fit' | 'best_fit'
): number | null {
  let bestIdx = -1;
  let bestWaste = Number.POSITIVE_INFINITY;
  for (let i = 0; i < freeSegments.length; i++) {
    const seg = freeSegments[i];
    if (seg.size < size) continue;
    if (policy === 'first_fit') return i;
    const waste = seg.size - size;
    if (waste < bestWaste) {
      bestWaste = waste;
      bestIdx = i;
    }
  }
  return bestIdx >= 0 ? bestIdx : null;
}

function buildTensorLevels(graph: Graph | null): Map<string, number> {
  const levels = new Map<string, number>();
  if (!graph) return levels;
  graph.tensors.forEach((t) => levels.set(t.id, t.name === 'input' || t.name === 'weight' ? 0 : -1));
  const ops = graph.operators.filter((op) => !op.metadata?.isTensorNode);
  const tensorByIndex = (i: number) => graph.tensors[i]?.id;
  const maxIter = Math.max(ops.length * 2, 8);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const op of ops) {
      let base = 0;
      for (const ti of op.inputs ?? []) {
        const tid = tensorByIndex(ti);
        if (!tid) continue;
        const lv = levels.get(tid) ?? -1;
        base = Math.max(base, lv >= 0 ? lv + 1 : 0);
      }
      for (const to of op.outputs ?? []) {
        const tid = tensorByIndex(to);
        if (!tid) continue;
        const prev = levels.get(tid) ?? -1;
        if (base > prev) {
          levels.set(tid, base);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return levels;
}

type TensorUsageInterval = { first: number; last: number };

function buildTensorUsageIntervals(graph: Graph | null): Map<string, TensorUsageInterval> {
  const intervals = new Map<string, TensorUsageInterval>();
  if (!graph) return intervals;
  const ops = graph.operators.filter((op) => !op.metadata?.isTensorNode);
  const tensorByIndex = (i: number) => graph.tensors[i]?.id;
  for (let opIndex = 0; opIndex < ops.length; opIndex++) {
    const op = ops[opIndex];
    const touched = [...(op.inputs ?? []), ...(op.outputs ?? [])];
    for (const ti of touched) {
      const tid = tensorByIndex(ti);
      if (!tid) continue;
      const prev = intervals.get(tid);
      if (!prev) {
        intervals.set(tid, { first: opIndex, last: opIndex });
      } else {
        if (opIndex < prev.first) prev.first = opIndex;
        if (opIndex > prev.last) prev.last = opIndex;
      }
    }
  }
  return intervals;
}

type TensorJob = {
  row: TensorRow;
  start: number;
  end: number;
  size: number;
  offset: number;
  hasOffset: boolean;
};

function toJob(
  row: TensorRow,
  topoLevels: Map<string, number>,
  usageIntervals: Map<string, TensorUsageInterval>
): TensorJob {
  const inferred = usageIntervals.get(row.tensorId);
  const inferredStart = inferred?.first ?? topoLevels.get(row.tensorId) ?? 0;
  // usage interval 是闭区间 [first,last]，绘图用右开端点更直观，故 +1
  const inferredEnd = inferred ? inferred.last + 1 : inferredStart + 1;
  const hasStart = Number.isFinite(Number(row.start));
  const hasEnd = Number.isFinite(Number(row.end));
  const startRaw = hasStart ? Number(row.start) : inferredStart;
  const endRaw = hasEnd ? Number(row.end) : inferredEnd;
  const { start, end } = normalizeTime(startRaw, endRaw);
  const size = Math.max(0, Number(row.size) || 0);
  const offset = Number(row.offset);
  return {
    row,
    start,
    end,
    size,
    offset,
    hasOffset: Number.isFinite(offset),
  };
}

function makeRect(job: TensorJob, y0: number): TensorRect {
  return {
    tensorId: job.row.tensorId,
    tensorName: job.row.tensorName,
    tensorIndex: job.row.tensorIndex,
    x0: job.start,
    x1: job.end,
    y0,
    y1: y0 + job.size,
    size: job.size,
    start: job.start,
    end: job.end,
    row: job.row,
  };
}

function layoutStacked(jobs: TensorJob[]): TensorRect[] {
  let cur = 0;
  return jobs.map((job) => {
    const rect = makeRect(job, cur);
    cur += job.size;
    return rect;
  });
}

function layoutOffsetGreedyBySize(jobsByStart: TensorJob[], policy: 'first_fit' | 'best_fit'): TensorRect[] {
  // 严格按论文 Offset Calculation（Alg.3）核心流程：
  // 1) 按 size 非递增遍历
  // 2) 在“与当前张量生命周期相交”的已分配张量中找 gap
  // 3) first_fit 取第一个可用 gap；best_fit 取最小可用 gap
  const jobsBySize = [...jobsByStart].sort((a, b) =>
    a.size === b.size
      ? a.start === b.start
        ? a.end === b.end
          ? a.row.tensorIndex - b.row.tensorIndex
          : a.end - b.end
        : a.start - b.start
      : b.size - a.size
  );

  type Assigned = { start: number; end: number; size: number; offset: number; tensorIndex: number };
  const assigned: Assigned[] = [];
  const offsetByTensorIndex = new Map<number, number>();

  for (const job of jobsBySize) {
    let prevOffset = 0;
    let bestOffset: number | null = null;
    let smallestGap = Number.POSITIVE_INFINITY;

    for (const x of assigned) {
      if (!overlap(job.start, job.end, x.start, x.end)) continue;

      const gap = x.offset - prevOffset;
      if (gap >= job.size) {
        if (policy === 'first_fit') {
          bestOffset = prevOffset;
          break;
        }
        if (gap < smallestGap) {
          smallestGap = gap;
          bestOffset = prevOffset;
        }
      }
      prevOffset = Math.max(prevOffset, x.offset + x.size);
    }

    if (bestOffset == null) bestOffset = prevOffset;
    offsetByTensorIndex.set(job.row.tensorIndex, bestOffset);

    const item: Assigned = {
      start: job.start,
      end: job.end,
      size: job.size,
      offset: bestOffset,
      tensorIndex: job.row.tensorIndex,
    };
    const pos = assigned.findIndex((v) => v.offset > item.offset);
    if (pos >= 0) assigned.splice(pos, 0, item);
    else assigned.push(item);
  }

  return jobsByStart.map((job) => makeRect(job, offsetByTensorIndex.get(job.row.tensorIndex) ?? 0));
}

export function computeTensorRects(
  rows: TensorRow[],
  algorithm: BoxplotAlgorithm,
  graph: Graph | null
): TensorRect[] {
  if (rows.length === 0) return [];
  const topoLevels = buildTensorLevels(graph);
  const usageIntervals = buildTensorUsageIntervals(graph);
  const jobs = rows.map((row) => toJob(row, topoLevels, usageIntervals));
  const sorted = [...jobs].sort((a, b) =>
    a.start === b.start ? (a.end === b.end ? a.row.tensorIndex - b.row.tensorIndex : a.end - b.end) : a.start - b.start
  );

  if (algorithm === 'custom') {
    // 语义：custom 仅在 JSON 明确给出 offset 时生效；如果完全没有 offset，按 stacked 绘制。
    const hasAnyOffset = sorted.some((job) => job.hasOffset);
    if (!hasAnyOffset) return layoutStacked(sorted);
    const active: Array<{ end: number; offset: number; size: number }> = [];
    let freeSegments: Segment[] = [];
    let top = 0;
    const rects: TensorRect[] = [];
    for (const job of sorted) {
      const freed = releaseEnded(active, job.start);
      if (freed.length) freeSegments = mergeSegments([...freeSegments, ...freed]);
      let y0 = job.offset;
      if (!job.hasOffset) {
        const segIdx = pickSegment(freeSegments, job.size, 'first_fit');
        if (segIdx != null) {
          const seg = freeSegments[segIdx];
          y0 = seg.offset;
          if (seg.size === job.size) freeSegments.splice(segIdx, 1);
          else freeSegments[segIdx] = { offset: seg.offset + job.size, size: seg.size - job.size };
        } else {
          y0 = top;
          top += job.size;
        }
      }
      top = Math.max(top, y0 + job.size);
      if (job.size > 0) active.push({ end: job.end, offset: y0, size: job.size });
      rects.push(makeRect(job, y0));
    }
    return rects;
  }

  if (algorithm === 'stacked') {
    return layoutStacked(sorted);
  }

  const policy = algorithm === 'best_fit' ? 'best_fit' : 'first_fit';
  const rects = layoutOffsetGreedyBySize(sorted, policy);

  // 防御性处理：如果存在同一偏移且时间重叠的矩形，向上轻微推开，避免完全重叠不可见。
  rects.sort((a, b) => (a.y0 === b.y0 ? a.x0 - b.x0 : a.y0 - b.y0));
  for (let i = 1; i < rects.length; i++) {
    const prev = rects[i - 1];
    const cur = rects[i];
    if (cur.y0 === prev.y0 && overlap(cur.x0, cur.x1, prev.x0, prev.x1)) {
      cur.y0 = prev.y1;
      cur.y1 = cur.y0 + cur.size;
    }
  }
  return rects;
}
