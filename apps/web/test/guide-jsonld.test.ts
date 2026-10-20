import { describe, expect, it } from 'vitest'
import type { PublicGuide } from '@serag/shared'
import { absoluteImageUrl, buildGuideJsonLd } from '../app/utils/guide-jsonld'

function createSampleGuide(overrides: Partial<PublicGuide> = {}): PublicGuide {
  return {
    slug: 'fridge-buying-guide',
    title: 'دليل شراء الثلاجات',
    summary: 'إزاي تختار الثلاجة المناسبة لبيتك',
    cover: '/uploads/guides/fridge.webp',
    body: '<p>محتوى الدليل</p>',
    publishedAt: '2026-01-05T09:00:00.000Z',
    updatedAt: '2026-01-07T09:00:00.000Z',
    seoTitle: 'دليل شراء الثلاجات',
    seoDescription: 'كل ما تحتاجه لاختيار ثلاجة',
    categories: [{ slug: 'refrigerators', name: 'ثلاجات' }],
    products: [],
    ...overrides,
  }
}

describe('guide-jsonld: absoluteImageUrl', () => {
  it('resolves a relative uploaded path against the origin', () => {
    expect(absoluteImageUrl('/uploads/guides/fridge.webp', 'https://serag.co')).toBe(
      'https://serag.co/uploads/guides/fridge.webp',
    )
  })

  it('keeps absolute URLs untouched', () => {
    expect(absoluteImageUrl('https://cdn.serag.co/a.webp', 'https://serag.co')).toBe(
      'https://cdn.serag.co/a.webp',
    )
  })

  it('returns undefined when there is no cover', () => {
    expect(absoluteImageUrl(null, 'https://serag.co')).toBeUndefined()
  })
})

describe('guide-jsonld: buildGuideJsonLd', () => {
  it('builds an Article with absolute image, mainEntityOfPage and org author/publisher', () => {
    const jsonLd = buildGuideJsonLd(
      createSampleGuide(),
      'https://serag.co/guides/fridge-buying-guide',
      'معرض محمد سراج',
    )

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('Article')
    expect(jsonLd.headline).toBe('دليل شراء الثلاجات')
    expect(jsonLd.mainEntityOfPage).toBe('https://serag.co/guides/fridge-buying-guide')
    expect(jsonLd.url).toBe('https://serag.co/guides/fridge-buying-guide')
    expect(jsonLd.image).toBe('https://serag.co/uploads/guides/fridge.webp')
    expect(jsonLd.description).toBe('كل ما تحتاجه لاختيار ثلاجة')
    expect(jsonLd.datePublished).toBe('2026-01-05T09:00:00.000Z')
    expect(jsonLd.dateModified).toBe('2026-01-07T09:00:00.000Z')

    const author = jsonLd.author as Record<string, unknown>
    expect(author['@type']).toBe('Organization')
    expect(author.name).toBe('معرض محمد سراج')
    expect(jsonLd.publisher).toEqual(author)
  })

  it('omits the image when the guide has no cover', () => {
    const jsonLd = buildGuideJsonLd(
      createSampleGuide({ cover: null }),
      'https://serag.co/guides/fridge-buying-guide',
      'معرض محمد سراج',
    )
    expect(jsonLd.image).toBeUndefined()
  })

  it('omits optional summary and dates when absent', () => {
    const jsonLd = buildGuideJsonLd(
      createSampleGuide({ summary: null, seoDescription: null, publishedAt: null }),
      'https://serag.co/guides/fridge-buying-guide',
      'معرض محمد سراج',
    )
    expect(jsonLd.description).toBeUndefined()
    expect(jsonLd.datePublished).toBeUndefined()
  })
})
