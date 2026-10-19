import { describe, expect, it } from 'vitest'
import {
  buildProductCardPreview,
  type ProductPreviewDraft,
} from '../app/utils/admin-product-preview'

const LABELS = {
  defaultName: 'New Product Name',
  defaultBrand: 'Brand',
  defaultCategory: 'Category',
  defaultImageAlt: 'Product Image',
}

describe('buildProductCardPreview', () => {
  const dummyContext = {
    brands: [{ id: 'b1', name: 'إل جي', slug: 'lg' }],
    categories: [{ id: 'c1', name: 'غسالات', slug: 'washers' }],
  }

  it('correctly maps a full draft with discount and images', () => {
    const draft: ProductPreviewDraft = {
      id: 'p-123',
      name: 'غسالة 9 كيلو فيفاس',
      modelCode: 'F4R5VGG2E',
      slug: 'lg-washer-9kg',
      brandId: 'b1',
      categoryId: 'c1',
      price: 2400000, // 24,000 EGP in piastres
      oldPrice: 3000000, // 30,000 EGP in piastres
      stock: 5,
      lowStockThreshold: 2,
      availabilityMode: 'auto',
      images: [
        { url: '/uploads/wash.webp', alt: 'صورة الغسالة', isReal: true },
        { url: '/uploads/wash2.webp', alt: 'صورة ثانية', isReal: false },
      ],
    }

    const card = buildProductCardPreview(draft, dummyContext, LABELS)

    expect(card.id).toBe('p-123')
    expect(card.name).toBe('غسالة 9 كيلو فيفاس')
    expect(card.slug).toBe('lg-washer-9kg')
    expect(card.modelCode).toBe('F4R5VGG2E')
    expect(card.brand).toEqual({ name: 'إل جي', slug: 'lg' })
    expect(card.category).toEqual({ name: 'غسالات', slug: 'washers' })
    expect(card.price).toBe(2400000)
    expect(card.oldPrice).toBe(3000000)
    expect(card.discountPercent).toBe(20)
    expect(card.image).toEqual({
      url: '/uploads/wash.webp',
      alt: 'صورة الغسالة',
      isReal: true,
    })
    expect(card.availability.state).toBe('in_stock')
    expect(card.availability.orderable).toBe(true)
  })

  it('handles empty / new draft with graceful fallbacks and custom labels', () => {
    const draft: ProductPreviewDraft = {
      name: '',
      modelCode: '',
      price: 0,
      stock: 0,
      lowStockThreshold: 3,
      availabilityMode: 'auto',
    }

    const customLabels = {
      defaultName: 'New Product Name',
      defaultBrand: 'Brand',
      defaultCategory: 'Category',
      defaultImageAlt: 'Product Image',
    }

    const card = buildProductCardPreview(draft, undefined, customLabels)

    expect(card.id).toBe('preview')
    expect(card.name).toBe('New Product Name')
    expect(card.price).toBe(0)
    expect(card.oldPrice).toBeNull()
    expect(card.discountPercent).toBeNull()
    expect(card.image).toBeNull()
    expect(card.brand.name).toBe('Brand')
    expect(card.category.name).toBe('Category')
    expect(card.availability.state).toBe('out')
    expect(card.availability.orderable).toBe(false)
  })

  it('maps on_request availability and lead time text correctly', () => {
    const draft: ProductPreviewDraft = {
      name: 'ثلاجة خاصة',
      modelCode: 'REF-001',
      price: 5000000,
      stock: 0,
      lowStockThreshold: 2,
      availabilityMode: 'on_request',
      leadTimeText: 'خلال 4 أيام عمل',
    }

    const card = buildProductCardPreview(draft, undefined, LABELS)

    expect(card.availability.state).toBe('on_request')
    expect(card.availability.orderable).toBe(true)
    expect(card.availability.leadTimeText).toBe('خلال 4 أيام عمل')
  })
})
