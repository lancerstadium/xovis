/** 双指距离 */
export function getTouchDistance(touches: TouchList): number {
  return Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
}

/** 滚轮缩放灵敏度（与 pinch 解耦，仅用于桌面） */
const WHEEL_ZOOM_SENSITIVITY = 0.003;

/**
 * 计算滚轮后的 zoom 与 pan，使指针位置在内容上保持不动（与 pinch 以双指中心为锚点逻辑一致）。
 * @param currentZoom 当前 zoom
 * @param currentPan 当前 pan
 * @param deltaY 滚轮 e.deltaY（正=向下滚=缩小）
 * @param mouseScreen 指针屏幕坐标 (e.clientX, e.clientY)
 * @param containerCenter 容器中心屏幕坐标（与 transform-origin 一致）
 */
export function computeWheelZoomPan(
  currentZoom: number,
  currentPan: { x: number; y: number },
  deltaY: number,
  mouseScreen: { x: number; y: number },
  containerCenter: { x: number; y: number }
): { zoom: number; pan: { x: number; y: number } } {
  const newZoom = Math.max(0.01, currentZoom * (1 - deltaY * WHEEL_ZOOM_SENSITIVITY));
  const ratio = 1 - newZoom / currentZoom;
  const pan = {
    x: currentPan.x + (mouseScreen.x - containerCenter.x - currentPan.x) * ratio,
    y: currentPan.y + (mouseScreen.y - containerCenter.y - currentPan.y) * ratio,
  };
  return { zoom: newZoom, pan };
}

/** 双指中心（屏幕坐标） */
export function getPinchCenter(touches: TouchList): { x: number; y: number } {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

const PINCH_EXPAND = 0.6;
const PINCH_SHRINK = 0.4;

/**
 * 计算 pinch 后的 zoom 与 pan，使双指中心在内容上保持不动（触屏定位准确）。
 * @param ratio 当前距离 / 初始距离
 * @param initialZoom 初始 zoom
 * @param initialPan 初始 pan
 * @param initialCenter 初始双指中心（屏幕）
 * @param currentCenter 当前双指中心（屏幕）
 * @param containerCenter 容器中心（屏幕，与 transformOrigin 一致）
 */
export function computePinchZoomPan(
  ratio: number,
  initialZoom: number,
  initialPan: { x: number; y: number },
  initialCenter: { x: number; y: number },
  currentCenter: { x: number; y: number },
  containerCenter: { x: number; y: number }
): { zoom: number; pan: { x: number; y: number } } {
  const exp = ratio > 1 ? PINCH_EXPAND : PINCH_SHRINK;
  const zoom = Math.max(0.01, initialZoom * Math.pow(ratio, exp));
  const scaleRatio = zoom / initialZoom;
  const pan = {
    x: currentCenter.x - containerCenter.x - (initialCenter.x - containerCenter.x - initialPan.x) * scaleRatio,
    y: currentCenter.y - containerCenter.y - (initialCenter.y - containerCenter.y - initialPan.y) * scaleRatio,
  };
  return { zoom, pan };
}
