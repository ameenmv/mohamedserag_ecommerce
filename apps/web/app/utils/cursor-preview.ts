/**
 * Pure math and geometry helpers for the cursor-following category preview tile.
 * Zero framework dependencies; fully testable in Vitest.
 */

/**
 * Linearly interpolates between start and target values by factor.
 */
export function lerp(start: number, target: number, factor: number): number {
  return start + (target - start) * factor
}

/**
 * Clamps a number between min and max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  const lower = Math.min(min, max)
  const upper = Math.max(min, max)
  return Math.min(Math.max(value, lower), upper)
}

/**
 * Clamps a rectangular box (x, y, width, height) within viewport boundaries,
 * keeping at least `padding` pixels of distance from all screen edges.
 */
export function clampToViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 16,
): { x: number; y: number } {
  const minX = padding
  const maxX = Math.max(padding, viewportWidth - width - padding)
  const minY = padding
  const maxY = Math.max(padding, viewportHeight - height - padding)

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  }
}

/**
 * Computes a small rotation angle (in degrees) proportional to horizontal cursor velocity vx,
 * capped within [-maxTilt, +maxTilt] degrees.
 */
export function tiltFromVelocity(vx: number, maxTilt = 6, factor = 0.15): number {
  if (!Number.isFinite(vx)) return 0
  const tilt = vx * factor
  return clamp(tilt, -maxTilt, maxTilt)
}

export interface CalculateTargetPositionOptions {
  offset?: number
  padding?: number
  isRtl?: boolean
}

/**
 * Computes the target (x, y) coordinates for a floating preview beside the cursor,
 * choosing side based on layout direction and screen edge clearance, then clamping to viewport.
 */
export function calculateTargetPosition(
  cursorX: number,
  cursorY: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  options: CalculateTargetPositionOptions = {},
): { x: number; y: number } {
  const { offset = 28, padding = 16, isRtl = false } = options

  let candidateX: number
  if (isRtl) {
    // In RTL, candidate sits toward inline-end (screen left) first
    candidateX = cursorX - width - offset
    if (candidateX < padding && cursorX + offset + width <= viewportWidth - padding) {
      candidateX = cursorX + offset
    }
  } else {
    // In LTR, candidate sits toward inline-end (screen right) first
    candidateX = cursorX + offset
    if (candidateX + width > viewportWidth - padding && cursorX - width - offset >= padding) {
      candidateX = cursorX - width - offset
    }
  }

  // Center vertically relative to cursor
  const candidateY = cursorY - height / 2

  return clampToViewport(candidateX, candidateY, width, height, viewportWidth, viewportHeight, padding)
}
