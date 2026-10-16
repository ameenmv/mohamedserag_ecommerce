import { describe, it, expect } from 'vitest'
import { normalizeArabic, expandSynonyms } from './arabic.js'

describe('normalizeArabic', () => {
  it('normalizes «ثلاجة» and «تلاجه» to the same value', () => {
    expect(normalizeArabic('ثلاجة')).toBe(normalizeArabic('تلاجه'))
    expect(normalizeArabic('ثلاجة')).toBe('تلاجه')
  })

  it('converts Arabic-Indic and Persian digits to ASCII 0-9', () => {
    expect(normalizeArabic('٤٥٠ لتر')).toBe('450 لتر')
    expect(normalizeArabic('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789')
    expect(normalizeArabic('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789')
  })

  it('lowercases Latin characters and removes tashkeel and tatweel', () => {
    expect(normalizeArabic('Samsung   ثَلَّاجَـة')).toBe('samsung تلاجه')
  })

  it('folds hamza forms, taa marbuta, alef maqsura, waw/yaa hamza, and Egyptian colloquial letters', () => {
    expect(normalizeArabic('أحمد إبراهيم آمنة ٱسم')).toBe('احمد ابراهيم امنه اسم')
    expect(normalizeArabic('مكواة سلمى مؤمن بئر')).toBe('مكواه سلمي مومن بير')
    expect(normalizeArabic('ثلاجة ذهب ظهر')).toBe('تلاجه دهب ضهر')
  })
})

describe('expandSynonyms', () => {
  it('expands «إل جي» with group [["إل جي", "lg"]] to include "lg"', () => {
    const result = expandSynonyms('إل جي', [['إل جي', 'lg']])
    expect(result).toContain('lg')
    expect(result).toBe('ال جي lg')
  })

  it('expands bidirectional synonyms and avoids duplicating existing terms', () => {
    const groups = [
      ['إل جي', 'lg'],
      ['سامسونج', 'samsung'],
      ['نوفروست', 'no frost'],
    ]
    expect(expandSynonyms('ثلاجة LG نوفروست', groups)).toBe('تلاجه lg نوفروست ال جي no frost')
  })
})
