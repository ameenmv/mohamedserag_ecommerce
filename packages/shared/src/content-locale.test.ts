import { describe, expect, it } from 'vitest'
import { englishTranslations, localizedList, localizedSpec, localizedSpecFields, localizedText, parseContentLocale } from './content-locale.js'

describe('parseContentLocale', () => {
  it('is English only for "en"', () => {
    expect(parseContentLocale('en')).toBe('en')
    expect(parseContentLocale('ar')).toBe('ar')
    expect(parseContentLocale(undefined)).toBe('ar')
    expect(parseContentLocale(['en'])).toBe('ar')
  })
})

describe('localizedText', () => {
  const tr = { en: { name: 'Gas cooker', intro: '  ' } }

  it('returns the English text on the English storefront', () => {
    expect(localizedText('بوتاجاز', tr, 'name', 'en')).toBe('Gas cooker')
  })

  it('keeps Arabic for the Arabic storefront', () => {
    expect(localizedText('بوتاجاز', tr, 'name', 'ar')).toBe('بوتاجاز')
  })

  it('falls back to Arabic when the translation is missing or blank', () => {
    expect(localizedText('مقدمة', tr, 'intro', 'en')).toBe('مقدمة')
    expect(localizedText('وصف', tr, 'seoTitle', 'en')).toBe('وصف')
    expect(localizedText(null, {}, 'intro', 'en')).toBeNull()
  })

  it('ignores malformed translations', () => {
    expect(englishTranslations('x')).toBeNull()
    expect(englishTranslations({ en: [] })).toBeNull()
    expect(localizedText('اسم', { en: { name: 5 } }, 'name', 'en')).toBe('اسم')
  })
})

describe('localizedList', () => {
  it('uses the English list only when it is a non-empty list of strings', () => {
    expect(localizedList(['حلة'], { en: { setContents: ['Pot'] } }, 'setContents', 'en')).toEqual(['Pot'])
    expect(localizedList(['حلة'], { en: { setContents: [] } }, 'setContents', 'en')).toEqual(['حلة'])
    expect(localizedList(['حلة'], { en: { setContents: ['Pot'] } }, 'setContents', 'ar')).toEqual(['حلة'])
  })
})

describe('localizedSpec', () => {
  const field = { label: 'نظام التبريد', unit: 'لتر', options: ['نوفروست', 'ديفروست'], labelEn: 'Cooling', unitEn: 'L', optionsEn: ['No frost', 'Defrost'] }

  it('translates label, unit and the chosen option', () => {
    expect(localizedSpec(field, 'ديفروست', 'en')).toEqual({ label: 'Cooling', unit: 'L', value: 'Defrost' })
  })

  it('keeps Arabic values that are not options, and everything on the Arabic storefront', () => {
    expect(localizedSpec(field, 400, 'en')).toEqual({ label: 'Cooling', unit: 'L', value: 400 })
    expect(localizedSpec(field, 'ديفروست', 'ar')).toEqual({ label: 'نظام التبريد', unit: 'لتر', value: 'ديفروست' })
    expect(localizedSpec({ label: 'العرض' }, 'x', 'en')).toEqual({ label: 'العرض', unit: null, value: 'x' })
  })
})

describe('localizedSpecFields', () => {
  const fields = [{ key: 'cooling', label: 'التبريد', unit: null, options: ['نوفروست', 'ديفروست'], labelEn: 'Cooling', optionsEn: ['No frost', ''] }]

  it('names options in English but keeps Arabic values', () => {
    expect(localizedSpecFields(fields, 'en')).toEqual([
      { key: 'cooling', label: 'Cooling', unit: null, options: ['نوفروست', 'ديفروست'], optionLabels: ['No frost', 'ديفروست'] },
    ])
  })

  it('drops the English source fields on the Arabic storefront', () => {
    expect(localizedSpecFields(fields, 'ar')).toEqual([{ key: 'cooling', label: 'التبريد', unit: null, options: ['نوفروست', 'ديفروست'] }])
  })
})
