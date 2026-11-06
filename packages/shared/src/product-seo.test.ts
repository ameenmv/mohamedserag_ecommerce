import { describe, expect, it } from 'vitest'
import {
  buildProductSeoDescription,
  buildProductSeoTitle,
  PRODUCT_SEO_TITLE_MAX,
  buildProductSlug,
  type ProductSeoInput,
} from './product-seo.js'

const arabicProduct: ProductSeoInput = {
  name: 'بوتاجاز غاز 4 شعلة',
  brandName: 'فريش',
  modelCode: 'SR-S15',
  price: 940000,
  compareAtPrice: 1080000,
  warranty: 'ضمان 5 سنوات',
  available: true,
}

const englishProduct: ProductSeoInput = {
  name: 'Gas Cooker 4 Burners',
  brandName: 'Fresh',
  modelCode: 'SR-S15',
  price: 940000,
  compareAtPrice: 1080000,
  warranty: '5-year warranty',
  available: true,
}

describe('buildProductSlug', () => {
  it('builds the brand-category-model format with a singular category', () => {
    expect(
      buildProductSlug({
        brandSlug: 'fresh',
        categorySlug: 'cookers',
        modelCode: 'SR-S15',
      }),
    ).toBe('fresh-cooker-sr-s15')
  })

  it('singularizes ies, trailing s, and leaves ss words alone', () => {
    expect(
      buildProductSlug({ brandSlug: 'x', categorySlug: 'accessories', modelCode: 'A1' }),
    ).toContain('accessory')
    expect(
      buildProductSlug({ brandSlug: 'x', categorySlug: 'fridges', modelCode: 'A1' }),
    ).toContain('fridge')
    expect(
      buildProductSlug({ brandSlug: 'x', categorySlug: 'glass', modelCode: 'A1' }),
    ).toContain('glass')
  })

  it('does not repeat a brand that already starts the model code', () => {
    expect(
      buildProductSlug({
        brandSlug: 'fresh',
        categorySlug: 'cookers',
        modelCode: 'Fresh-SR-15',
      }),
    ).toBe('fresh-cooker-sr-15')
  })

  it('caps long slugs at 80 characters on a dash boundary', () => {
    const slug = buildProductSlug({
      brandSlug: 'brand',
      categorySlug: 'cookers',
      modelCode: 'super-long-model-code-that-keeps-going-and-going-for-a-very-long-time',
    })
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.startsWith('brand-cooker-super-long')).toBe(true)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('falls back to product when no latin segments exist', () => {
    expect(
      buildProductSlug({ brandSlug: '', categorySlug: '', modelCode: 'ثلاجة توشيبا' }),
    ).toBe('product')
  })
})

describe('buildProductSeoTitle', () => {
  it('builds the Arabic title from name, brand and model (store name comes from the page template)', () => {
    expect(buildProductSeoTitle(arabicProduct, 'ar')).toBe('بوتاجاز غاز 4 شعلة فريش SR-S15')
  })

  it('builds the English title', () => {
    expect(buildProductSeoTitle(englishProduct, 'en')).toBe('Gas Cooker 4 Burners Fresh SR-S15')
  })

  it('skips the brand and model when the name already contains them', () => {
    expect(
      buildProductSeoTitle({ ...arabicProduct, name: 'فريش SR-S15 بوتاجاز غاز' }, 'ar'),
    ).toBe('فريش SR-S15 بوتاجاز غاز')
  })

  it('truncates long titles on a word boundary within the title limit', () => {
    const title = buildProductSeoTitle({ ...englishProduct, name: 'word '.repeat(20) }, 'en')
    expect(title.length).toBeLessThanOrEqual(PRODUCT_SEO_TITLE_MAX)
    expect(title.endsWith('word')).toBe(true)
  })
})

describe('buildProductSeoDescription', () => {
  it('builds the Arabic discount description', () => {
    expect(buildProductSeoDescription(arabicProduct, 'ar')).toBe(
      'بوتاجاز غاز 4 شعلة فريش بـ 9,400 ج.م بدل 10,800. ضمان 5 سنوات فريش. توصيل لحد البيت والدفع عند الاستلام.',
    )
  })

  it('omits the compare-at sentence when there is no discount', () => {
    expect(
      buildProductSeoDescription({ ...arabicProduct, compareAtPrice: null }, 'ar'),
    ).toBe(
      'بوتاجاز غاز 4 شعلة فريش بـ 9,400 ج.م. ضمان 5 سنوات فريش. توصيل لحد البيت والدفع عند الاستلام.',
    )
  })

  it('replaces the price with an out-of-stock sentence when unavailable', () => {
    expect(
      buildProductSeoDescription({ ...arabicProduct, available: false }, 'ar'),
    ).toBe(
      'بوتاجاز غاز 4 شعلة فريش. غير متوفر حاليًا، سجّل طلب تنبيه عند توفره. ضمان 5 سنوات فريش. توصيل لحد البيت والدفع عند الاستلام.',
    )
  })

  it('omits the warranty sentence when there is no warranty', () => {
    expect(
      buildProductSeoDescription({ ...arabicProduct, warranty: null }, 'ar'),
    ).toBe(
      'بوتاجاز غاز 4 شعلة فريش بـ 9,400 ج.م بدل 10,800. توصيل لحد البيت والدفع عند الاستلام.',
    )
  })

  it('builds the English discount description', () => {
    expect(buildProductSeoDescription(englishProduct, 'en')).toBe(
      'Gas Cooker 4 Burners Fresh for 9,400 EGP, down from 10,800 EGP. 5-year warranty Fresh. Home delivery with cash on delivery.',
    )
  })

  it('caps long descriptions at a sentence boundary within 155 characters', () => {
    const warrantyText = 'و'.repeat(130)
    const description = buildProductSeoDescription(
      {
        ...arabicProduct,
        name: 'منتج',
        brandName: '',
        warranty: `${warrantyText}.`,
        compareAtPrice: null,
      },
      'ar',
    )
    expect(description.length).toBeLessThanOrEqual(155)
    expect(description).toContain(warrantyText)
    expect(description.endsWith('.')).toBe(true)
    expect(description).not.toContain('توصيل لحد البيت')
  })

  it('falls back to a word boundary when no sentence fits', () => {
    const description = buildProductSeoDescription(
      {
        ...arabicProduct,
        name: 'كلمة '.repeat(40),
        brandName: '',
        warranty: null,
        compareAtPrice: null,
      },
      'ar',
    )
    expect(description.length).toBeLessThanOrEqual(155)
    expect(description.endsWith(' ')).toBe(false)
    expect(description.endsWith('كلمة')).toBe(true)
  })
})
