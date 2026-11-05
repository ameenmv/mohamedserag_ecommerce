export const FINISHES = ['steel', 'white', 'black', 'champagne'] as const
export type ApplianceFinish = (typeof FINISHES)[number]

/**
 * Standard cubic ease in-out curve for smooth, realistic mechanical opening.
 * Clamps input to [0, 1].
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2
}

/**
 * Calculates the current door rotation angle in radians based on progress (0..1)
 * and maximum angular swing.
 */
export function doorAngle(progress: number, maxRad: number): number {
  return easeInOutCubic(progress) * maxRad
}

/**
 * Clamps the horizontal turntable yaw around the front view.
 * Default range is ±55° (~0.96 rad).
 */
export function clampYaw(yaw: number, minRad = -0.96, maxRad = 0.96): number {
  return Math.max(minRad, Math.min(maxRad, yaw))
}

/**
 * Clamps the subtle vertical pitch tilt.
 * Default range is ±6° (~0.105 rad).
 */
export function clampPitch(pitch: number, minRad = -0.105, maxRad = 0.105): number {
  return Math.max(minRad, Math.min(maxRad, pitch))
}

/**
 * Single step of velocity decay for turntable inertia.
 * Once absolute velocity falls below minThreshold, movement terminates cleanly.
 */
export function inertiaStep(
  velocity: number,
  friction = 0.92,
  minThreshold = 0.0001,
): { velocity: number; moving: boolean } {
  const nextVelocity = velocity * friction
  if (Math.abs(nextVelocity) < minThreshold) {
    return { velocity: 0, moving: false }
  }
  return { velocity: nextVelocity, moving: true }
}

/**
 * Type-guard validating whether an unknown value is a supported ApplianceFinish.
 */
export function isValidFinish(finish: unknown): finish is ApplianceFinish {
  return typeof finish === 'string' && (FINISHES as readonly string[]).includes(finish)
}

/**
 * Calculates a smooth, organic flicker multiplier for gas flames or heat elements.
 * Generates values in [0.75, 1.25] using multi-harmonic sine waves.
 */
export function flickerFlame(time: number, seed = 0): number {
  const t = time * 20 + seed * 17.3
  const raw =
    0.88 +
    0.08 * Math.sin(t) +
    0.04 * Math.sin(t * 2.3 + 1.1) +
    0.02 * Math.sin(t * 5.7 + 2.4)
  return Math.max(0.7, Math.min(1.3, raw))
}

/**
 * Calculates motorized louver opening rotation angle in radians based on progress (0..1)
 * and maximum angular swing (default ~50°).
 */
export function louverAngle(progress: number, maxRad = (50 * Math.PI) / 180): number {
  return easeInOutCubic(progress) * maxRad
}

