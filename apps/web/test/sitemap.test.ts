import { describe, expect, it } from 'vitest'
import type { SitemapEntry } from '@serag/shared'
import {
  SITEMAP_CHUNK_SIZE,
  chunkEntries,
  escapeXml,
  renderSitemapIndex,
  renderUrlset,
} from '../server/utils/sitemap'

const SITE = 'https://serag.eg'

function entry(path: string, lastmod = '2026-01-01T00:00:00.000Z'): SitemapEntry {
  return { path, lastmod }
}

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f')
  })
})

describe('chunkEntries', () => {
  it('returns an empty list for no entries', () => {
    expect(chunkEntries([])).toEqual([])
  })

  it('keeps small catalogs in a single chunk', () => {
    expect(chunkEntries([entry('/'), entry('/shop')], 45000)).toHaveLength(1)
  })

  it('splits when entries exceed the size', () => {
    const entries = [entry('/'), entry('/shop'), entry('/offers'), entry('/p/x')]
    expect(chunkEntries(entries, 2)).toEqual([
      [entry('/'), entry('/shop')],
      [entry('/offers'), entry('/p/x')],
    ])
  })

  it('exposes a safe default chunk size', () => {
    expect(SITEMAP_CHUNK_SIZE).toBeLessThan(50000)
  })
})

describe('renderUrlset', () => {
  it('renders loc, lastmod and ar/en/x-default alternates', () => {
    const xml = renderUrlset([entry('/p/fridge')], SITE)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
    expect(xml).toContain(`<loc>${SITE}/p/fridge</loc>`)
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>')
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="ar" href="${SITE}/p/fridge"/>`)
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/p/fridge"/>`)
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/p/fridge"/>`)
  })

  it('maps the Arabic root to /en for the English alternate', () => {
    const xml = renderUrlset([entry('/')], SITE)
    expect(xml).toContain(`<loc>${SITE}/</loc>`)
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="en" href="${SITE}/en"/>`)
  })

  it('escapes XML in paths and lastmod', () => {
    const xml = renderUrlset([entry('/p/a&b', '<now>')], SITE)
    expect(xml).toContain('<loc>' + SITE + '/p/a&amp;b</loc>')
    expect(xml).toContain('<lastmod>&lt;now&gt;</lastmod>')
  })

  it('renders an empty urlset when there are no entries', () => {
    const xml = renderUrlset([], SITE)
    expect(xml).toContain('<urlset')
    expect(xml).toContain('</urlset>')
    expect(xml).not.toContain('<url>')
  })
})

describe('renderSitemapIndex', () => {
  it('lists chunk locations', () => {
    const xml = renderSitemapIndex([`${SITE}/sitemap-1.xml`, `${SITE}/sitemap-2.xml`])
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain(`<loc>${SITE}/sitemap-1.xml</loc>`)
    expect(xml).toContain(`<loc>${SITE}/sitemap-2.xml</loc>`)
    expect(xml).toContain('</sitemapindex>')
  })
})
