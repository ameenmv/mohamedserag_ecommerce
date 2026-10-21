import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '../app/utils/date-format'

const ARABIC_INDIC = /[٠-٩]/

describe('date-format', () => {
  it('uses Latin digits in Arabic', () => {
    const text = formatDate('2026-10-18T10:00:00Z', 'ar')
    expect(text).not.toMatch(ARABIC_INDIC)
    expect(text).toContain('2026')
    expect(text).toContain('18')
  })

  it('renders in Cairo time regardless of the runtime time zone', () => {
    // 22:30 UTC is already the next day in Cairo (UTC+3 in October).
    expect(formatDate('2026-10-18T22:30:00Z', 'en')).toContain('19')
    expect(formatDateTime('2026-10-18T22:30:00Z', 'ar')).not.toMatch(ARABIC_INDIC)
  })
})
