import { describe, expect, it } from 'vitest'
import type { CategoryDetail, ProductDetail, SpecTemplateField } from '@serag/shared'
import {
  areValuesDifferent,
  buildCompareTable,
  formatCompareValue,
} from '../app/utils/compare-table'

function createMockCategory(
  slug: string,
  name: string,
  fields: SpecTemplateField[],
): CategoryDetail {
  return {
    id: `cat-${slug}`,
    slug,
    name,
    intro: null,
    seoTitle: null,
    seoDescription: null,
    parent: null,
    children: [],
    fields,
  }
}

function createMockProduct(
  id: string,
  name: string,
  categorySlug: string,
  price: number,
  options?: {
    brandName?: string
    warranty?: string | null
    origin?: string | null
    specs?: { key: string; label: string; value: string | number | boolean; unit?: string | null; type?: 'text' | 'number' | 'boolean' | 'choice' }[]
  },
): ProductDetail {
  return {
    id,
    slug: `slug-${id}`,
    name,
    modelCode: `MOD-${id}`,
    price,
    oldPrice: null,
    discountPercent: null,
    image: null,
    availability: {
      state: 'in_stock',
      orderable: true,
      maxQty: 5,
      leadTimeText: null,
    },
    images: [],
    specs: (options?.specs ?? []).map((s) => ({
      key: s.key,
      label: s.label,
      value: s.value,
      unit: s.unit ?? null,
      type: s.type ?? 'text',
    })),
    setContents: null,
    warranty: options?.warranty !== undefined ? options.warranty : '10 years',
    warrantyActivation: null,
    origin: options?.origin !== undefined ? options.origin : 'Egypt',
    leadTimeText: null,
    taxRate: 14,
    seoTitle: null,
    seoDescription: null,
    category: {
      slug: categorySlug,
      name: `Cat ${categorySlug}`,
      parent: null,
    },
    brand: {
      slug: (options?.brandName ?? 'LG').toLowerCase(),
      name: options?.brandName ?? 'LG',
      logoUrl: null,
    },
    related: [],
  }
}

describe('compare-table utils - areValuesDifferent', () => {
  it('returns false for empty list or single value', () => {
    expect(areValuesDifferent([])).toBe(false)
    expect(areValuesDifferent([100])).toBe(false)
    expect(areValuesDifferent(['LG'])).toBe(false)
    expect(areValuesDifferent([null])).toBe(false)
  })

  it('returns false when all values are strictly equal', () => {
    expect(areValuesDifferent([100, 100, 100])).toBe(false)
    expect(areValuesDifferent(['LG', 'LG'])).toBe(false)
    expect(areValuesDifferent([true, true])).toBe(false)
    expect(areValuesDifferent([null, null])).toBe(false)
  })

  it('returns true when any value differs', () => {
    expect(areValuesDifferent([100, 200])).toBe(true)
    expect(areValuesDifferent(['LG', 'Samsung'])).toBe(true)
    expect(areValuesDifferent([true, false])).toBe(true)
    expect(areValuesDifferent(['10 years', null])).toBe(true)
    expect(areValuesDifferent([null, 'Egypt'])).toBe(true)
  })
})

describe('compare-table utils - formatCompareValue', () => {
  it('formats null or undefined as "—"', () => {
    expect(formatCompareValue(null)).toBe('—')
    expect(formatCompareValue(undefined)).toBe('—')
  })

  it('formats booleans with default and custom yes/no labels', () => {
    expect(formatCompareValue(true)).toBe('Yes')
    expect(formatCompareValue(false)).toBe('No')
    expect(formatCompareValue(true, null, { yesLabel: 'أيوه', noLabel: 'لأ' })).toBe('أيوه')
    expect(formatCompareValue(false, null, { yesLabel: 'أيوه', noLabel: 'لأ' })).toBe('لأ')
  })

  it('formats numbers and strings with and without units', () => {
    expect(formatCompareValue(450, 'لتر')).toBe('450 لتر')
    expect(formatCompareValue(1400, 'لفة/دقيقة')).toBe('1400 لفة/دقيقة')
    expect(formatCompareValue(1200)).toBe('1200')
    expect(formatCompareValue('نوفروست')).toBe('نوفروست')
    expect(formatCompareValue('Inverter', 'motor')).toBe('Inverter motor')
  })
})

describe('compare-table utils - buildCompareTable', () => {
  const fridgeFields: SpecTemplateField[] = [
    {
      key: 'capacity',
      label: 'السعة اللترية',
      type: 'number',
      unit: 'لتر',
      filterable: true,
      comparable: true,
    },
    {
      key: 'cooling_type',
      label: 'نوع التبريد',
      type: 'choice',
      filterable: true,
      comparable: true,
    },
    {
      key: 'inverter',
      label: 'تكنولوجيا الانفرتر',
      type: 'boolean',
      filterable: true,
      comparable: true,
    },
    {
      key: 'color',
      label: 'اللون',
      type: 'choice',
      filterable: true,
      comparable: false, // NOT comparable!
    },
  ]

  const washerFields: SpecTemplateField[] = [
    {
      key: 'capacity',
      label: 'السعة',
      type: 'number',
      unit: 'كجم',
      filterable: true,
      comparable: true,
    },
    {
      key: 'spin_speed',
      label: 'سرعة العصر',
      type: 'number',
      unit: 'لفة/دقيقة',
      filterable: true,
      comparable: true,
    },
  ]

  const categories = [
    createMockCategory('fridges', 'ثلاجات', fridgeFields),
    createMockCategory('washers', 'غسالات', washerFields),
  ]

  it('returns empty result when products array is empty', () => {
    const res = buildCompareTable([], categories)
    expect(res.rows).toEqual([])
    expect(res.isMixed).toBe(false)
    expect(res.hasDifferences).toBe(false)
  })

  it('builds table for single product with zero differences', () => {
    const p1 = createMockProduct('p1', 'ثلاجة إل جي', 'fridges', 3000000, {
      specs: [
        { key: 'capacity', label: 'السعة اللترية', value: 450, unit: 'لتر', type: 'number' },
        { key: 'cooling_type', label: 'نوع التبريد', value: 'نوفروست' },
      ],
    })

    const res = buildCompareTable([p1], categories)
    expect(res.isMixed).toBe(false)
    expect(res.hasDifferences).toBe(false)
    expect(res.rows.map((r) => r.key)).toEqual([
      'price',
      'brand',
      'spec_capacity',
      'spec_cooling_type',
      'spec_inverter',
      'warranty',
      'origin',
    ])
  })

  it('handles union of comparable keys for products in the same category', () => {
    const p1 = createMockProduct('p1', 'ثلاجة 1', 'fridges', 2500000, {
      brandName: 'LG',
      warranty: '10 years',
      origin: 'Egypt',
      specs: [
        { key: 'capacity', label: 'السعة اللترية', value: 450, unit: 'لتر' },
        { key: 'cooling_type', label: 'نوع التبريد', value: 'نوفروست' },
        { key: 'inverter', label: 'تكنولوجيا الانفرتر', value: true, type: 'boolean' },
      ],
    })

    const p2 = createMockProduct('p2', 'ثلاجة 2', 'fridges', 3000000, {
      brandName: 'Samsung',
      warranty: '10 years',
      origin: 'Egypt',
      specs: [
        { key: 'capacity', label: 'السعة اللترية', value: 500, unit: 'لتر' },
        { key: 'cooling_type', label: 'نوع التبريد', value: 'نوفروست' },
        { key: 'inverter', label: 'تكنولوجيا الانفرتر', value: false, type: 'boolean' },
      ],
    })

    const res = buildCompareTable([p1, p2], categories)

    expect(res.isMixed).toBe(false)
    expect(res.hasDifferences).toBe(true)

    // Check row order: price, brand, specs, warranty, origin
    const rowKeys = res.rows.map((r) => r.key)
    expect(rowKeys).toEqual([
      'price',
      'brand',
      'spec_capacity',
      'spec_cooling_type',
      'spec_inverter',
      'warranty',
      'origin',
    ])

    // Price differs (2500000 vs 3000000)
    const priceRow = res.rows.find((r) => r.key === 'price')!
    expect(priceRow.different).toBe(true)
    expect(priceRow.values).toEqual([2500000, 3000000])

    // Brand differs (LG vs Samsung)
    const brandRow = res.rows.find((r) => r.key === 'brand')!
    expect(brandRow.different).toBe(true)
    expect(brandRow.values).toEqual(['LG', 'Samsung'])

    // Capacity differs (450 vs 500)
    const capRow = res.rows.find((r) => r.key === 'spec_capacity')!
    expect(capRow.different).toBe(true)
    expect(capRow.unit).toBe('لتر')
    expect(capRow.values).toEqual([450, 500])

    // Cooling type is identical ('نوفروست' vs 'نوفروست')
    const coolingRow = res.rows.find((r) => r.key === 'spec_cooling_type')!
    expect(coolingRow.different).toBe(false)
    expect(coolingRow.values).toEqual(['نوفروست', 'نوفروست'])

    // Inverter differs (true vs false)
    const inverterRow = res.rows.find((r) => r.key === 'spec_inverter')!
    expect(inverterRow.different).toBe(true)
    expect(inverterRow.values).toEqual([true, false])

    // Warranty is identical ('10 years' vs '10 years')
    const warrantyRow = res.rows.find((r) => r.key === 'warranty')!
    expect(warrantyRow.different).toBe(false)

    // Origin is identical ('Egypt' vs 'Egypt')
    const originRow = res.rows.find((r) => r.key === 'origin')!
    expect(originRow.different).toBe(false)
  })

  it('handles missing spec values gracefully with null', () => {
    const p1 = createMockProduct('p1', 'ثلاجة 1', 'fridges', 2500000, {
      specs: [
        { key: 'capacity', label: 'السعة اللترية', value: 450, unit: 'لتر' },
      ],
    })

    const p2 = createMockProduct('p2', 'ثلاجة 2', 'fridges', 2500000, {
      specs: [], // No specs defined
    })

    const res = buildCompareTable([p1, p2], categories)
    const capRow = res.rows.find((r) => r.key === 'spec_capacity')!
    expect(capRow.values).toEqual([450, null])
    expect(capRow.different).toBe(true)

    // Cooling type absent in both
    const coolingRow = res.rows.find((r) => r.key === 'spec_cooling_type')!
    expect(coolingRow.values).toEqual([null, null])
    expect(coolingRow.different).toBe(false)
  })

  it('handles mixed categories by intersecting spec keys present in ALL products', () => {
    const fridge = createMockProduct('p-fridge', 'ثلاجة', 'fridges', 2500000, {
      specs: [
        { key: 'capacity', label: 'السعة', value: 450, unit: 'لتر' },
        { key: 'cooling_type', label: 'نوع التبريد', value: 'نوفروست' },
        { key: 'inverter', label: 'انفرتر', value: true },
      ],
    })

    const washer = createMockProduct('p-washer', 'غسالة', 'washers', 1800000, {
      specs: [
        { key: 'capacity', label: 'السعة', value: 9, unit: 'كجم' },
        { key: 'spin_speed', label: 'سرعة العصر', value: 1200 },
      ],
    })

    const res = buildCompareTable([fridge, washer], categories)

    expect(res.isMixed).toBe(true)

    // Only 'capacity' is present in BOTH fridge and washer specs
    const specRows = res.rows.filter((r) => r.type === 'spec')
    expect(specRows).toHaveLength(1)
    expect(specRows[0]?.key).toBe('spec_capacity')
    expect(specRows[0]?.values).toEqual([450, 9])
    expect(specRows[0]?.different).toBe(true)

    // Standard rows: price, brand, warranty, origin are always included
    expect(res.rows.map((r) => r.key)).toEqual([
      'price',
      'brand',
      'spec_capacity',
      'warranty',
      'origin',
    ])
  })
})
