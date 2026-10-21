import { describe, expect, it } from 'vitest'
import {
  averageOrderValue,
  bucketKey,
  bucketKeys,
  cairoDateKey,
  fillBuckets,
  percent,
  previousRange,
  reportCsvRows,
  resolveReportRange,
  splitDiscount,
  type RevenueReport,
} from './reports.js'

describe('cairoDateKey', () => {
  it('uses Cairo time, not UTC, near midnight', () => {
    // 2026-01-31T22:30Z is 2026-02-01T00:30 in Cairo (UTC+2 in winter).
    expect(cairoDateKey(new Date('2026-01-31T22:30:00Z'))).toBe('2026-02-01')
    expect(cairoDateKey(new Date('2026-01-31T21:30:00Z'))).toBe('2026-01-31')
  })
})

describe('resolveReportRange', () => {
  const now = new Date('2026-03-15T12:00:00Z')

  it('today preset', () => {
    expect(resolveReportRange({ preset: 'today' }, now)).toEqual({
      from: '2026-03-15',
      to: '2026-03-15',
    })
  })

  it('7d is today and the 6 days before', () => {
    expect(resolveReportRange({ preset: '7d' }, now)).toEqual({
      from: '2026-03-09',
      to: '2026-03-15',
    })
  })

  it('30d and 90d spans', () => {
    expect(resolveReportRange({ preset: '30d' }, now)).toEqual({
      from: '2026-02-14',
      to: '2026-03-15',
    })
    expect(resolveReportRange({ preset: '90d' }, now)).toEqual({
      from: '2025-12-16',
      to: '2026-03-15',
    })
  })

  it('this_month starts on the 1st', () => {
    expect(resolveReportRange({ preset: 'this_month' }, now)).toEqual({
      from: '2026-03-01',
      to: '2026-03-15',
    })
  })

  it('last_month is the full previous month', () => {
    expect(resolveReportRange({ preset: 'last_month' }, now)).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('last_month across a year boundary', () => {
    expect(resolveReportRange({ preset: 'last_month' }, new Date('2026-01-10T12:00:00Z'))).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    })
  })

  it('last_month handles a leap February', () => {
    expect(resolveReportRange({ preset: 'last_month' }, new Date('2024-03-05T12:00:00Z'))).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    })
  })

  it('custom from/to is returned as given', () => {
    expect(
      resolveReportRange({ from: '2026-01-02', to: '2026-01-05' }, now),
    ).toEqual({ from: '2026-01-02', to: '2026-01-05' })
  })

  it('presets use the Cairo date when UTC date differs', () => {
    // 2026-03-14T22:30Z is 2026-03-15 in Cairo.
    const lateNight = new Date('2026-03-14T22:30:00Z')
    expect(resolveReportRange({ preset: 'today' }, lateNight)).toEqual({
      from: '2026-03-15',
      to: '2026-03-15',
    })
  })
})

describe('bucketKey', () => {
  it('day is the date itself', () => {
    expect(bucketKey('2026-03-15', 'day')).toBe('2026-03-15')
  })

  it('week starts on Saturday', () => {
    // 2026-03-15 is a Sunday; its Saturday-start week begins 2026-03-14.
    expect(bucketKey('2026-03-15', 'week')).toBe('2026-03-14')
    // Saturday maps to itself.
    expect(bucketKey('2026-03-14', 'week')).toBe('2026-03-14')
    // Friday 2026-03-13 belongs to the week starting 2026-03-07.
    expect(bucketKey('2026-03-13', 'week')).toBe('2026-03-07')
  })

  it('month is YYYY-MM', () => {
    expect(bucketKey('2026-03-15', 'month')).toBe('2026-03')
  })
})

describe('bucketKeys + fillBuckets', () => {
  it('lists unique ordered day keys', () => {
    expect(bucketKeys({ from: '2026-03-13', to: '2026-03-15' }, 'day')).toEqual([
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
    ])
  })

  it('collapses week buckets', () => {
    expect(bucketKeys({ from: '2026-03-07', to: '2026-03-15' }, 'week')).toEqual([
      '2026-03-07',
      '2026-03-14',
    ])
  })

  it('fills empty buckets densely', () => {
    const rows = [{ key: '2026-03-14', value: 5 }]
    const filled = fillBuckets({ from: '2026-03-13', to: '2026-03-15' }, 'day', rows, (key) => ({
      key,
      value: 0,
    }))
    expect(filled).toEqual([
      { key: '2026-03-13', value: 0 },
      { key: '2026-03-14', value: 5 },
      { key: '2026-03-15', value: 0 },
    ])
  })
})

describe('previousRange', () => {
  it('returns the equal-length range just before', () => {
    expect(previousRange({ from: '2026-03-09', to: '2026-03-15' })).toEqual({
      from: '2026-03-02',
      to: '2026-03-08',
    })
  })

  it('handles a single-day range', () => {
    expect(previousRange({ from: '2026-03-15', to: '2026-03-15' })).toEqual({
      from: '2026-03-14',
      to: '2026-03-14',
    })
  })
})

describe('averageOrderValue + percent', () => {
  it('rounds AOV and returns 0 without orders', () => {
    expect(averageOrderValue(10000, 3)).toBe(3333)
    expect(averageOrderValue(0, 0)).toBe(0)
    expect(averageOrderValue(500, 0)).toBe(0)
  })

  it('percent is one decimal and 0 when whole is 0', () => {
    expect(percent(1, 3)).toBe(33.3)
    expect(percent(2, 4)).toBe(50)
    expect(percent(5, 0)).toBe(0)
  })
})

describe('splitDiscount', () => {
  it('sums exactly to the discount (largest remainder)', () => {
    const lines = [
      { key: 'a', amount: 1000 },
      { key: 'b', amount: 1000 },
      { key: 'c', amount: 1000 },
    ]
    const shares = splitDiscount(lines, 100)
    const total = [...shares.values()].reduce((sum, value) => sum + value, 0)
    expect(total).toBe(100)
    expect(shares.get('a')).toBe(34)
    expect(shares.get('b')).toBe(33)
    expect(shares.get('c')).toBe(33)
  })

  it('distributes proportionally to amount', () => {
    const lines = [
      { key: 'a', amount: 300 },
      { key: 'b', amount: 100 },
    ]
    const shares = splitDiscount(lines, 100)
    expect(shares.get('a')).toBe(75)
    expect(shares.get('b')).toBe(25)
  })

  it('handles zero total and empty input', () => {
    expect([...splitDiscount([], 100).values()]).toEqual([])
    const shares = splitDiscount([{ key: 'a', amount: 0 }], 100)
    expect(shares.get('a')).toBe(0)
  })
})

describe('reportCsvRows', () => {
  it('formats revenue money and percentages', () => {
    const report: RevenueReport = {
      from: '2026-03-13',
      to: '2026-03-15',
      groupBy: 'day',
      buckets: [
        { key: '2026-03-13', revenue: 123450, orders: 2, aov: 61725 },
        { key: '2026-03-14', revenue: 0, orders: 0, aov: 0 },
      ],
      totals: { revenue: 123450, orders: 2, aov: 61725 },
    }
    const rows = reportCsvRows({ kind: 'revenue', report })
    expect(rows[0]?.[0]).toBe('الفترة')
    expect(rows[1]).toEqual(['2026-03-13', '1234.50', '2', '617.25'])
    expect(rows[3]?.[0]).toBe('الإجمالي')
    expect(rows[3]?.[1]).toBe('1234.50')
  })

  it('formats the bridal funnel percentages', () => {
    const rows = reportCsvRows({
      kind: 'bridal-funnel',
      report: {
        listsCreated: 10,
        reservationsPaid: 5,
        delivered: 4,
        listToReservationPct: 50,
        reservationToDeliveredPct: 80,
      },
    })
    expect(rows[1]).toEqual(['قوائم اتعملت', '10', ''])
    expect(rows[2]).toEqual(['حجوزات بعربون', '5', '50.0'])
    expect(rows[3]).toEqual(['اتسلّمت', '4', '80.0'])
  })
})

describe('splitDiscount with repeated keys', () => {
  it('accumulates shares for lines that share a key and still sums to the discount', () => {
    const shares = splitDiscount(
      [
        { key: 'fridges', amount: 100 },
        { key: 'fridges', amount: 100 },
        { key: 'tvs', amount: 100 },
      ],
      100,
    )
    expect(shares.get('fridges')).toBe(67)
    expect(shares.get('tvs')).toBe(33)
  })
})

