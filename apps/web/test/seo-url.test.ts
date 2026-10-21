import { describe, expect, it } from 'vitest'
import { buildCanonicalUrl } from '../app/utils/seo-url'

const SITE = 'https://serag.eg'

describe('buildCanonicalUrl', () => {
  it('returns the root canonical for the Arabic home', () => {
    expect(buildCanonicalUrl(SITE, '/', {}, '')).toBe('https://serag.eg/')
  })

  it('keeps the /en prefix for the English home', () => {
    expect(buildCanonicalUrl(SITE, '/en', {}, '/en')).toBe('https://serag.eg/en')
  })

  it('builds a plain locale-less path for Arabic pages', () => {
    expect(buildCanonicalUrl(SITE, '/p/fridge', {}, '')).toBe('https://serag.eg/p/fridge')
  })

  it('re-applies the /en prefix for English pages', () => {
    expect(buildCanonicalUrl(SITE, '/en/p/fridge', {}, '/en')).toBe('https://serag.eg/en/p/fridge')
  })

  it('drops trailing slashes', () => {
    expect(buildCanonicalUrl(SITE, '/shop/', {}, '')).toBe('https://serag.eg/shop')
    expect(buildCanonicalUrl(SITE, '/en/shop/', {}, '/en')).toBe('https://serag.eg/en/shop')
  })

  it('drops every query param except page >= 2', () => {
    expect(buildCanonicalUrl(SITE, '/c/refrigerators', { brand: 'samsung', sort: 'price_asc' }, '')).toBe(
      'https://serag.eg/c/refrigerators',
    )
    expect(buildCanonicalUrl(SITE, '/shop', { q: 'fridge' }, '')).toBe('https://serag.eg/shop')
    expect(buildCanonicalUrl(SITE, '/shop', { page: '2' }, '')).toBe('https://serag.eg/shop?page=2')
    expect(buildCanonicalUrl(SITE, '/shop', { page: '1' }, '')).toBe('https://serag.eg/shop')
    expect(buildCanonicalUrl(SITE, '/shop', { page: '0' }, '')).toBe('https://serag.eg/shop')
  })

  it('keeps the page param on the English listing with its prefix', () => {
    expect(buildCanonicalUrl(SITE, '/en/shop', { page: '3', sort: 'newest' }, '/en')).toBe(
      'https://serag.eg/en/shop?page=3',
    )
  })

  it('normalizes a trailing slash on the English home', () => {
    expect(buildCanonicalUrl(SITE, '/en/', {}, '/en')).toBe('https://serag.eg/en')
  })
})
