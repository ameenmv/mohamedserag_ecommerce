import { describe, expect, it } from 'vitest'
import {
  couponStatusTone,
  couponUsageDescriptor,
  couponValueDescriptor,
  datetimeLocalToIso,
  flashStatusTone,
  isoToDatetimeLocal,
} from '../app/utils/admin-promotions'

describe('isoToDatetimeLocal', () => {
  it('formats an ISO date string into YYYY-MM-DDTHH:mm using local time parts', () => {
    const d = new Date(2026, 9, 19, 14, 30) // local time 2026-10-19 14:30
    const iso = d.toISOString()
    expect(isoToDatetimeLocal(iso)).toBe('2026-10-19T14:30')
  })

  it('pads single-digit month, day, hour, and minute with zeroes', () => {
    const d = new Date(2026, 0, 5, 8, 5) // local time 2026-01-05 08:05
    const iso = d.toISOString()
    expect(isoToDatetimeLocal(iso)).toBe('2026-01-05T08:05')
  })

  it('returns empty string for null, undefined, empty, or invalid input', () => {
    expect(isoToDatetimeLocal(null)).toBe('')
    expect(isoToDatetimeLocal(undefined)).toBe('')
    expect(isoToDatetimeLocal('')).toBe('')
    expect(isoToDatetimeLocal('invalid-date')).toBe('')
  })
})

describe('datetimeLocalToIso', () => {
  it('converts a local YYYY-MM-DDTHH:mm string into a UTC ISO string', () => {
    const localInput = '2026-10-19T14:30'
    const iso = datetimeLocalToIso(localInput)
    expect(iso).not.toBeNull()
    const parsed = new Date(iso!)
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(9) // October
    expect(parsed.getDate()).toBe(19)
    expect(parsed.getHours()).toBe(14)
    expect(parsed.getMinutes()).toBe(30)
  })

  it('round-trips safely with isoToDatetimeLocal', () => {
    const originalLocal = '2026-12-31T23:59'
    const iso = datetimeLocalToIso(originalLocal)
    expect(iso).not.toBeNull()
    const backToLocal = isoToDatetimeLocal(iso)
    expect(backToLocal).toBe(originalLocal)
  })

  it('returns null for null, undefined, whitespace, or invalid strings', () => {
    expect(datetimeLocalToIso(null)).toBeNull()
    expect(datetimeLocalToIso(undefined)).toBeNull()
    expect(datetimeLocalToIso('')).toBeNull()
    expect(datetimeLocalToIso('   ')).toBeNull()
    expect(datetimeLocalToIso('not-a-datetime')).toBeNull()
  })
})

describe('flashStatusTone', () => {
  it('maps running to default badge variant', () => {
    expect(flashStatusTone('running')).toBe('default')
  })

  it('maps scheduled to secondary badge variant', () => {
    expect(flashStatusTone('scheduled')).toBe('secondary')
  })

  it('maps ended and unknown status to outline badge variant', () => {
    expect(flashStatusTone('ended')).toBe('outline')
    expect(flashStatusTone('unknown')).toBe('outline')
  })
})

describe('couponStatusTone', () => {
  it('maps running to default', () => {
    expect(couponStatusTone('running')).toBe('default')
  })

  it('maps scheduled to secondary', () => {
    expect(couponStatusTone('scheduled')).toBe('secondary')
  })

  it('maps expired to outline', () => {
    expect(couponStatusTone('expired')).toBe('outline')
  })

  it('maps inactive and unknown to destructive', () => {
    expect(couponStatusTone('inactive')).toBe('destructive')
    expect(couponStatusTone('unknown')).toBe('destructive')
  })
})

describe('couponValueDescriptor', () => {
  it('returns percent descriptor with value param', () => {
    const res = couponValueDescriptor('percent', 15)
    expect(res).toEqual({
      key: 'admin.promotions.coupons.percentValue',
      params: { value: 15 },
    })
  })

  it('returns fixed descriptor with value param', () => {
    const res = couponValueDescriptor('fixed', 5000)
    expect(res).toEqual({
      key: 'admin.promotions.coupons.fixedValue',
      params: { value: 5000 },
    })
  })
})

describe('couponUsageDescriptor', () => {
  it('identifies unlimited usage when maxUses is null, undefined, or zero', () => {
    expect(couponUsageDescriptor(0, null)).toEqual({
      activeUses: 0,
      maxUses: null,
      isUnlimited: true,
    })
    expect(couponUsageDescriptor(2, undefined)).toEqual({
      activeUses: 2,
      maxUses: null,
      isUnlimited: true,
    })
    expect(couponUsageDescriptor(5, 0)).toEqual({
      activeUses: 5,
      maxUses: null,
      isUnlimited: true,
    })
  })

  it('formats limited usage correctly', () => {
    expect(couponUsageDescriptor(10, 100)).toEqual({
      activeUses: 10,
      maxUses: 100,
      isUnlimited: false,
    })
  })

  it('guards against negative activeUses', () => {
    expect(couponUsageDescriptor(-3, 50)).toEqual({
      activeUses: 0,
      maxUses: 50,
      isUnlimited: false,
    })
  })
})
