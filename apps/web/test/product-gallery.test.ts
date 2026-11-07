import { describe, expect, it } from 'vitest'
import {
  calculateFittedDimensions,
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
    describe('LTR', () => {
      const isRtl = false

      it('returns 0 when swipe does not exceed threshold', () => {
        expect(swipeStep(0, isRtl, 40)).toBe(0)
        expect(swipeStep(39, isRtl, 40)).toBe(0)
        expect(swipeStep(-39, isRtl, 40)).toBe(0)
      })

      it('returns 1 (next) when swiping left (negative deltaX)', () => {
        expect(swipeStep(-40, isRtl, 40)).toBe(1)
        expect(swipeStep(-120, isRtl, 40)).toBe(1)
      })

      it('returns -1 (prev) when swiping right (positive deltaX)', () => {
        expect(swipeStep(40, isRtl, 40)).toBe(-1)
        expect(swipeStep(150, isRtl, 40)).toBe(-1)
      })
    })

    describe('RTL', () => {
      const isRtl = true

      it('returns 0 when swipe does not exceed threshold', () => {
        expect(swipeStep(0, isRtl, 40)).toBe(0)
        expect(swipeStep(30, isRtl, 40)).toBe(0)
        expect(swipeStep(-30, isRtl, 40)).toBe(0)
      })

      it('returns 1 (next) when swiping right (positive deltaX), pulling left-positioned next slide', () => {
        expect(swipeStep(40, isRtl, 40)).toBe(1)
        expect(swipeStep(100, isRtl, 40)).toBe(1)
      })

      it('returns -1 (prev) when swiping left (negative deltaX), pulling right-positioned prev slide', () => {
        expect(swipeStep(-40, isRtl, 40)).toBe(-1)
        expect(swipeStep(-100, isRtl, 40)).toBe(-1)
      })
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
})
