import { describe, expect, it } from 'vitest'
import {
  FINISHES,
  clampPitch,
  clampYaw,
  doorAngle,
  easeInOutCubic,
  inertiaStep,
  isValidFinish,
} from '../app/utils/appliance3d/math'

describe('appliance3d math utilities', () => {
  describe('easeInOutCubic', () => {
    it('returns exact boundary values', () => {
      expect(easeInOutCubic(0)).toBe(0)
      expect(easeInOutCubic(1)).toBe(1)
      expect(easeInOutCubic(0.5)).toBe(0.5)
    })

    it('clamps values outside [0, 1]', () => {
      expect(easeInOutCubic(-0.5)).toBe(0)
      expect(easeInOutCubic(1.5)).toBe(1)
    })

    it('monotonically increases across the interval', () => {
      const samples = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => easeInOutCubic(t))
      for (let i = 1; i < samples.length; i++) {
        expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]!)
      }
    })

    it('displays characteristic S-curve ease-in ease-out behavior', () => {
      // Near 0, cubic growth is slow: at 0.1, 4 * 0.001 = 0.004 (< 0.1)
      expect(easeInOutCubic(0.1)).toBeLessThan(0.1)
      // Near 1, cubic deceleration is slow: at 0.9, 1 - 4 * 0.001 = 0.996 (> 0.9)
      expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9)
    })
  })

  describe('doorAngle', () => {
    const maxRad105 = (105 * Math.PI) / 180

    it('evaluates to 0 at progress 0 and maxRad at progress 1', () => {
      expect(doorAngle(0, maxRad105)).toBe(0)
      expect(doorAngle(1, maxRad105)).toBeCloseTo(maxRad105, 5)
    })

    it('evaluates to half the max angle at midpoint', () => {
      expect(doorAngle(0.5, maxRad105)).toBeCloseTo(maxRad105 / 2, 5)
    })
  })

  describe('clampYaw', () => {
    it('preserves values within the default ±55° (~0.96 rad) range', () => {
      expect(clampYaw(0)).toBe(0)
      expect(clampYaw(0.5)).toBe(0.5)
      expect(clampYaw(-0.5)).toBe(-0.5)
    })

    it('clamps values exceeding upper or lower bounds', () => {
      expect(clampYaw(1.5)).toBe(0.96)
      expect(clampYaw(-1.5)).toBe(-0.96)
    })

    it('respects custom minimum and maximum bounds', () => {
      expect(clampYaw(0.8, -0.4, 0.4)).toBe(0.4)
      expect(clampYaw(-0.8, -0.4, 0.4)).toBe(-0.4)
    })
  })

  describe('clampPitch', () => {
    it('preserves values within the default ±6° (~0.105 rad) range', () => {
      expect(clampPitch(0.05)).toBe(0.05)
      expect(clampPitch(-0.05)).toBe(-0.05)
    })

    it('clamps values outside the pitch limit', () => {
      expect(clampPitch(0.5)).toBe(0.105)
      expect(clampPitch(-0.5)).toBe(-0.105)
    })
  })

  describe('inertiaStep', () => {
    it('decays velocity by the friction multiplier', () => {
      const result = inertiaStep(0.1, 0.9, 0.001)
      expect(result.velocity).toBeCloseTo(0.09, 5)
      expect(result.moving).toBe(true)
    })

    it('stops motion once velocity is below the threshold', () => {
      const result = inertiaStep(0.0005, 0.9, 0.001)
      expect(result.velocity).toBe(0)
      expect(result.moving).toBe(false)
    })

    it('handles negative velocity symmetrically', () => {
      const result = inertiaStep(-0.1, 0.9, 0.001)
      expect(result.velocity).toBeCloseTo(-0.09, 5)
      expect(result.moving).toBe(true)

      const stopped = inertiaStep(-0.0005, 0.9, 0.001)
      expect(stopped.velocity).toBe(0)
      expect(stopped.moving).toBe(false)
    })
  })

  describe('isValidFinish', () => {
    it('validates each finish defined in FINISHES', () => {
      for (const finish of FINISHES) {
        expect(isValidFinish(finish)).toBe(true)
      }
    })

    it('rejects unsupported finish strings', () => {
      expect(isValidFinish('gold')).toBe(false)
      expect(isValidFinish('silver')).toBe(false)
      expect(isValidFinish('red')).toBe(false)
      expect(isValidFinish('')).toBe(false)
    })

    it('rejects non-string inputs safely', () => {
      expect(isValidFinish(null)).toBe(false)
      expect(isValidFinish(undefined)).toBe(false)
      expect(isValidFinish(123)).toBe(false)
      expect(isValidFinish({})).toBe(false)
      expect(isValidFinish(['steel'])).toBe(false)
    })
  })
})
