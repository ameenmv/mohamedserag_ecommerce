import { describe, expect, it } from 'vitest'
import { isValidGuideSlug, slugifyGuideTitle } from '../app/utils/guide-slug'

describe('guide-slug: slugifyGuideTitle', () => {
  it('slugifies a Latin title into hyphen-separated lowercase', () => {
    expect(slugifyGuideTitle('Best French Door Fridge 2026')).toBe(
      'best-french-door-fridge-2026',
    )
  })

  it('collapses runs of non-alphanumerics into single hyphens and trims edges', () => {
    expect(slugifyGuideTitle('  Samsung   Fridge -- Guide!  ')).toBe(
      'samsung-fridge-guide',
    )
  })

  it('transliterates accented Latin letters', () => {
    expect(slugifyGuideTitle('Café Résumé')).toBe('cafe-resume')
  })

  it('returns an empty string for Arabic-only titles', () => {
    expect(slugifyGuideTitle('دليل شراء الثلاجات')).toBe('')
  })

  it('clamps the slug to 80 characters without a trailing hyphen', () => {
    const long = 'a'.repeat(90)
    const slug = slugifyGuideTitle(long)
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('never returns a trailing hyphen after clamping on a word boundary', () => {
    const slug = slugifyGuideTitle(`${'word '.repeat(30)}end`)
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('guide-slug: isValidGuideSlug', () => {
  it('accepts lowercase latin, digits and hyphens of valid length', () => {
    expect(isValidGuideSlug('fridge-buying-guide')).toBe(true)
    expect(isValidGuideSlug('guide-2026')).toBe(true)
  })

  it('rejects slugs that are too short, uppercase, or contain other characters', () => {
    expect(isValidGuideSlug('ab')).toBe(false)
    expect(isValidGuideSlug('Fridge-Guide')).toBe(false)
    expect(isValidGuideSlug('fridge_guide')).toBe(false)
    expect(isValidGuideSlug('دليل')).toBe(false)
    expect(isValidGuideSlug('')).toBe(false)
  })

  it('rejects slugs longer than 80 characters', () => {
    expect(isValidGuideSlug('a'.repeat(81))).toBe(false)
  })
})
