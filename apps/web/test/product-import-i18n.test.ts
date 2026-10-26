import { PRODUCT_IMPORT_ERROR_KEYS } from '@serag/shared'
import { describe, expect, it } from 'vitest'
import adminAr from '../i18n/admin/ar.json'
import adminEn from '../i18n/admin/en.json'
import ar from '../i18n/locales/ar.json'
import en from '../i18n/locales/en.json'

// The product-import messages live under `admin`, whose files are separate from the storefront's
const arMessages = { ...ar, ...adminAr }
const enMessages = { ...en, ...adminEn }

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

describe('product import i18n parity', () => {
  const arFlat = flattenKeys(arMessages)
  const enFlat = flattenKeys(enMessages)

  it('ensures every PRODUCT_IMPORT_ERROR_KEYS used in @serag/shared exists in ar.json and en.json', () => {
    const sharedErrorKeys = Object.values(PRODUCT_IMPORT_ERROR_KEYS)

    for (const key of sharedErrorKeys) {
      expect(
        arFlat[key],
        `Expected key "${key}" from PRODUCT_IMPORT_ERROR_KEYS to exist in ar.json`,
      ).toBeDefined()
      expect(
        arFlat[key]?.trim(),
        `Expected key "${key}" in ar.json to have a non-empty string value`,
      ).not.toBe('')

      expect(
        enFlat[key],
        `Expected key "${key}" from PRODUCT_IMPORT_ERROR_KEYS to exist in en.json`,
      ).toBeDefined()
      expect(
        enFlat[key]?.trim(),
        `Expected key "${key}" in en.json to have a non-empty string value`,
      ).not.toBe('')
    }
  })

  it('verifies all admin.products.import.* keys have complete parity between ar.json and en.json', () => {
    const importArKeys = Object.keys(arFlat)
      .filter((k) => k.startsWith('admin.products.import.'))
      .sort()
    const importEnKeys = Object.keys(enFlat)
      .filter((k) => k.startsWith('admin.products.import.'))
      .sort()

    expect(importArKeys.length).toBeGreaterThanOrEqual(15)
    expect(importArKeys).toEqual(importEnKeys)
  })
})
