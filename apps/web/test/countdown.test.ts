import { describe, expect, it } from 'vitest'
import {
  formatCountdownClock,
  getCountdownSplit,
  splitRemainingMs,
} from '../app/utils/countdown'

describe('countdown utils', () => {
  it('returns zeros and isEnded: true for non-positive milliseconds', () => {
    const zero = splitRemainingMs(0)
    expect(zero).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isEnded: true,
    })

    const negative = splitRemainingMs(-5000)
    expect(negative).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isEnded: true,
    })
  })

  it('correctly splits sub-24-hour durations', () => {
    // 3 hours, 25 minutes, 42 seconds = (3 * 3600 + 25 * 60 + 42) * 1000 = 12342000 ms
    const ms = (3 * 3600 + 25 * 60 + 42) * 1000
    const split = splitRemainingMs(ms)

    expect(split.days).toBe(0)
    expect(split.hours).toBe(3)
    expect(split.minutes).toBe(25)
    expect(split.seconds).toBe(42)
    expect(split.isEnded).toBe(false)
  })

  it('correctly splits durations >= 24 hours', () => {
    // 2 days, 5 hours, 12 minutes, 10 seconds
    const ms = ((2 * 24 + 5) * 3600 + 12 * 60 + 10) * 1000
    const split = splitRemainingMs(ms)

    expect(split.days).toBe(2)
    expect(split.hours).toBe(5)
    expect(split.minutes).toBe(12)
    expect(split.seconds).toBe(10)
    expect(split.isEnded).toBe(false)
  })

  it('calculates countdown split from Date objects and strings', () => {
    const now = new Date('2026-10-19T10:00:00Z')
    const endsAt = new Date('2026-10-19T12:30:15Z')
    const split = getCountdownSplit(endsAt, now)

    expect(split.days).toBe(0)
    expect(split.hours).toBe(2)
    expect(split.minutes).toBe(30)
    expect(split.seconds).toBe(15)
    expect(split.isEnded).toBe(false)
  })

  it('formats the clock with Latin digits, dropping seconds once days are shown', () => {
    const sub24 = splitRemainingMs((3 * 3600 + 5 * 60 + 9) * 1000)
    expect(formatCountdownClock(sub24)).toBe('03:05:09')

    const multiDay = splitRemainingMs(((3 * 24 + 4) * 3600 + 15 * 60) * 1000)
    expect(formatCountdownClock(multiDay)).toBe('04:15')

    expect(formatCountdownClock(splitRemainingMs(0))).toBe('')
  })
})
