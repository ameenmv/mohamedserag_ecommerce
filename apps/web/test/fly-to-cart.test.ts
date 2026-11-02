import { describe, expect, it } from 'vitest'
import { flightPath } from '../app/utils/fly-to-cart'
import type { Rect } from '../app/utils/fly-to-cart'

describe('flightPath', () => {
  const source: Rect = { left: 100, top: 300, width: 200, height: 200 }
  const targetRight: Rect = { left: 800, top: 40, width: 60, height: 60 }
  const targetLeft: Rect = { left: 20, top: 40, width: 60, height: 60 }

  it('centers start and end points on the source and target rects', () => {
    const size = 72
    const path = flightPath(source, targetRight, size)

    // Source center is (100 + 100, 300 + 100) = (200, 400); minus size/2 (36) => (164, 364)
    expect(path.start.x).toBe(164)
    expect(path.start.y).toBe(364)

    // Target center is (800 + 30, 40 + 30) = (830, 70); minus 36 => (794, 34)
    expect(path.end.x).toBe(794)
    expect(path.end.y).toBe(34)
  })

  it('places the midpoint 140px above both start and end y', () => {
    const path = flightPath(source, targetRight)
    const minY = Math.min(path.start.y, path.end.y)

    expect(path.mid.y).toBe(minY - 140)
    expect(path.mid.y).toBeLessThan(path.start.y)
    expect(path.mid.y).toBeLessThan(path.end.y)
  })

  it('computes mid x between start and end when target is to the right', () => {
    const path = flightPath(source, targetRight)

    expect(path.mid.x).toBe((path.start.x + path.end.x) / 2)
    expect(path.start.x).toBeLessThan(path.mid.x)
    expect(path.mid.x).toBeLessThan(path.end.x)
  })

  it('computes mid x between start and end when target is to the left', () => {
    const path = flightPath(source, targetLeft)

    expect(path.mid.x).toBe((path.start.x + path.end.x) / 2)
    expect(path.start.x).toBeGreaterThan(path.mid.x)
    expect(path.mid.x).toBeGreaterThan(path.end.x)
  })

  it('handles target below the source correctly', () => {
    const targetBelow: Rect = { left: 150, top: 800, width: 50, height: 50 }
    const path = flightPath(source, targetBelow)

    // Start y (364) is above end y (800 + 25 - 36 = 789); mid y is 140px above start y
    expect(path.mid.y).toBe(path.start.y - 140)
    expect(path.mid.y).toBeLessThan(path.start.y)
    expect(path.mid.y).toBeLessThan(path.end.y)
  })

  it('supports custom flyer sizes', () => {
    const customSize = 80
    const path = flightPath(source, targetRight, customSize)

    // Source center (200, 400) minus 40 => (160, 360)
    expect(path.start.x).toBe(160)
    expect(path.start.y).toBe(360)

    // Target center (830, 70) minus 40 => (790, 30)
    expect(path.end.x).toBe(790)
    expect(path.end.y).toBe(30)
  })
})
