import { describe, expect, it } from 'vitest'
import {
  applyRubberBand,
  calculateCloseDragProgress,
  calculateFittedDimensions,
  calculateSnapTarget,
  clampPan,
  clampZoom,
  swipeStep,
  wrapIndex,
} from '../app/utils/product-gallery'

describe('product-gallery utilities', () => {
  describe('wrapIndex', () => {
    it('returns 0 when total count is 0 or negative', () => {
      expect(wrapIndex(0, 0)).toBe(0)
      expect(wrapIndex(2, -1)).toBe(0)
    })

    it('returns the same index when within range', () => {
      expect(wrapIndex(0, 4)).toBe(0)
      expect(wrapIndex(1, 4)).toBe(1)
      expect(wrapIndex(3, 4)).toBe(3)
    })

    it('wraps forward past count', () => {
      expect(wrapIndex(4, 4)).toBe(0)
      expect(wrapIndex(5, 4)).toBe(1)
      expect(wrapIndex(9, 4)).toBe(1)
    })

    it('wraps backward below 0', () => {
      expect(wrapIndex(-1, 4)).toBe(3)
      expect(wrapIndex(-2, 4)).toBe(2)
      expect(wrapIndex(-4, 4)).toBe(0)
      expect(wrapIndex(-5, 4)).toBe(3)
    })
  })

  describe('swipeStep', () => {
    // Content follows the finger: next sits on the inline-end side, so a drag toward the
    // inline-start side pulls it in.
    it('ignores drags under the threshold', () => {
      expect(swipeStep(20, false, 40)).toBe(0)
      expect(swipeStep(-39, true, 40)).toBe(0)
    })

    it('LTR: dragging left shows the next image, dragging right the previous one', () => {
      expect(swipeStep(-60, false, 40)).toBe(1)
      expect(swipeStep(60, false, 40)).toBe(-1)
    })

    it('RTL: dragging right shows the next image, dragging left the previous one', () => {
      expect(swipeStep(60, true, 40)).toBe(1)
      expect(swipeStep(-60, true, 40)).toBe(-1)
    })
  })

  describe('clampZoom', () => {
    it('keeps scale within min and max', () => {
      expect(clampZoom(1.5, 1, 3)).toBe(1.5)
      expect(clampZoom(2.8, 1, 3)).toBe(2.8)
    })

    it('clamps below min to min', () => {
      expect(clampZoom(0.8, 1, 3)).toBe(1)
      expect(clampZoom(-2, 1, 3)).toBe(1)
    })

    it('clamps above max to max', () => {
      expect(clampZoom(3.5, 1, 3)).toBe(3)
      expect(clampZoom(10, 1, 3)).toBe(3)
    })

    it('handles non-finite values safely', () => {
      expect(clampZoom(NaN, 1, 3)).toBe(1)
      expect(clampZoom(Infinity, 1, 3)).toBe(1)
      expect(clampZoom(-Infinity, 1, 3)).toBe(1)
    })
  })

  describe('clampPan', () => {
    const viewport = { width: 800, height: 600 }
    const image = { width: 800, height: 600 }

    it('returns { x: 0, y: 0 } when scale is 1 or less', () => {
      expect(clampPan({ x: 50, y: -50 }, 1, viewport, image)).toEqual({ x: 0, y: 0 })
      expect(clampPan({ x: 100, y: 100 }, 0.8, viewport, image)).toEqual({ x: 0, y: 0 })
    })

    it('returns { x: 0, y: 0 } on invalid dimensions', () => {
      expect(clampPan({ x: 50, y: 50 }, 2, { width: 0, height: 600 }, image)).toEqual({ x: 0, y: 0 })
      expect(clampPan({ x: 50, y: 50 }, 2, viewport, { width: 800, height: -1 })).toEqual({ x: 0, y: 0 })
    })

    it('clamps offset within maxPan bounds when zoomed', () => {
      // scale = 2 -> scaledW = 1600, scaledH = 1200
      // maxPanX = (1600 - 800) / 2 = 400
      // maxPanY = (1200 - 600) / 2 = 300
      expect(clampPan({ x: 200, y: 150 }, 2, viewport, image)).toEqual({ x: 200, y: 150 })
      expect(clampPan({ x: 500, y: -450 }, 2, viewport, image)).toEqual({ x: 400, y: -300 })
      expect(clampPan({ x: -600, y: 400 }, 2, viewport, image)).toEqual({ x: -400, y: 300 })
    })

    it('clamps pan to 0 along an axis if scaled dimension does not exceed viewport', () => {
      const wideViewport = { width: 1200, height: 600 }
      const narrowImage = { width: 400, height: 400 }
      // scale = 2 -> scaledW = 800 <= 1200 (maxPanX = 0), scaledH = 800 > 600 (maxPanY = (800-600)/2 = 100)
      expect(clampPan({ x: 100, y: 50 }, 2, wideViewport, narrowImage)).toEqual({ x: 0, y: 50 })
      expect(clampPan({ x: 100, y: 200 }, 2, wideViewport, narrowImage)).toEqual({ x: 0, y: 100 })
    })
  })

  describe('calculateFittedDimensions', () => {
    it('fits wide image into viewport', () => {
      const viewport = { width: 800, height: 600 }
      const natural = { width: 1600, height: 800 }
      // ratio = min(800/1600, 600/800) = min(0.5, 0.75) = 0.5
      expect(calculateFittedDimensions(viewport, natural)).toEqual({ width: 800, height: 400 })
    })

    it('fits tall image into viewport', () => {
      const viewport = { width: 800, height: 600 }
      const natural = { width: 600, height: 1200 }
      // ratio = min(800/600, 600/1200) = min(1.333, 0.5) = 0.5
      expect(calculateFittedDimensions(viewport, natural)).toEqual({ width: 300, height: 600 })
    })

    it('returns { width: 0, height: 0 } on non-positive input', () => {
      expect(calculateFittedDimensions({ width: 0, height: 600 }, { width: 800, height: 600 })).toEqual({
        width: 0,
        height: 0,
      })
    })
  })

  describe('applyRubberBand', () => {
    it('returns 0 when offset is 0 or dimension is invalid', () => {
      expect(applyRubberBand(0, 500)).toBe(0)
      expect(applyRubberBand(100, 0)).toBe(0)
      expect(applyRubberBand(100, -100)).toBe(0)
      expect(applyRubberBand(NaN, 500)).toBe(0)
    })

    it('dampens positive offsets proportionally', () => {
      const damped = applyRubberBand(100, 500)
      expect(damped).toBeGreaterThan(0)
      expect(damped).toBeLessThan(100)
      // Damped value should be approximately (100 * 500 * 0.55) / (500 + 0.55 * 100) = 27500 / 555 ≈ 49.55
      expect(damped).toBeCloseTo(49.55, 1)
    })

    it('preserves sign symmetrically for negative offsets', () => {
      const positive = applyRubberBand(80, 400)
      const negative = applyRubberBand(-80, 400)
      expect(negative).toBe(-positive)
    })

    it('asymptotically approaches limit as offset increases', () => {
      const small = applyRubberBand(50, 400)
      const medium = applyRubberBand(200, 400)
      const huge = applyRubberBand(5000, 400)
      expect(small).toBeLessThan(medium)
      expect(medium).toBeLessThan(huge)
      expect(huge).toBeLessThan(400)
    })
  })

  describe('calculateSnapTarget', () => {
    // offsetInline/velocityInline are positive toward the inline-end side
    const base = { currentIndex: 1, total: 4 }

    it('stays put for small, slow drags', () => {
      expect(calculateSnapTarget({ ...base, offsetInline: 20, velocityInline: 0.1 })).toBe(1)
    })

    it('goes to the next slide on a flick or a long drag toward inline-start', () => {
      expect(calculateSnapTarget({ ...base, offsetInline: -10, velocityInline: -0.6 })).toBe(2)
      expect(calculateSnapTarget({ ...base, offsetInline: -80, velocityInline: 0 })).toBe(2)
    })

    it('goes to the previous slide on a flick or a long drag toward inline-end', () => {
      expect(calculateSnapTarget({ ...base, offsetInline: 10, velocityInline: 0.6 })).toBe(0)
      expect(calculateSnapTarget({ ...base, offsetInline: 80, velocityInline: 0 })).toBe(0)
    })

    it('lets velocity win over distance', () => {
      expect(calculateSnapTarget({ ...base, offsetInline: 80, velocityInline: -0.6 })).toBe(2)
    })

    it('does not wrap past the first or last slide', () => {
      expect(calculateSnapTarget({ currentIndex: 0, total: 4, offsetInline: 120, velocityInline: 1 })).toBe(0)
      expect(calculateSnapTarget({ currentIndex: 3, total: 4, offsetInline: -120, velocityInline: -1 })).toBe(3)
    })

    it('returns 0 for a single image', () => {
      expect(calculateSnapTarget({ currentIndex: 0, total: 1, offsetInline: -200, velocityInline: -2 })).toBe(0)
    })
  })

  describe('calculateCloseDragProgress', () => {
    it('returns zero progress when deltaY <= 0 or invalid', () => {
      expect(calculateCloseDragProgress(0, 120)).toEqual({ progress: 0, opacity: 1, shouldClose: false })
      expect(calculateCloseDragProgress(-50, 120)).toEqual({ progress: 0, opacity: 1, shouldClose: false })
      expect(calculateCloseDragProgress(50, 0)).toEqual({ progress: 0, opacity: 1, shouldClose: false })
      expect(calculateCloseDragProgress(NaN, 120)).toEqual({ progress: 0, opacity: 1, shouldClose: false })
    })

    it('calculates proportional progress and fading opacity', () => {
      const mid = calculateCloseDragProgress(60, 120)
      expect(mid.progress).toBe(0.5)
      expect(mid.opacity).toBeCloseTo(0.6, 2)
      expect(mid.shouldClose).toBe(false)
    })

    it('triggers shouldClose when deltaY reaches or exceeds threshold', () => {
      const atThreshold = calculateCloseDragProgress(120, 120)
      expect(atThreshold.progress).toBe(1)
      expect(atThreshold.opacity).toBeCloseTo(0.2, 2)
      expect(atThreshold.shouldClose).toBe(true)

      const pastThreshold = calculateCloseDragProgress(180, 120)
      expect(pastThreshold.progress).toBe(1)
      expect(pastThreshold.shouldClose).toBe(true)
    })
  })
})
