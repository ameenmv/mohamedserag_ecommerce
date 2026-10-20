import { describe, expect, it } from 'vitest'
import type { ProductDetail } from '@serag/shared'
import {
  buildProductJsonLd,
  mapAvailabilityToSchemaUrl,
} from '../app/utils/product-jsonld'

function createSampleDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'prod-101',
    slug: 'samsung-fridge-450l',
    name: 'ثلاجة سامسونج نوفروست 450 لتر',
    modelCode: 'RT45K6200S8',
    price: 2890000, // 28,900 EGP in piastres
    oldPrice: 3250000,
    discountPercent: 11,
    image: { url: '/uploads/main.webp', alt: 'Samsung 450L', isReal: true },
    images: [
      { id: 'img-1', url: '/uploads/front.webp', alt: 'Front view', isReal: false, sort: 1 },
      { id: 'img-2', url: '/uploads/inside.webp', alt: 'Inside view', isReal: true, sort: 2 },
    ],
    availability: {
      state: 'in_stock',
      orderable: true,
      maxQty: 5,
      leadTimeText: null,
    },
    specs: [],
    setContents: null,
    warranty: '10 سنوات من سامسونج مصر',
    warrantyActivation: 'عبر الخط الساخن 16580',
    origin: 'مصر',
    leadTimeText: null,
    taxRate: 14,
    seoTitle: 'ثلاجة سامسونج 450 لتر بأفضل سعر في المنصورة',
    seoDescription: 'اشترِ ثلاجة سامسونج 450 لتر مع ضمان الوكيل',
    category: {
      slug: 'refrigerators',
      name: 'ثلاجات وفريزر',
      parent: null,
    },
    brand: {
      slug: 'samsung',
      name: 'سامسونج',
      logoUrl: '/brands/samsung.svg',
    },
    related: [],
    flash: null,
    rating: null,
    ...overrides,
  }
}

describe('product-jsonld: mapAvailabilityToSchemaUrl', () => {
  it('maps in_stock to Schema.org InStock', () => {
    expect(mapAvailabilityToSchemaUrl('in_stock')).toBe('https://schema.org/InStock')
  })

  it('maps low to Schema.org LimitedAvailability', () => {
    expect(mapAvailabilityToSchemaUrl('low')).toBe('https://schema.org/LimitedAvailability')
  })

  it('maps on_request to Schema.org PreOrder', () => {
    expect(mapAvailabilityToSchemaUrl('on_request')).toBe('https://schema.org/PreOrder')
  })

  it('maps out to Schema.org OutOfStock', () => {
    expect(mapAvailabilityToSchemaUrl('out')).toBe('https://schema.org/OutOfStock')
    expect(mapAvailabilityToSchemaUrl('unknown_state')).toBe('https://schema.org/OutOfStock')
  })
})

describe('product-jsonld: buildProductJsonLd', () => {
  it('builds complete Schema.org Product document with offers and brand', () => {
    const detail = createSampleDetail()
    const jsonLd = buildProductJsonLd(detail, 'https://serag.co/p/samsung-fridge-450l')

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('Product')
    expect(jsonLd.name).toBe('ثلاجة سامسونج نوفروست 450 لتر')
    expect(jsonLd.sku).toBe('RT45K6200S8')
    expect(jsonLd.url).toBe('https://serag.co/p/samsung-fridge-450l')

    expect(jsonLd.brand).toEqual({
      '@type': 'Brand',
      name: 'سامسونج',
    })

    expect(jsonLd.image).toEqual(['/uploads/front.webp', '/uploads/inside.webp'])

    const offers = jsonLd.offers as Record<string, unknown>
    expect(offers['@type']).toBe('Offer')
    expect(offers.price).toBe(28900) // Converted from 2,890,000 piastres to 28,900 EGP
    expect(offers.priceCurrency).toBe('EGP')
    expect(offers.availability).toBe('https://schema.org/InStock')
    expect(offers.itemCondition).toBe('https://schema.org/NewCondition')
    expect(offers.url).toBe('https://serag.co/p/samsung-fridge-450l')
  })

  it('handles single image correctly as string property', () => {
    const detail = createSampleDetail({
      images: [{ id: 'img-1', url: '/uploads/single.webp', alt: 'Only', isReal: false, sort: 1 }],
    })
    const jsonLd = buildProductJsonLd(detail)

    expect(jsonLd.image).toBe('/uploads/single.webp')
  })

  it('falls back to product.image when images array is empty', () => {
    const detail = createSampleDetail({
      images: [],
      image: { url: '/uploads/fallback.webp', alt: 'Fallback', isReal: false },
    })
    const jsonLd = buildProductJsonLd(detail)

    expect(jsonLd.image).toBe('/uploads/fallback.webp')
  })

  it('correctly sets PreOrder availability for on_request products', () => {
    const detail = createSampleDetail({
      availability: {
        state: 'on_request',
        orderable: true,
        maxQty: null,
        leadTimeText: '3-7 أيام',
      },
    })
    const jsonLd = buildProductJsonLd(detail)
    const offers = jsonLd.offers as Record<string, unknown>

    expect(offers.availability).toBe('https://schema.org/PreOrder')
  })

  it('omits aggregateRating when product has no rating or rating count is 0', () => {
    const detailNoRating = createSampleDetail({ rating: null })
    const jsonLdNoRating = buildProductJsonLd(detailNoRating)
    expect(jsonLdNoRating.aggregateRating).toBeUndefined()

    const detailZeroCount = createSampleDetail({
      rating: { average: 0, count: 0 },
    })
    const jsonLdZeroCount = buildProductJsonLd(detailZeroCount)
    expect(jsonLdZeroCount.aggregateRating).toBeUndefined()
  })

  it('includes aggregateRating when product has valid rating with count > 0', () => {
    const detailWithRating = createSampleDetail({
      rating: { average: 4.2, count: 15 },
    })
    const jsonLd = buildProductJsonLd(detailWithRating)

    expect(jsonLd.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.2,
      reviewCount: 15,
      bestRating: 5,
      worstRating: 1,
    })
  })
})
