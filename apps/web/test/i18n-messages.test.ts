import { describe, expect, it } from 'vitest'
import ar from '../i18n/locales/ar.json'
import en from '../i18n/locales/en.json'

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = String(value)
    }
  }
  return result
}

describe('i18n messages test', () => {
  const arFlat = flattenKeys(ar)
  const enFlat = flattenKeys(en)

  it('asserts ar.json and en.json have identical flattened key sets', () => {
    const arKeys = Object.keys(arFlat).sort()
    const enKeys = Object.keys(enFlat).sort()
    expect(arKeys).toEqual(enKeys)
  })

  it('asserts no empty strings exist in ar.json', () => {
    for (const [key, value] of Object.entries(arFlat)) {
      expect(value.trim(), `Empty value for key "${key}" in ar.json`).not.toBe('')
    }
  })

  it('asserts no empty strings exist in en.json', () => {
    for (const [key, value] of Object.entries(enFlat)) {
      expect(value.trim(), `Empty value for key "${key}" in en.json`).not.toBe('')
    }
  })
})
