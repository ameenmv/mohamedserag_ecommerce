import { describe, expect, it } from 'vitest'
import {
  CATEGORY_ACCENTS,
  CATEGORY_ILLUSTRATIONS,
  resolveCategoryAccent,
  resolveCategoryIllustration,
} from './catalog.js'
import {
  categoryAccentSchema,
  categoryIllustrationSchema,
} from './catalog-schema.js'
import {
  createCategorySchema,
  updateCategorySchema,
} from './admin-catalog-schema.js'

describe('category identity tokens & schemas (Spec 016)', () => {
  it('defines the 8 brand-harmonious category accents', () => {
    expect(CATEGORY_ACCENTS).toEqual([
      'green',
      'sand',
      'gold',
      'deep-teal',
      'charcoal',
      'clay',
      'olive',
      'plum',
    ])
  })

  it('defines the 9 line illustration keys', () => {
    expect(CATEGORY_ILLUSTRATIONS).toEqual([
      'fridge',
      'washer',
      'tv',
      'ac',
      'cooker',
      'cookware',
      'small-appliances',
      'household',
      'default',
    ])
  })

  it('validates accents via categoryAccentSchema', () => {
    for (const accent of CATEGORY_ACCENTS) {
      expect(categoryAccentSchema.safeParse(accent).success).toBe(true)
    }
    expect(categoryAccentSchema.safeParse('neon-pink').success).toBe(false)
    expect(categoryAccentSchema.safeParse('').success).toBe(false)
  })

  it('validates illustrations via categoryIllustrationSchema', () => {
    for (const ill of CATEGORY_ILLUSTRATIONS) {
      expect(categoryIllustrationSchema.safeParse(ill).success).toBe(true)
    }
    expect(categoryIllustrationSchema.safeParse('microwave').success).toBe(false)
    expect(categoryIllustrationSchema.safeParse('').success).toBe(false)
  })

  it('resolveCategoryAccent falls back to green or infers from slug for empty values', () => {
    expect(resolveCategoryAccent('gold')).toBe('gold')
    expect(resolveCategoryAccent('deep-teal')).toBe('deep-teal')
    expect(resolveCategoryAccent(null)).toBe('green')
    expect(resolveCategoryAccent(undefined)).toBe('green')
    expect(resolveCategoryAccent('invalid')).toBe('green')
    expect(resolveCategoryAccent(null, 'refrigerators')).toBe('deep-teal')
    expect(resolveCategoryAccent(null, 'washers')).toBe('charcoal')
    expect(resolveCategoryAccent(null, 'tvs')).toBe('plum')
    expect(resolveCategoryAccent(null, 'acs')).toBe('sand')
    expect(resolveCategoryAccent(null, 'cookers')).toBe('clay')
    expect(resolveCategoryAccent(null, 'cookware')).toBe('gold')
    expect(resolveCategoryAccent(null, 'small-appliances')).toBe('olive')
    expect(resolveCategoryAccent(null, 'household')).toBe('green')
    expect(resolveCategoryAccent(null, 'unknown-category')).toBe('green')
  })

  it('resolveCategoryIllustration resolves explicit illustration and infers from slug', () => {
    expect(resolveCategoryIllustration('custom-slug', 'washer')).toBe('washer')
    expect(resolveCategoryIllustration('refrigerators')).toBe('fridge')
    expect(resolveCategoryIllustration('washers')).toBe('washer')
    expect(resolveCategoryIllustration('tvs')).toBe('tv')
    expect(resolveCategoryIllustration('acs')).toBe('ac')
    expect(resolveCategoryIllustration('cookers')).toBe('cooker')
    expect(resolveCategoryIllustration('cookware')).toBe('cookware')
    expect(resolveCategoryIllustration('small-appliances')).toBe('small-appliances')
    expect(resolveCategoryIllustration('household')).toBe('household')
    expect(resolveCategoryIllustration('unknown-category')).toBe('default')
  })

  it('createCategorySchema applies defaults for accent and illustration', () => {
    const parsed = createCategorySchema.parse({
      name: 'أجهزة جديدة',
      slug: 'new-appliances',
    })
    expect(parsed.accent).toBe('green')
    expect(parsed.illustration).toBe('default')
  })

  it('createCategorySchema preserves explicit accent and illustration', () => {
    const parsed = createCategorySchema.parse({
      name: 'شاشات',
      slug: 'tvs',
      accent: 'plum',
      illustration: 'tv',
    })
    expect(parsed.accent).toBe('plum')
    expect(parsed.illustration).toBe('tv')
  })

  it('updateCategorySchema validates accent and illustration when present', () => {
    const valid = updateCategorySchema.parse({
      accent: 'deep-teal',
      illustration: 'fridge',
    })
    expect(valid.accent).toBe('deep-teal')
    expect(valid.illustration).toBe('fridge')

    const invalid = updateCategorySchema.safeParse({
      accent: 'unsupported-color',
    })
    expect(invalid.success).toBe(false)
  })
})
