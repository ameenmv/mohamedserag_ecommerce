import { describe, it, expect } from 'vitest'
import { normalizePhone, PHONE_ERROR_MESSAGE } from './phone.js'
import { phoneSchema } from './phone-schema.js'

describe('normalizePhone', () => {
  it('normalizes +20 prefix with spaces to 01012345678', () => {
    expect(normalizePhone('+20 10 1234 5678')).toBe('01012345678')
  })

  it('converts Arabic-Indic digits to 01123456789', () => {
    expect(normalizePhone('٠١١٢٣٤٥٦٧٨٩')).toBe('01123456789')
  })

  it('accepts 0020, 20, dashes, and missing leading 0 across valid prefixes (010, 011, 012, 015)', () => {
    expect(normalizePhone('0020-12-1234-5678')).toBe('01212345678')
    expect(normalizePhone('201512345678')).toBe('01512345678')
    expect(normalizePhone('1012345678')).toBe('01012345678')
  })

  it('returns null for wrong prefix (0131234567)', () => {
    expect(normalizePhone('0131234567')).toBeNull()
    expect(normalizePhone('01312345678')).toBeNull()
  })

  it('returns null when too short (0101234567)', () => {
    expect(normalizePhone('0101234567')).toBeNull()
  })

  it('returns null for non-numeric or too-long inputs', () => {
    expect(normalizePhone('010123456789')).toBeNull()
    expect(normalizePhone('0101234abcd')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })
})

describe('phoneSchema', () => {
  it('transforms valid phone numbers to normalized 11-digit string', () => {
    expect(phoneSchema.parse('+20 10 1234 5678')).toBe('01012345678')
    expect(phoneSchema.parse('٠١١٢٣٤٥٦٧٨٩')).toBe('01123456789')
  })

  it('fails with the Arabic message «رقم الموبايل مش صحيح» for invalid numbers', () => {
    const res = phoneSchema.safeParse('0131234567')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe('رقم الموبايل مش صحيح')
      expect(res.error.issues[0]?.message).toBe(PHONE_ERROR_MESSAGE)
    }
  })
})
