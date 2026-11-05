import { describe, expect, it } from 'vitest'
import {
  calculateTargetPosition,
  clamp,
  clampToViewport,
  lerp,
  tiltFromVelocity,
} from '../app/utils/cursor-preview'

describe('cursor-preview pure helpers', () => {
  describe('lerp', () => {
    it('returns start when factor is 0', () => {
      expect(lerp(10, 100, 0)).toBe(10)
    })

    it('returns target when factor is 1', () => {
      expect(lerp(10, 100, 1)).toBe(100)
    })

    it('interpolates midpoint correctly', () => {
      expect(lerp(0, 100, 0.5)).toBe(50)
    })

    it('interpolates with custom factor (0.14)', () => {
      expect(lerp(0, 100, 0.14)).toBeCloseTo(14)
    })

    it('handles negative coordinates correctly', () => {
      expect(lerp(-100, 100, 0.5)).toBe(0)
      expect(lerp(100, -100, 0.25)).toBe(50)
    })

    it('handles start equal to target', () => {
      expect(lerp(42, 42, 0.5)).toBe(42)
    })
  })

  describe('clamp', () => {
    it('keeps value when within min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('clamps to min when value is below', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('clamps to max when value is above', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('handles reversed bounds gracefully', () => {
      expect(clamp(5, 10, 0)).toBe(5)
      expect(clamp(15, 10, 0)).toBe(10)
    })
  })

  describe('clampToViewport', () => {
    const width = 320
    const height = 400
    const viewportWidth = 1200
    const viewportHeight = 800
    const padding = 20

    it('keeps position within bounds untouched', () => {
      const pos = clampToViewport(200, 150, width, height, viewportWidth, viewportHeight, padding)
      expect(pos).toEqual({ x: 200, y: 150 })
    })

    it('clamps x when exceeding left/start boundary', () => {
      const pos = clampToViewport(5, 150, width, height, viewportWidth, viewportHeight, padding)
      expect(pos.x).toBe(20)
    })

    it('clamps x when exceeding right/end boundary', () => {
      const pos = clampToViewport(1000, 150, width, height, viewportWidth, viewportHeight, padding)
      expect(pos.x).toBe(viewportWidth - width - padding) // 1200 - 320 - 20 = 860
    })

    it('clamps y when exceeding top boundary', () => {
      const pos = clampToViewport(200, -50, width, height, viewportWidth, viewportHeight, padding)
      expect(pos.y).toBe(20)
    })

    it('clamps y when exceeding bottom boundary', () => {
      const pos = clampToViewport(200, 600, width, height, viewportWidth, viewportHeight, padding)
      expect(pos.y).toBe(viewportHeight - height - padding) // 800 - 400 - 20 = 380
    })

    it('clamps gracefully when viewport is smaller than box + padding', () => {
      const pos = clampToViewport(50, 50, 400, 400, 300, 300, 20)
      expect(pos.x).toBe(20)
      expect(pos.y).toBe(20)
    })
  })

  describe('tiltFromVelocity', () => {
    it('returns 0 when velocity is 0', () => {
      expect(tiltFromVelocity(0)).toBe(0)
    })

    it('returns positive tilt for positive horizontal velocity', () => {
      expect(tiltFromVelocity(20, 6, 0.15)).toBe(3)
    })

    it('returns negative tilt for negative horizontal velocity', () => {
      expect(tiltFromVelocity(-20, 6, 0.15)).toBe(-3)
    })

    it('clamps to maxTilt (+6deg by default)', () => {
      expect(tiltFromVelocity(100, 6, 0.15)).toBe(6)
    })

    it('clamps to -maxTilt (-6deg by default)', () => {
      expect(tiltFromVelocity(-100, 6, 0.15)).toBe(-6)
    })

    it('handles non-finite values safely', () => {
      expect(tiltFromVelocity(Number.NaN)).toBe(0)
      expect(tiltFromVelocity(Number.POSITIVE_INFINITY)).toBe(0)
    })
  })

  describe('calculateTargetPosition', () => {
    const width = 320
    const height = 400
    const viewportWidth = 1440
    const viewportHeight = 900

    it('places preview to the right in LTR when room is available', () => {
      const pos = calculateTargetPosition(200, 400, width, height, viewportWidth, viewportHeight, {
        offset: 28,
        padding: 20,
        isRtl: false,
      })
      expect(pos.x).toBe(228) // 200 + 28
      expect(pos.y).toBe(200) // 400 - 400/2
    })

    it('flips preview to the left in LTR when near right edge', () => {
      const pos = calculateTargetPosition(1300, 400, width, height, viewportWidth, viewportHeight, {
        offset: 28,
        padding: 20,
        isRtl: false,
      })
      expect(pos.x).toBe(1300 - 320 - 28) // 952
    })

    it('places preview to the left in RTL when room is available', () => {
      const pos = calculateTargetPosition(800, 400, width, height, viewportWidth, viewportHeight, {
        offset: 28,
        padding: 20,
        isRtl: true,
      })
      expect(pos.x).toBe(800 - 320 - 28) // 452
    })

    it('flips preview to the right in RTL when near left edge', () => {
      const pos = calculateTargetPosition(100, 400, width, height, viewportWidth, viewportHeight, {
        offset: 28,
        padding: 20,
        isRtl: true,
      })
      expect(pos.x).toBe(100 + 28) // 128
    })
  })
})
