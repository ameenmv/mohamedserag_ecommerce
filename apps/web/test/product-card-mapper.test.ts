import { describe, expect, it } from 'vitest'
import type { ProductDetail } from '@serag/shared'
import { toProductCard } from '../app/utils/product-card-mapper'

function createTestProductDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'prod-42',
    slug: 'tac-granite-cookware-set-9pcs',
    name: 'طقم حلل جرانيت تركي 9 قطع TAÇ',
    modelCode: 'TAC-GRN-9',
    price: 850000, // 8,500 EGP
    oldPrice: 950000,
    discountPercent: 11,
    image: { url: '/uploads/tac-main.webp', alt: 'TAÇ Set', isReal: true },
    images: [
      { id: 'img-1', url: '/uploads/tac-main.webp', alt: 'TAÇ Set', isReal: true, sort: 1 },
      { id: 'img-2', url: '/uploads/tac-pots.webp', alt: 'Pots', isReal: false, sort: 2 },
    ],
    availability: {
      state: 'in_stock',
      orderable: true,
      maxQty: 3,
      leadTimeText: null,
    },
    specs: [],
    setContents: [
      { item: 'حلة مقاس 20', size: '20 سم', qty: 1 },
    ],
    warranty: 'سنتان',
    warrantyActivation: 'عبر الفاتورة',
    origin: 'تركيا',
    leadTimeText: null,
    taxRate: 14,
    seoTitle: 'طقم حلل جرانيت تركي 9 قطع',
    seoDescription: 'طقم حلل تاتش تركي أصلي',
    category: {
      slug: 'cookware',
      name: 'أدوات منزلية ومطبخ',
      parent: null,
    },
    brand: {
      slug: 'tac',
      name: 'TAÇ',
      logoUrl: '/brands/tac.svg',
    },
    related: [],
    ...overrides,
  }
}

describe('product-card-mapper: toProductCard', () => {
  it('maps ProductDetail to a complete ProductCard with matching fields', () => {
    const detail = createTestProductDetail()
    const card = toProductCard(detail)

    expect(card).toEqual({
      id: 'prod-42',
      slug: 'tac-granite-cookware-set-9pcs',
      name: 'طقم حلل جرانيت تركي 9 قطع TAÇ',
      modelCode: 'TAC-GRN-9',
      brand: {
        slug: 'tac',
        name: 'TAÇ',
      },
      category: {
        slug: 'cookware',
        name: 'أدوات منزلية ومطبخ',
      },
      price: 850000,
      oldPrice: 950000,
      discountPercent: 11,
      image: {
        url: '/uploads/tac-main.webp',
        alt: 'TAÇ Set',
        isReal: true,
      },
      availability: {
        state: 'in_stock',
        orderable: true,
        maxQty: 3,
        leadTimeText: null,
      },
    })
  })

  it('uses first image from images array when detail.image is null', () => {
    const detail = createTestProductDetail({
      image: null,
      images: [
        { id: 'img-first', url: '/uploads/first.webp', alt: 'First Image', isReal: false, sort: 1 },
      ],
    })
    const card = toProductCard(detail)

    expect(card.image).toEqual({
      url: '/uploads/first.webp',
      alt: 'First Image',
      isReal: false,
    })
  })

  it('returns null image when both image and images array are empty', () => {
    const detail = createTestProductDetail({
      image: null,
      images: [],
    })
    const card = toProductCard(detail)

    expect(card.image).toBeNull()
  })
})
