export interface PanOffset {
  x: number
  y: number
}

export interface BoxDimensions {
  width: number
  height: number
}

export interface SnapTargetParams {
  currentIndex: number
  total: number
  offsetInline: number
  velocityInline: number
  distanceThreshold?: number
  velocityThreshold?: number
}

export interface CloseDragProgress {
  progress: number
  opacity: number
  shouldClose: boolean
}

/**
 * Wraps an index into the valid cyclical range [0, count - 1].
 * Returns 0 if count <= 0.
 */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

/**
 * Determines the navigation step (-1, 0, or 1) based on horizontal touch swipe deltaX.
 *
 * Direction convention (content follows the finger): the next image sits on the inline-end
 * side, so dragging toward the inline-start side pulls it into view.
 * - LTR: next is on the right; dragging left (deltaX <= -threshold) → 1, dragging right → -1.
 * - RTL: next is on the left; dragging right (deltaX >= threshold) → 1, dragging left → -1.
 */
export function swipeStep(
  deltaX: number,
  isRtl: boolean,
  threshold = 40,
): -1 | 0 | 1 {
  if (Math.abs(deltaX) < threshold) return 0
  const deltaInline = isRtl ? -deltaX : deltaX
  return deltaInline < 0 ? 1 : -1
}

/**
 * Clamps zoom scale between min and max bounds.
 * Falls back to min if scale is NaN or non-finite.
 */
export function clampZoom(scale: number, min = 1, max = 3): number {
  if (!Number.isFinite(scale)) return min
  const lower = Math.min(min, max)
  const upper = Math.max(min, max)
  return Math.max(lower, Math.min(upper, scale))
}

/**
 * Calculates clamped pan offsets so the zoomed image edges do not drag past viewport bounds.
 * If the scaled image fits within viewport bounds along an axis, pan offset along that axis is clamped to 0.
 */
export function clampPan(
  offset: PanOffset,
  scale: number,
  viewport: BoxDimensions,
  image: BoxDimensions,
): PanOffset {
  const safeScale = Number.isFinite(scale) ? Math.max(1, scale) : 1
  const ox = Number.isFinite(offset?.x) ? offset.x : 0
  const oy = Number.isFinite(offset?.y) ? offset.y : 0

  if (
    safeScale <= 1 ||
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    !Number.isFinite(image.width) ||
    !Number.isFinite(image.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    return { x: 0, y: 0 }
  }

  const scaledWidth = image.width * safeScale
  const scaledHeight = image.height * safeScale

  const maxPanX = scaledWidth > viewport.width ? (scaledWidth - viewport.width) / 2 : 0
  const maxPanY = scaledHeight > viewport.height ? (scaledHeight - viewport.height) / 2 : 0

  const clampedX = Math.max(-maxPanX, Math.min(maxPanX, ox))
  const clampedY = Math.max(-maxPanY, Math.min(maxPanY, oy))

  return { x: clampedX, y: clampedY }
}

/**
 * Computes base dimensions of an image fitted inside a viewport preserving aspect ratio (object-fit: contain).
 */
export function calculateFittedDimensions(
  viewport: BoxDimensions,
  natural: BoxDimensions,
): BoxDimensions {
  if (
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return { width: 0, height: 0 }
  }
  const ratio = Math.min(viewport.width / natural.width, viewport.height / natural.height)
  return {
    width: natural.width * ratio,
    height: natural.height * ratio,
  }
}

/**
 * Standard rubber-band damping curve for over-scroll / over-drag past track bounds.
 * Formula: f(x) = (x * dimension * constant) / (dimension + constant * x)
 */
export function applyRubberBand(
  offset: number,
  dimension: number,
  constant = 0.55,
): number {
  if (
    !Number.isFinite(offset) ||
    !Number.isFinite(dimension) ||
    dimension <= 0 ||
    offset === 0
  ) {
    return 0
  }
  const sign = Math.sign(offset)
  const absOffset = Math.abs(offset)
  const damped = (absOffset * dimension * constant) / (dimension + constant * absOffset)
  return sign * damped
}

/**
 * Calculates the target slide index after a pointer drag release.
 * `offsetInline` / `velocityInline` are positive toward the inline-end side; a drag toward the
 * inline-start side reveals the next slide (content follows the finger).
 * Flick velocity (> 0.4 px/ms) takes precedence over distance threshold.
 * Clamps result strictly to [0, total - 1] (drag gestures do not loop).
 */
export function calculateSnapTarget({
  currentIndex,
  total,
  offsetInline,
  velocityInline,
  distanceThreshold = 60,
  velocityThreshold = 0.4,
}: SnapTargetParams): number {
  if (total <= 1) return 0

  let step = 0
  if (velocityInline < -velocityThreshold) {
    step = 1
  } else if (velocityInline > velocityThreshold) {
    step = -1
  } else if (offsetInline <= -distanceThreshold) {
    step = 1
  } else if (offsetInline >= distanceThreshold) {
    step = -1
  }

  const target = currentIndex + step
  return Math.max(0, Math.min(total - 1, target))
}

/**
 * Calculates close progress and backdrop opacity during vertical downward touch drag.
 */
export function calculateCloseDragProgress(
  deltaY: number,
  threshold = 120,
): CloseDragProgress {
  if (threshold <= 0 || !Number.isFinite(deltaY) || deltaY <= 0) {
    return { progress: 0, opacity: 1, shouldClose: false }
  }
  const progress = Math.min(1, Math.max(0, deltaY / threshold))
  // Fade backdrop smoothly down to ~0.2 at full threshold
  const opacity = Math.max(0.2, 1 - progress * 0.8)
  const shouldClose = deltaY >= threshold
  return { progress, opacity, shouldClose }
}
