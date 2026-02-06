import { forwardRef, useImperativeHandle, useRef, type ReactElement } from 'react';
import { useSettingsStore, useGraphStore } from '../stores';
import { GraphView } from './GraphView';
import { ChartView } from './ChartView';
import type { GraphViewHandle } from './GraphView';
import type { ChartViewHandle } from './ChartView';

export type CanvasPanelHandle = {
  getSvgElement: () => SVGSVGElement | null;
  resetView: () => void;
};

export const CanvasPanel = forwardRef<CanvasPanelHandle, object>(
  function CanvasPanel(_: object, ref): ReactElement {
  const graphViewRef = useRef<GraphViewHandle>(null);
  const chartViewRef = useRef<ChartViewHandle>(null);
  const viewMode = useSettingsStore((s) => s.viewMode);
  const graph = useGraphStore((s) => s.graph);
  const chartXKey = useSettingsStore((s) => s.chartXKey);
  const chartYKeys = useSettingsStore((s) => s.chartYKeys);
  const hasChartMapping = !!chartXKey && chartYKeys.filter((yc) => yc.key).length > 0;

  const showGraph = !graph || viewMode === 'graph' || !hasChartMapping;
  useImperativeHandle(
    ref,
    () => ({
      getSvgElement: () =>
        showGraph
          ? (graphViewRef.current?.getSvgElement?.() ?? null)
          : (chartViewRef.current?.getSvgElement?.() ?? null),
      resetView: () =>
        showGraph ? graphViewRef.current?.resetView?.() : chartViewRef.current?.resetView?.(),
    }),
    [showGraph]
  );

  /* 无图时显示上传界面；图表视图无映射时也显示计算图，不出现「选择 X/Y 列」界面 */
  if (showGraph) {
    return <GraphView ref={graphViewRef} /> as ReactElement;
  }
  return <ChartView ref={chartViewRef} viewMode={viewMode} /> as ReactElement;
});
