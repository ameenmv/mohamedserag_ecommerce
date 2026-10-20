import { describe, expect, it } from 'vitest'
import { reportQuerySchema } from './reports-schema.js'

describe('reportQuerySchema', () => {
  it('accepts a preset and defaults groupBy to day', () => {
    const result = reportQuerySchema.safeParse({ preset: '7d' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groupBy).toBe('day')
    }
  })

  it('accepts a custom from/to range', () => {
    const result = reportQuerySchema.safeParse({
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: 'week',
    })
    expect(result.success).toBe(true)
  })

  it('rejects when neither preset nor from/to is given', () => {
    const result = reportQuerySchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('فترة'))).toBe(true)
    }
  })

  it('rejects when only from or only to is given', () => {
    expect(reportQuerySchema.safeParse({ from: '2026-01-01' }).success).toBe(false)
    expect(reportQuerySchema.safeParse({ to: '2026-01-31' }).success).toBe(false)
  })

  it('rejects an invalid date', () => {
    const result = reportQuerySchema.safeParse({ from: '2026-02-30', to: '2026-03-01' })
    expect(result.success).toBe(false)
  })

  it('rejects from after to', () => {
    const result = reportQuerySchema.safeParse({ from: '2026-03-01', to: '2026-02-01' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('البداية'))).toBe(true)
    }
  })

  it('rejects a span over 366 days', () => {
    const result = reportQuerySchema.safeParse({ from: '2025-01-01', to: '2026-02-15' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('366'))).toBe(true)
    }
  })

  it('accepts a span of exactly 366 days', () => {
    const result = reportQuerySchema.safeParse({ from: '2026-01-01', to: '2027-01-01' })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown groupBy', () => {
    expect(reportQuerySchema.safeParse({ preset: '7d', groupBy: 'year' }).success).toBe(false)
  })
})
