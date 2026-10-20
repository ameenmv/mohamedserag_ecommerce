import { describe, expect, it } from 'vitest'
import { resolveCatalogSort } from './catalog-schema.js'
import {
  buildProductSearchText,
  buildSearchTerms,
  computeTrigramSimilarity,
} from './search.js'

const TEST_SYNONYMS: string[][] = [
  ['تلاجه', 'ثلاجة', 'ثلاجه', 'refrigerator', 'fridge'],
  ['غساله', 'غسالة', 'washing', 'washer'],
  ['شاشه', 'شاشة', 'تليفزيون', 'تلفزيون', 'tv'],
  ['تكييف', 'مكيف', 'ac', 'air conditioner'],
  ['بوتاجاز', 'بوتجاز', 'موقد', 'cooker'],
  ['حلل', 'طقم حلل', 'cookware'],
  ['سامسونج', 'samsung'],
  ['إل جي', 'ال جي', 'lg'],
  ['توشيبا', 'toshiba', 'العربي'],
  ['شارب', 'sharp'],
  ['فريش', 'fresh'],
  ['تورنيدو', 'tornado'],
  ['يونيون إير', 'يونيون اير', 'unionaire'],
  ['انفرتر', 'إنفرتر', 'inverter'],
  ['نوفروست', 'نو فروست', 'no frost', 'nofrost'],
  ['ديفروست', 'defrost'],
]

describe('buildProductSearchText', () => {
  it('builds normalized search text with name, brand names, category, extra specs, and model code', () => {
    const text = buildProductSearchText(
      {
        name: 'ثلاجة 450 لتر نوفروست',
        brandNames: ['Samsung', 'سامسونج'],
        categoryName: 'ثلاجات وفريزر',
        modelCode: 'SR-S1',
        extra: ['450 لتر', 'نوفروست'],
      },
      TEST_SYNONYMS,
    )

    // Letters must be normalized (ث -> ت, ة -> ه)
    expect(text).toContain('تلاجه')
    expect(text).toContain('samsung')
    expect(text).toContain('سامسونج')
    expect(text).toContain('sr-s1')
    expect(text).toContain('450 لتر')
    // Synonyms must be expanded
    expect(text).toContain('refrigerator')
    expect(text).toContain('no frost')
  })

  it('builds search text without extra specs', () => {
    const text = buildProductSearchText(
      {
        name: 'شاشة سمارت 55 بوصة',
        brandNames: ['LG', 'إل جي'],
        categoryName: 'شاشات',
        modelCode: 'SR-S8',
      },
      TEST_SYNONYMS,
    )

    expect(text).toContain('شاشه')
    expect(text).toContain('lg')
    expect(text).toContain('ال جي')
    expect(text).toContain('tv')
    expect(text).toContain('sr-s8')
  })
})

describe('buildSearchTerms', () => {
  it('returns empty array for empty or whitespace-only query', () => {
    expect(buildSearchTerms('', TEST_SYNONYMS)).toEqual([])
    expect(buildSearchTerms('   ', TEST_SYNONYMS)).toEqual([])
    expect(buildSearchTerms('\t \n', TEST_SYNONYMS)).toEqual([])
  })

  it('drops short tokens with fewer than 2 characters', () => {
    // "أ" and "ب" are 1 char; "450" is 3 chars
    const terms = buildSearchTerms('أ 450 ب', TEST_SYNONYMS)
    expect(terms).toHaveLength(1)
    expect(terms[0]).toEqual(['450'])

    // Query with only single character tokens returns empty array
    expect(buildSearchTerms('و د', TEST_SYNONYMS)).toEqual([])
  })

  it('folds hamza, taa marbuta, and alef maqsura correctly', () => {
    const terms = buildSearchTerms('إل جي أوتوماتيك سلمى', TEST_SYNONYMS)
    // "إل جي" matches multi-word phrase; "أوتوماتيك" folds hamza -> "اوتوماتيك"; "سلمى" folds -> "سلمي"
    expect(terms.length).toBeGreaterThanOrEqual(3)
    const flattened = terms.flat()
    expect(flattened).toContain('ال جي')
    expect(flattened).toContain('اوتوماتيك')
    expect(flattened).toContain('سلمي')
  })

  it('converts Arabic-Indic digits to ASCII 0-9', () => {
    const terms = buildSearchTerms('٤٥٠', TEST_SYNONYMS)
    expect(terms).toEqual([['450']])

    const termsWithText = buildSearchTerms('ثلاجة ٤٥٠ لتر', TEST_SYNONYMS)
    expect(termsWithText).toHaveLength(3)
    expect(termsWithText[1]).toEqual(['450'])
  })

  it('normalizes «تلاجه» and «ثلاجة» identically and returns matching synonym alternatives', () => {
    const terms1 = buildSearchTerms('ثلاجة', TEST_SYNONYMS)
    const terms2 = buildSearchTerms('تلاجه', TEST_SYNONYMS)

    expect(terms1).toEqual(terms2)
    expect(terms1).toHaveLength(1)
    const alts = terms1[0]
    expect(alts).toContain('تلاجه')
    expect(alts).toContain('refrigerator')
    expect(alts).toContain('fridge')
  })

  it('expands synonym alternatives for single tokens: «انفرتر» and «lg»', () => {
    const inverterTerms = buildSearchTerms('انفرتر', TEST_SYNONYMS)
    expect(inverterTerms).toHaveLength(1)
    expect(inverterTerms[0]).toEqual(['انفرتر', 'inverter'])

    const lgTerms = buildSearchTerms('lg', TEST_SYNONYMS)
    expect(lgTerms).toHaveLength(1)
    expect(lgTerms[0]).toEqual(['lg', 'ال جي'])
  })

  it('detects multi-word synonyms before tokenizing: «إل جي» and «no frost»', () => {
    // "إل جي" must not be split into "ال" and "جي"
    const lgPhraseTerms = buildSearchTerms('إل جي', TEST_SYNONYMS)
    expect(lgPhraseTerms).toHaveLength(1)
    expect(lgPhraseTerms[0]).toEqual(['ال جي', 'lg'])

    // "no frost" whole phrase
    const noFrostTerms = buildSearchTerms('no frost', TEST_SYNONYMS)
    expect(noFrostTerms).toHaveLength(1)
    expect(noFrostTerms[0]).toEqual(['no frost', 'نوفروست', 'نو فروست', 'nofrost'])

    // "نو فروست" Arabic whole phrase
    const arabicNoFrost = buildSearchTerms('نو فروست', TEST_SYNONYMS)
    expect(arabicNoFrost).toHaveLength(1)
    expect(arabicNoFrost[0]).toEqual(['نو فروست', 'نوفروست', 'no frost', 'nofrost'])
  })

  it('handles multi-word phrase mixed with other terms and digits', () => {
    const terms = buildSearchTerms('ثلاجة إل جي نو فروست ٤٥٠', TEST_SYNONYMS)
    expect(terms).toHaveLength(4)

    // Term 0: ثلاجة -> تلاجه + synonyms
    expect(terms[0]).toContain('تلاجه')
    expect(terms[0]).toContain('refrigerator')

    // Term 1: إل جي -> phrase
    expect(terms[1]).toEqual(['ال جي', 'lg'])

    // Term 2: نو فروست -> phrase
    expect(terms[2]).toEqual(['نو فروست', 'نوفروست', 'no frost', 'nofrost'])

    // Term 3: ٤٥٠ -> 450
    expect(terms[3]).toEqual(['450'])
  })
})

describe('computeTrigramSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(computeTrigramSimilarity('samsung', 'samsung')).toBe(1)
    expect(computeTrigramSimilarity('تلاجه', 'تلاجه')).toBe(1)
  })

  it('returns 0 for empty string or disjoint trigrams', () => {
    expect(computeTrigramSimilarity('', 'samsung')).toBe(0)
    expect(computeTrigramSimilarity('abc', 'xyz')).toBe(0)
  })

  it('calculates expected trigram similarity for Arabic singular/plural «تلاجه» vs «تلاجات»', () => {
    const sim = computeTrigramSimilarity('تلاجه', 'تلاجات')
    expect(sim).toBeGreaterThanOrEqual(0.35)
  })

  it('calculates expected trigram similarity for single typo «سامسنج» vs «سامسونج»', () => {
    const sim = computeTrigramSimilarity('سامسنج', 'سامسونج')
    expect(sim).toBeGreaterThanOrEqual(0.35)
  })
})

describe('resolveCatalogSort', () => {
  it('returns explicit sort when provided, regardless of q', () => {
    expect(resolveCatalogSort({ sort: 'price_asc' })).toBe('price_asc')
    expect(resolveCatalogSort({ sort: 'price_desc', q: 'samsung' })).toBe('price_desc')
    expect(resolveCatalogSort({ sort: 'newest', q: 'تلاجه' })).toBe('newest')
    expect(resolveCatalogSort({ sort: 'relevance' })).toBe('relevance')
  })

  it('defaults to relevance when q is present and non-empty without explicit sort', () => {
    expect(resolveCatalogSort({ q: 'samsung' })).toBe('relevance')
    expect(resolveCatalogSort({ q: '  تلاجه  ' })).toBe('relevance')
  })

  it('defaults to popular when sort is missing and q is absent, empty, or whitespace', () => {
    expect(resolveCatalogSort({})).toBe('popular')
    expect(resolveCatalogSort({ q: '' })).toBe('popular')
    expect(resolveCatalogSort({ q: '   ' })).toBe('popular')
  })
})

