export interface PanOffset {
  x: number
  y: number
}

export interface BoxDimensions {
  width: number
  height: number
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
 * Convention:
 * - In LTR: Next images sit to the right. Swiping left (deltaX <= -threshold) pulls
 *   the right content into view -> returns 1 (next). Swiping right (deltaX >= threshold)
 *   pulls the left content into view -> returns -1 (prev).
 * - In RTL: Next images sit to the left (matching the visual order of thumbnails:
 *   [2] [1] [0]). Swiping right (deltaX >= threshold) pulls the left content into view
 *   -> returns 1 (next). Swiping left (deltaX <= -threshold) pulls the right content
 *   into view -> returns -1 (prev).
 */
export function swipeStep(
  deltaX: number,
  isRtl: boolean,
  threshold = 40,
): -1 | 0 | 1 {
  if (Math.abs(deltaX) < threshold) return 0
  if (isRtl) {
    return deltaX > 0 ? 1 : -1
  }
  return deltaX < 0 ? 1 : -1
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
