import { describe, expect, it } from 'vitest'
import {
  productQuerySchema,
  resolveCatalogSort,
  specTemplateFieldSchema,
  type SpecTemplateField,
} from '@serag/shared'
import {
  buildAvailabilitySqlCondition,
  buildSpecFilterSqlConditions,
  mapSortToOrderBy,
  parseAvailabilityFilter,
  parseSpecFilters,
  popularityJoinSql,
  toProductCard,
  type RawProductEntity,
} from './product-query.js'

describe('productQuerySchema (query validation & defaults)', () => {
  it('applies defaults for page, pageSize, and sort when omitted', () => {
    const parsed = productQuerySchema.parse({})
    expect(parsed.page).toBe(1)
    expect(parsed.pageSize).toBe(24)
    expect(parsed.sort).toBeUndefined()
    expect(resolveCatalogSort(parsed)).toBe('popular')
    expect(parsed.discounted).toBeUndefined()
  })

  it('coerces string numbers for page, pageSize, minPrice, and maxPrice', () => {
    const parsed = productQuerySchema.parse({
      page: '3',
      pageSize: '30',
      minPrice: '500',
      maxPrice: '15000',
    })
    expect(parsed.page).toBe(3)
    expect(parsed.pageSize).toBe(30)
    expect(parsed.minPrice).toBe(500)
    expect(parsed.maxPrice).toBe(15000)
  })

  it('allows pageSize up to 60 and rejects > 60', () => {
    expect(productQuerySchema.parse({ pageSize: 60 }).pageSize).toBe(60)
    expect(() => productQuerySchema.parse({ pageSize: 61 })).toThrow()
  })

  it('rejects page < 1 and negative prices', () => {
    expect(() => productQuerySchema.parse({ page: 0 })).toThrow()
    expect(() => productQuerySchema.parse({ minPrice: -10 })).toThrow()
    expect(() => productQuerySchema.parse({ maxPrice: -50 })).toThrow()
  })

  it('parses discounted flag from boolean or string', () => {
    expect(productQuerySchema.parse({ discounted: 'true' }).discounted).toBe(true)
    expect(productQuerySchema.parse({ discounted: true }).discounted).toBe(true)
    expect(productQuerySchema.parse({ discounted: 'false' }).discounted).toBe(false)
    expect(productQuerySchema.parse({}).discounted).toBeUndefined()
  })

  it('enforces maximum 60 product IDs in ids query', () => {
    const fiftyIds = Array.from({ length: 50 }, (_, i) => `id_${i}`).join(',')
    expect(productQuerySchema.parse({ ids: fiftyIds }).ids).toBe(fiftyIds)

    const sixtyIds = Array.from({ length: 60 }, (_, i) => `id_${i}`).join(',')
    expect(productQuerySchema.parse({ ids: sixtyIds }).ids).toBe(sixtyIds)

    const sixtyOneIds = Array.from({ length: 61 }, (_, i) => `id_${i}`).join(',')
    expect(() => productQuerySchema.parse({ ids: sixtyOneIds })).toThrow()
  })

  it('passes through spec.* parameters for custom filter parsing', () => {
    const parsed = productQuerySchema.parse({
      category: 'refrigerators',
      'spec.cooling': 'نوفروست',
      'spec.capacity_l': '350..500',
    })
    expect(parsed['spec.cooling']).toBe('نوفروست')
    expect(parsed['spec.capacity_l']).toBe('350..500')
  })
})

describe('specTemplateFieldSchema', () => {
  it('normalizes legacy "select" type to "choice"', () => {
    const field = specTemplateFieldSchema.parse({
      key: 'cooling',
      label: 'نظام التبريد',
      type: 'select',
      options: ['نوفروست', 'ديفروست'],
      filterable: true,
      comparable: true,
    })
    expect(field.type).toBe('choice')
  })

  it('validates text, number, boolean, choice field shapes', () => {
    const numberField = specTemplateFieldSchema.parse({
      key: 'capacity_l',
      label: 'السعة باللتر',
      type: 'number',
      unit: 'لتر',
      filterable: true,
      comparable: true,
    })
    expect(numberField.type).toBe('number')
    expect(numberField.unit).toBe('لتر')

    const boolField = specTemplateFieldSchema.parse({
      key: 'inverter',
      label: 'موتور انفرتر',
      type: 'boolean',
      filterable: true,
      comparable: true,
    })
    expect(boolField.type).toBe('boolean')
  })
})

describe('parseSpecFilters', () => {
  const fields: SpecTemplateField[] = [
    {
      key: 'cooling',
      label: 'نظام التبريد',
      type: 'choice',
      options: ['نوفروست', 'ديفروست'],
      filterable: true,
      comparable: true,
    },
    {
      key: 'inverter',
      label: 'انفرتر',
      type: 'boolean',
      filterable: true,
      comparable: true,
    },
    {
      key: 'capacity_l',
      label: 'السعة',
      type: 'number',
      unit: 'لتر',
      filterable: true,
      comparable: true,
    },
    {
      key: 'color',
      label: 'اللون',
      type: 'choice',
      options: ['فضي', 'أسود'],
      filterable: false, // NOT filterable
      comparable: true,
    },
  ]

  it('honours only filterable fields and ignores unknown or non-filterable keys', () => {
    const raw = {
      'spec.cooling': 'نوفروست,ديفروست',
      'spec.color': 'فضي', // non-filterable
      'spec.random_unknown': 'something', // unknown
    }

    const filters = parseSpecFilters(raw, fields)
    expect(filters).toHaveLength(1)
    expect(filters[0]).toEqual({
      key: 'cooling',
      type: 'choice',
      values: ['نوفروست', 'ديفروست'],
    })
  })

  it('parses boolean specs with various true/false formats', () => {
    const filters = parseSpecFilters({ 'spec.inverter': 'true' }, fields)
    expect(filters).toEqual([{ key: 'inverter', type: 'boolean', values: [true] }])

    const filtersFalse = parseSpecFilters({ 'spec.inverter': '0' }, fields)
    expect(filtersFalse).toEqual([{ key: 'inverter', type: 'boolean', values: [false] }])
  })

  it('parses number range filters: min..max, min.., ..max, and exact values', () => {
    const rangeBoth = parseSpecFilters({ 'spec.capacity_l': '350..500' }, fields)
    expect(rangeBoth).toEqual([{ key: 'capacity_l', type: 'number', min: 350, max: 500 }])

    const rangeMinOnly = parseSpecFilters({ 'spec.capacity_l': '400..' }, fields)
    expect(rangeMinOnly).toEqual([{ key: 'capacity_l', type: 'number', min: 400, max: undefined }])

    const rangeMaxOnly = parseSpecFilters({ 'spec.capacity_l': '..450' }, fields)
    expect(rangeMaxOnly).toEqual([{ key: 'capacity_l', type: 'number', min: undefined, max: 450 }])

    const exactNumber = parseSpecFilters({ 'spec.capacity_l': '450' }, fields)
    expect(exactNumber).toEqual([{ key: 'capacity_l', type: 'number', min: 450, max: 450 }])
  })

  it('supports nested spec object in addition to spec.<key> strings', () => {
    const raw = {
      spec: {
        cooling: 'نوفروست',
        inverter: 'true',
      },
    }
    const filters = parseSpecFilters(raw, fields)
    expect(filters).toHaveLength(2)
  })
})

describe('buildSpecFilterSqlConditions', () => {
  it('generates parameterized SQL fragments for choice, boolean, and number', () => {
    const conditions = buildSpecFilterSqlConditions([
      { key: 'cooling', type: 'choice', values: ['نوفروست'] },
      { key: 'inverter', type: 'boolean', values: [true] },
      { key: 'capacity_l', type: 'number', min: 300, max: 500 },
    ])

    expect(conditions).toHaveLength(3)
    expect(conditions[0]?.sql).toContain('p.specs->>')
    expect(conditions[0]?.sql).toContain('IN')
    expect(conditions[1]?.sql).toContain('p.specs->>')
    expect(conditions[2]?.sql).toContain('::numeric')
  })
})

describe('mapSortToOrderBy', () => {
  it('maps popular to units_sold DESC with ties broken by newest', () => {
    const sql = mapSortToOrderBy('popular')
    expect(sql.sql).toContain('pop.units_sold')
    expect(sql.sql).toContain('p.created_at DESC')
  })

  it('maps price_asc and price_desc correctly', () => {
    const asc = mapSortToOrderBy('price_asc')
    expect(asc.sql).toContain('p.price ASC')

    const desc = mapSortToOrderBy('price_desc')
    expect(desc.sql).toContain('p.price DESC')
  })

  it('maps discount to percentage off calculation', () => {
    const disc = mapSortToOrderBy('discount')
    expect(disc.sql).toContain('p.old_price')
    expect(disc.sql).toContain('DESC')
  })

  it('maps newest to created_at DESC', () => {
    const newest = mapSortToOrderBy('newest')
    expect(newest.sql).toContain('p.created_at DESC')
  })

  it('maps relevance to searchRankSql when normalizedQuery is provided', () => {
    const rel = mapSortToOrderBy('relevance', 'samsung')
    expect(rel.sql).toContain('word_similarity')
    expect(rel.sql).toContain('lower(p.model_code)')
  })

  it('maps relevance to popular ordering fallback when normalizedQuery is absent', () => {
    const rel = mapSortToOrderBy('relevance')
    expect(rel.sql).toContain('pop.units_sold')
    expect(rel.sql).toContain('p.created_at DESC')
  })
})

describe('resolveCatalogSort', () => {
  it('resolves default sort to popular when sort and q are omitted', () => {
    expect(resolveCatalogSort({})).toBe('popular')
  })

  it('resolves to relevance when q is present without sort', () => {
    expect(resolveCatalogSort({ q: 'samsung' })).toBe('relevance')
    expect(resolveCatalogSort({ q: '  تلاجه  ' })).toBe('relevance')
  })

  it('honours explicit sort even when q is present', () => {
    expect(resolveCatalogSort({ q: 'samsung', sort: 'price_asc' })).toBe('price_asc')
    expect(resolveCatalogSort({ q: 'samsung', sort: 'newest' })).toBe('newest')
  })

  it('falls back to popular when q is whitespace only', () => {
    expect(resolveCatalogSort({ q: '   ' })).toBe('popular')
  })
})

describe('popularityJoinSql', () => {
  it('joins order_items with orders and checks delivered order_events within 90 days', () => {
    const joinSql = popularityJoinSql()
    expect(joinSql.sql).toContain('order_items')
    expect(joinSql.sql).toContain('order_events')
    expect(joinSql.sql).toContain("o.status = 'delivered'")
    expect(joinSql.sql).toContain("oe.status = 'delivered'")
    expect(joinSql.sql).toContain("oe.at >= NOW() - INTERVAL '90 days'")
  })
})

describe('parseAvailabilityFilter and buildAvailabilitySqlCondition', () => {
  it('parses valid availability states and ignores invalid', () => {
    const parsed = parseAvailabilityFilter('in_stock,low,invalid_state,out')
    expect(parsed).toEqual(['in_stock', 'low', 'out'])
  })

  it('builds SQL OR condition for availability', () => {
    const sql = buildAvailabilitySqlCondition(['in_stock', 'out'])
    expect(sql).not.toBeNull()
    expect(sql?.sql).toContain('p.availability_mode')
    expect(sql?.sql).toContain('OR')
  })
})

describe('toProductCard', () => {
  const dummyProduct: RawProductEntity = {
    id: 'prod_123',
    slug: 'samsung-fridge-450',
    name: 'ثلاجة سامسونج 450 لتر',
    modelCode: 'SR-S1',
    price: 2890000,
    oldPrice: 3250000,
    stock: 5,
    lowStockThreshold: 3,
    availabilityMode: 'auto',
    leadTimeText: null,
    brand: { slug: 'samsung', name: 'سامسونج' },
    category: { slug: 'refrigerators', name: 'ثلاجات وفريزر' },
    images: [{ url: '/img/fridge.jpg', alt: 'ثلاجة', isReal: false }],
  }

  it('transforms entity into ProductCard with integer discount and availability', () => {
    const card = toProductCard(dummyProduct)
    expect(card.id).toBe('prod_123')
    expect(card.price).toBe(2890000)
    expect(card.oldPrice).toBe(3250000)
    // 32500 - 28900 = 3600 / 32500 = ~11%
    expect(card.discountPercent).toBe(11)
    expect(card.image).toEqual({
      url: '/img/fridge.jpg',
      alt: 'ثلاجة',
      isReal: false,
    })
    expect(card.availability.state).toBe('in_stock')
    expect(card.availability.orderable).toBe(true)
    expect(card.availability.maxQty).toBe(5)
    expect(card.rating).toBeNull()
  })

  it('attaches rating when provided', () => {
    const rating = { average: 4.8, count: 5 }
    const withRating = toProductCard(dummyProduct, null, rating)
    expect(withRating.rating).toEqual(rating)
  })

  it('sets discountPercent to null when no oldPrice exists', () => {
    const noDiscount = toProductCard({ ...dummyProduct, oldPrice: null })
    expect(noDiscount.discountPercent).toBeNull()
  })

  it('handles empty images array with null image', () => {
    const noImage = toProductCard({ ...dummyProduct, images: [] })
    expect(noImage.image).toBeNull()
  })
})
