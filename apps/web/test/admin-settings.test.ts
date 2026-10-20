import { describe, expect, it, vi } from 'vitest'
import {
  createZoneId,
  extractSettingsConflict,
  insertTemplateVariable,
  isSettingsSection,
  parseSynonymInput,
  settingsDraftDirty,
  zodIssuesToFieldErrors,
} from '../app/utils/admin-settings'
import { storePhoneDisplay, storeWhatsappDigits } from '../app/utils/store-settings'

describe('settingsDraftDirty', () => {
  it('returns false for equal object values', () => {
    expect(settingsDraftDirty({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] })).toBe(false)
  })

  it('returns true when a nested value changed', () => {
    expect(settingsDraftDirty({ a: { b: 1 } }, { a: { b: 2 } })).toBe(true)
  })

  it('handles null values', () => {
    expect(settingsDraftDirty(null, null)).toBe(false)
    expect(settingsDraftDirty(null, {})).toBe(true)
    expect(settingsDraftDirty({}, null)).toBe(true)
  })
})

describe('zodIssuesToFieldErrors', () => {
  it('keeps the first message per path and joins the path with dots', () => {
    const errors = zodIssuesToFieldErrors([
      { path: ['name'], message: 'اسم المعرض مطلوب' },
      { path: ['name'], message: 'second message ignored' },
      { path: [0, 'places', 1, 'governorate'], message: 'المحافظة مش من محافظات مصر' },
    ])
    expect(errors).toEqual({
      name: 'اسم المعرض مطلوب',
      '0.places.1.governorate': 'المحافظة مش من محافظات مصر',
    })
  })
})

describe('isSettingsSection', () => {
  it('accepts known sections', () => {
    expect(isSettingsSection('store')).toBe(true)
    expect(isSettingsSection('templates')).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isSettingsSection('nope')).toBe(false)
    expect(isSettingsSection('')).toBe(false)
  })
})

describe('parseSynonymInput', () => {
  it('splits on Latin and Arabic commas, semicolons and newlines', () => {
    expect(parseSynonymInput('تلاجة، ثلاجة')).toEqual(['تلاجة', 'ثلاجة'])
    expect(parseSynonymInput('a,b;c؛d\ne')).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('trims and drops empty entries', () => {
    expect(parseSynonymInput('  a ,, b  ')).toEqual(['a', 'b'])
    expect(parseSynonymInput('')).toEqual([])
  })
})

describe('insertTemplateVariable', () => {
  it('inserts a token at the cursor and returns the new cursor position', () => {
    const result = insertTemplateVariable('مرحبا ', 'customerName', 6)
    expect(result.text).toBe('مرحبا {{customerName}}')
    expect(result.cursor).toBe(6 + '{{customerName}}'.length)
  })

  it('clamps an out-of-range cursor', () => {
    expect(insertTemplateVariable('abc', 'x', 999)).toEqual({ text: 'abc{{x}}', cursor: 8 })
    expect(insertTemplateVariable('abc', 'x', -5)).toEqual({ text: '{{x}}abc', cursor: 5 })
  })
})

describe('createZoneId', () => {
  it('returns a unique, non-empty zone id', () => {
    const a = createZoneId()
    const b = createZoneId()
    expect(a).not.toBe(b)
    expect(a.startsWith('zone-')).toBe(true)
  })

  it('falls back when crypto.randomUUID is unavailable', () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', {})
    try {
      const id = createZoneId()
      expect(id.startsWith('zone-')).toBe(true)
      expect(id.length).toBeGreaterThan(5)
    } finally {
      vi.stubGlobal('crypto', original)
    }
  })
})

describe('extractSettingsConflict', () => {
  it('reads the latest payload from err.data', () => {
    const latest = { value: { name: 'x' }, version: 'v2' }
    expect(extractSettingsConflict({ data: { latest } })).toEqual(latest)
  })

  it('reads the latest payload from err.response._data', () => {
    const latest = { value: 1, version: null }
    expect(extractSettingsConflict({ response: { _data: { latest } } })).toEqual(latest)
  })

  it('returns null for non-conflict errors', () => {
    expect(extractSettingsConflict(null)).toBeNull()
    expect(extractSettingsConflict('boom')).toBeNull()
    expect(extractSettingsConflict({ data: { message: 'bad' } })).toBeNull()
    expect(extractSettingsConflict({ data: { latest: { version: 'v1' } } })).toBeNull()
  })
})

describe('storeWhatsappDigits', () => {
  it('converts local Egyptian numbers to wa.me digits', () => {
    expect(storeWhatsappDigits('01012345678')).toBe('201012345678')
  })

  it('returns an empty string for missing or placeholder values', () => {
    expect(storeWhatsappDigits('')).toBe('')
    expect(storeWhatsappDigits(null)).toBe('')
    expect(storeWhatsappDigits(undefined)).toBe('')
    expect(storeWhatsappDigits('[رقم الواتساب]')).toBe('')
  })
})

describe('storePhoneDisplay', () => {
  it('normalizes a local number for display', () => {
    expect(storePhoneDisplay('01012345678')).toBe('01012345678')
    expect(storePhoneDisplay('+20 101 234 5678')).toBe('01012345678')
  })

  it('returns an empty string for missing or placeholder values', () => {
    expect(storePhoneDisplay('')).toBe('')
    expect(storePhoneDisplay('[رقم المعرض]')).toBe('')
  })
})
