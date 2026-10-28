import { describe, expect, it } from 'vitest'
import {
  deserializeReportQuery,
  formatBucketLabel,
  serializeReportQuery,
  sharePercent,
  toAdminReportApiQuery,
  validateReportQuery,
  type AdminReportQueryState,
} from '../app/utils/admin-reports'

describe('admin-reports query', () => {
  it('falls back to the 30d/day defaults on an empty URL', () => {
    expect(deserializeReportQuery({})).toEqual({
      tab: 'revenue',
      preset: '30d',
      from: undefined,
      to: undefined,
      groupBy: 'day',
    })
  })

  it('keeps a valid preset from the URL', () => {
    const state = deserializeReportQuery({ tab: 'coupons', preset: '7d', groupBy: 'week' })
    expect(state).toEqual({
      tab: 'coupons',
      preset: '7d',
      from: undefined,
      to: undefined,
      groupBy: 'week',
    })
  })

  it('falls back to custom mode for a raw from/to pair', () => {
    const state = deserializeReportQuery({ from: '2026-01-01', to: '2026-01-31' })
    expect(state.preset).toBe('custom')
    expect(state.from).toBe('2026-01-01')
    expect(state.to).toBe('2026-01-31')
  })

  it('keeps an invalid preset string alongside from/to so Zod can report it', () => {
    // An unrecognized preset with no dates must not silently become the default.
    const state = deserializeReportQuery({ preset: 'bogus', from: '2026-01-01', to: '2026-01-31' })
    expect(state.preset).toBe('custom')
    expect(state.from).toBe('2026-01-01')
  })

  it('ignores an invalid tab and grouping', () => {
    const state = deserializeReportQuery({ tab: 'nope', groupBy: 'hour' })
    expect(state.tab).toBe('revenue')
    expect(state.groupBy).toBe('day')
  })

  it('serializes defaults out of the URL', () => {
    const state: AdminReportQueryState = {
      tab: 'revenue',
      preset: '30d',
      groupBy: 'day',
    }
    expect(serializeReportQuery(state)).toEqual({ tab: 'revenue' })
  })

  it('serializes non-default preset, grouping and custom dates', () => {
    const state: AdminReportQueryState = {
      tab: 'splits',
      preset: '90d',
      groupBy: 'month',
    }
    expect(serializeReportQuery(state)).toEqual({
      tab: 'splits',
      preset: '90d',
      groupBy: 'month',
    })

    const custom: AdminReportQueryState = {
      tab: 'splits',
      preset: 'custom',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'day',
    }
    expect(serializeReportQuery(custom)).toEqual({
      tab: 'splits',
      from: '2026-01-01',
      to: '2026-01-31',
    })
  })

  it('round-trips deserialize(serialize(state))', () => {
    const state: AdminReportQueryState = {
      tab: 'flash-sales',
      preset: 'custom',
      from: '2026-03-01',
      to: '2026-03-15',
      groupBy: 'week',
    }
    expect(deserializeReportQuery(serializeReportQuery(state))).toEqual(state)
  })

  it('always resolves presets to explicit dates for the API', () => {
    const now = new Date('2026-10-20T12:00:00Z')
    const state: AdminReportQueryState = { tab: 'revenue', preset: '7d', groupBy: 'day' }
    expect(toAdminReportApiQuery(state, now)).toEqual({
      from: '2026-10-14',
      to: '2026-10-20',
      groupBy: 'day',
    })
  })

  it('passes custom dates through to the API query', () => {
    const now = new Date('2026-10-20T12:00:00Z')
    const state: AdminReportQueryState = {
      tab: 'revenue',
      preset: 'custom',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'week',
    }
    expect(toAdminReportApiQuery(state, now)).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'week',
    })
  })

  it('rejects a reversed custom range with an Arabic message', () => {
    const state: AdminReportQueryState = {
      tab: 'revenue',
      preset: 'custom',
      from: '2026-02-01',
      to: '2026-01-01',
      groupBy: 'day',
    }
    expect(validateReportQuery(state)).toBe('تاريخ البداية لازم يكون قبل تاريخ النهاية')
  })

  it('rejects a custom range longer than 366 days', () => {
    const state: AdminReportQueryState = {
      tab: 'revenue',
      preset: 'custom',
      from: '2025-01-01',
      to: '2026-12-31',
      groupBy: 'day',
    }
    expect(validateReportQuery(state)).toBe('المدة القصوى للتقرير 366 يوم')
  })

  it('accepts a valid preset query', () => {
    const state: AdminReportQueryState = { tab: 'revenue', preset: '30d', groupBy: 'day' }
    expect(validateReportQuery(state)).toBeNull()
  })
})

describe('admin-reports formatting', () => {
  it('formats day bucket keys as localized dates', () => {
    expect(formatBucketLabel('2026-10-18', 'en')).toBe('18 Oct 2026')
    expect(formatBucketLabel('2026-10-18', 'ar')).toContain('2026')
    expect(formatBucketLabel('2026-10-18', 'ar')).not.toMatch(/[٠-٩]/)
  })

  it('formats month bucket keys as month-year', () => {
    expect(formatBucketLabel('2026-10', 'en')).toBe('Oct 2026')
    expect(formatBucketLabel('2026-10', 'ar')).toContain('2026')
  })

  it('renders share percentages with one decimal', () => {
    expect(sharePercent(1, 3)).toBe('33.3')
    expect(sharePercent(0, 0)).toBe('0.0')
    expect(sharePercent(5, 10)).toBe('50.0')
  })
})
