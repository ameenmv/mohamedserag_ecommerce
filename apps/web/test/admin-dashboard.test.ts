import { describe, expect, it } from 'vitest'
import {
  axisTicks,
  nearestPointIndex,
  scalePoints,
  thinIndices,
} from '../app/utils/admin-charts'
import { deserializeOrdersQuery, serializeOrdersQuery } from '../app/utils/admin-orders'

describe('admin-charts utils - axisTicks', () => {
  it('returns [0] for zero and negative input', () => {
    expect(axisTicks(0)).toEqual([0])
    expect(axisTicks(-5)).toEqual([0])
  })

  it('produces integer ticks covering the raw maximum for integer data', () => {
    const ticks = axisTicks(7)
    expect(ticks[0]).toBe(0)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(7)
    expect(ticks.every((tick) => Number.isInteger(tick))).toBe(true)
    expect(ticks.every((tick, index) => index === 0 || tick > ticks[index - 1]!)).toBe(true)
  })

  it('scales fractional money data without truncating the maximum', () => {
    const ticks = axisTicks(1234.56)
    expect(ticks[0]).toBe(0)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(1234.56)
  })
})

describe('admin-charts utils - thinIndices', () => {
  it('keeps every index when the series fits the label budget', () => {
    expect(thinIndices(5)).toEqual([0, 1, 2, 3, 4])
  })

  it('always keeps the first and last indices when thinning', () => {
    const indices = thinIndices(90, 6)
    expect(indices[0]).toBe(0)
    expect(indices[indices.length - 1]).toBe(89)
    expect(indices.length).toBeLessThanOrEqual(6)
    expect(indices.every((value, index) => index === 0 || value > indices[index - 1]!)).toBe(true)
  })
})

describe('admin-charts utils - scalePoints', () => {
  it('places the oldest point on the left by default (LTR)', () => {
    const scale = scalePoints([
      { label: 'old', value: 10 },
      { label: 'new', value: 20 },
    ])
    expect(scale.positions[0]?.label).toBe('old')
    expect(scale.positions[0]!.x).toBeLessThan(scale.positions[1]!.x)
  })

  it('puts the newest point on the left when newestAtLeft is true (RTL)', () => {
    const scale = scalePoints(
      [
        { label: 'old', value: 10 },
        { label: 'new', value: 20 },
      ],
      { newestAtLeft: true },
    )
    expect(scale.positions[0]!.x).toBeGreaterThan(scale.positions[1]!.x)
  })

  it('collapses an all-zero series onto the baseline with a single grid line', () => {
    const scale = scalePoints([
      { label: 'a', value: 0 },
      { label: 'b', value: 0 },
    ])
    expect(scale.gridLines).toHaveLength(1)
    expect(scale.positions.every((position) => position.y === scale.baselineY)).toBe(true)
  })

  it('centers a single point horizontally', () => {
    const scale = scalePoints([{ label: 'only', value: 5 }])
    expect(scale.positions[0]!.xPct).toBeGreaterThan(0)
    expect(scale.positions[0]!.xPct).toBeLessThan(100)
  })

  it('exposes percentage coordinates for HTML overlays', () => {
    const scale = scalePoints([
      { label: 'a', value: 0 },
      { label: 'b', value: 100 },
    ])
    const topPoint = scale.positions[1]
    const bottomPoint = scale.positions[0]
    expect(topPoint?.yPct).toBeLessThan((scale.baselineY / scale.height) * 100)
    expect(bottomPoint?.yPct).toBeCloseTo((scale.baselineY / scale.height) * 100)
    expect(topPoint?.yPct).toBeGreaterThanOrEqual(0)
  })
})

describe('admin-charts utils - nearestPointIndex', () => {
  it('finds the closest point for a pointer ratio', () => {
    const positions = [{ xPct: 0 }, { xPct: 50 }, { xPct: 100 }]
    expect(nearestPointIndex(positions, 0)).toBe(0)
    expect(nearestPointIndex(positions, 0.4)).toBe(1)
    expect(nearestPointIndex(positions, 1)).toBe(2)
  })
})

describe('admin-orders utils - lockExpiring roundtrip', () => {
  it('deserializes ?type=bridal&lockExpiring=7 from the dashboard counter link', () => {
    const res = deserializeOrdersQuery({ type: 'bridal', lockExpiring: '7' })
    expect(res.type).toBe('bridal')
    expect(res.lockExpiring).toBe(7)
  })

  it('drops invalid lockExpiring values without resetting other filters', () => {
    const res = deserializeOrdersQuery({ type: 'bridal', lockExpiring: '30' })
    expect(res.type).toBe('bridal')
    expect(res.lockExpiring).toBeUndefined()
  })

  it('serializes the lockExpiring filter into the URL query', () => {
    const query = serializeOrdersQuery({ type: 'bridal', lockExpiring: 7 })
    expect(query).toEqual({ type: 'bridal', lockExpiring: 7 })
  })

  it('omits lockExpiring when absent', () => {
    const query = serializeOrdersQuery({ type: 'bridal' })
    expect(query).toEqual({ type: 'bridal' })
  })
})
