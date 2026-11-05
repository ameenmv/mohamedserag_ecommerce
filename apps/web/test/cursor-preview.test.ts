import { describe, expect, it } from 'vitest'
import {
  calculateTargetPosition,
  clamp,
  clampToViewport,
  lerp,
  tiltFromVelocity,
  zoneIndex,
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
    const height = 300
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
      expect(pos.y).toBe(viewportHeight - height - padding) // 800 - 300 - 20 = 480
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
    const height = 300
    const viewportWidth = 1440
    const viewportHeight = 900

    it('places preview to the right in LTR when room is available', () => {
      const pos = calculateTargetPosition(200, 400, width, height, viewportWidth, viewportHeight, {
        offset: 28,
        padding: 20,
        isRtl: false,
      })
      expect(pos.x).toBe(228) // 200 + 28
      expect(pos.y).toBe(250) // 400 - 300/2
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

  describe('zoneIndex', () => {
    const rowRect = { left: 100, width: 300 }

    it('returns 0 when count is 1', () => {
      expect(zoneIndex(150, rowRect, 1, false)).toBe(0)
      expect(zoneIndex(250, rowRect, 1, false)).toBe(0)
      expect(zoneIndex(350, rowRect, 1, true)).toBe(0)
    })

    it('returns 0 when count <= 0 or width <= 0', () => {
      expect(zoneIndex(150, rowRect, 0, false)).toBe(0)
      expect(zoneIndex(150, { left: 100, width: 0 }, 3, false)).toBe(0)
    })

    it('computes correct zones in LTR for count = 3', () => {
      // Zone 0: [100, 200)
      expect(zoneIndex(100, rowRect, 3, false)).toBe(0)
      expect(zoneIndex(150, rowRect, 3, false)).toBe(0)
      expect(zoneIndex(199, rowRect, 3, false)).toBe(0)

      // Zone 1: [200, 300)
      expect(zoneIndex(200, rowRect, 3, false)).toBe(1)
      expect(zoneIndex(250, rowRect, 3, false)).toBe(1)
      expect(zoneIndex(299, rowRect, 3, false)).toBe(1)

      // Zone 2: [300, 400]
      expect(zoneIndex(300, rowRect, 3, false)).toBe(2)
      expect(zoneIndex(350, rowRect, 3, false)).toBe(2)
      expect(zoneIndex(400, rowRect, 3, false)).toBe(2)
    })

    it('computes correct zones in RTL for count = 3 (start is right side)', () => {
      // Right edge is 400. Start of row is zone 0.
      // Zone 0: (300, 400]
      expect(zoneIndex(400, rowRect, 3, true)).toBe(0)
      expect(zoneIndex(350, rowRect, 3, true)).toBe(0)
      expect(zoneIndex(301, rowRect, 3, true)).toBe(0)

      // Zone 1: (200, 300]
      expect(zoneIndex(300, rowRect, 3, true)).toBe(1)
      expect(zoneIndex(250, rowRect, 3, true)).toBe(1)
      expect(zoneIndex(201, rowRect, 3, true)).toBe(1)

      // Zone 2: [100, 200]
      expect(zoneIndex(200, rowRect, 3, true)).toBe(2)
      expect(zoneIndex(150, rowRect, 3, true)).toBe(2)
      expect(zoneIndex(100, rowRect, 3, true)).toBe(2)
    })

    it('clamps edge values exceeding row boundaries in LTR', () => {
      expect(zoneIndex(50, rowRect, 3, false)).toBe(0)
      expect(zoneIndex(-100, rowRect, 3, false)).toBe(0)
      expect(zoneIndex(450, rowRect, 3, false)).toBe(2)
      expect(zoneIndex(9999, rowRect, 3, false)).toBe(2)
    })

    it('clamps edge values exceeding row boundaries in RTL', () => {
      // Cursor beyond right edge (before start) clamps to 0
      expect(zoneIndex(450, rowRect, 3, true)).toBe(0)
      expect(zoneIndex(9999, rowRect, 3, true)).toBe(0)

      // Cursor beyond left edge (past end) clamps to count - 1 (2)
      expect(zoneIndex(50, rowRect, 3, true)).toBe(2)
      expect(zoneIndex(-100, rowRect, 3, true)).toBe(2)
    })

    it('computes correct zones for count = 2 in both LTR and RTL', () => {
      // LTR: midpoint is 250
      expect(zoneIndex(150, rowRect, 2, false)).toBe(0)
      expect(zoneIndex(300, rowRect, 2, false)).toBe(1)

      // RTL: midpoint is 250
      expect(zoneIndex(300, rowRect, 2, true)).toBe(0)
      expect(zoneIndex(150, rowRect, 2, true)).toBe(1)
    })
  })
})
