import { describe, expect, it } from 'vitest'
import type { CatalogFacetBrand, SpecTemplateField } from '@serag/shared'
import { DEFAULT_LISTING_FILTERS, type ListingFilters } from '../app/utils/catalog-query'
import { buildActiveChips } from '../app/utils/listing-chips'

const mockBrands: CatalogFacetBrand[] = [
  { slug: 'lg', name: 'LG', count: 12 },
  { slug: 'samsung', name: 'Samsung', count: 8 },
]

const mockFields: SpecTemplateField[] = [
  { key: 'capacity', label: 'السعة', type: 'number', unit: 'لتر', filterable: true, comparable: true },
  { key: 'inverter', label: 'انفرتر', type: 'boolean', filterable: true, comparable: true },
  { key: 'color', label: 'اللون', type: 'choice', options: ['silver', 'black'], filterable: true, comparable: true },
]

function mockT(key: string): string {
  const table: Record<string, string> = {
    'store.listing.egpUnit': 'ج.م',
    'store.listing.fromPrice': 'من',
    'store.listing.upToPrice': 'حتى',
    'store.listing.discountedOnly': 'عليه خصم فقط',
    'store.availability.inStock': 'متوفر',
    'store.availability.low': 'كمية محدودة',
    'store.availability.onRequest': 'متاح بالطلب',
    'store.availability.outOfStock': 'نفذ',
  }
  return table[key] ?? key
}

describe('buildActiveChips utility', () => {
  it('builds a search query chip with patch clearing q', () => {
    const filters: ListingFilters = { ...DEFAULT_LISTING_FILTERS, q: 'smart tv' }
    const chips = buildActiveChips(filters, { t: mockT })

    expect(chips).toHaveLength(1)
    expect(chips[0]).toEqual({
      id: 'q',
      label: '"smart tv"',
      patch: { q: undefined },
    })
  })

  it('builds brand chips with brand name from facet and patch removing only that brand', () => {
    const filters: ListingFilters = { ...DEFAULT_LISTING_FILTERS, brands: ['lg', 'samsung'] }
    const chips = buildActiveChips(filters, { brands: mockBrands, t: mockT })

    expect(chips).toHaveLength(2)
    expect(chips[0]).toEqual({
      id: 'brand:lg',
      label: 'LG',
      patch: { brands: ['samsung'] },
    })
    expect(chips[1]).toEqual({
      id: 'brand:samsung',
      label: 'Samsung',
      patch: { brands: ['lg'] },
    })
  })

  it('builds price range chip with formatted numbers without bare toLocaleString()', () => {
    // Both min and max
    const both = buildActiveChips(
      { ...DEFAULT_LISTING_FILTERS, minPrice: 1000, maxPrice: 15000 },
      { t: mockT },
    )
    expect(both).toHaveLength(1)
    expect(both[0]?.id).toBe('price')
    expect(both[0]?.label).toBe('1,000 - 15,000 ج.م')
    expect(both[0]?.patch).toEqual({ minPrice: undefined, maxPrice: undefined })

    // Min only
    const minOnly = buildActiveChips(
      { ...DEFAULT_LISTING_FILTERS, minPrice: 2000 },
      { t: mockT },
    )
    expect(minOnly[0]?.label).toBe('من 2,000 ج.م')

    // Max only
    const maxOnly = buildActiveChips(
      { ...DEFAULT_LISTING_FILTERS, maxPrice: 8500 },
      { t: mockT },
    )
    expect(maxOnly[0]?.label).toBe('حتى 8,500 ج.م')
  })

  it('builds availability chips with translated labels', () => {
    const filters: ListingFilters = {
      ...DEFAULT_LISTING_FILTERS,
      availability: ['in_stock', 'low'],
    }
    const chips = buildActiveChips(filters, { t: mockT })

    expect(chips).toHaveLength(2)
    expect(chips[0]).toEqual({
      id: 'availability:in_stock',
      label: 'متوفر',
      patch: { availability: ['low'] },
    })
    expect(chips[1]).toEqual({
      id: 'availability:low',
      label: 'كمية محدودة',
      patch: { availability: ['in_stock'] },
    })
  })

  it('builds discounted only chip', () => {
    const filters: ListingFilters = { ...DEFAULT_LISTING_FILTERS, discounted: true }
    const chips = buildActiveChips(filters, { t: mockT })

    expect(chips).toHaveLength(1)
    expect(chips[0]).toEqual({
      id: 'discounted',
      label: 'عليه خصم فقط',
      patch: { discounted: false },
    })
  })

  it('builds choice spec chips and removes one value at a time', () => {
    const filters: ListingFilters = {
      ...DEFAULT_LISTING_FILTERS,
      specs: {
        color: { type: 'choice', values: ['silver', 'black'] },
      },
    }
    const chips = buildActiveChips(filters, { fields: mockFields, t: mockT })

    expect(chips).toHaveLength(2)
    expect(chips[0]?.id).toBe('spec:color:silver')
    expect(chips[0]?.label).toBe('اللون: silver')
    expect(chips[0]?.patch).toEqual({
      specs: { color: { type: 'choice', values: ['black'] } },
    })

    // When last value is removed, the key is removed
    const singleValFilters: ListingFilters = {
      ...DEFAULT_LISTING_FILTERS,
      specs: {
        color: { type: 'choice', values: ['black'] },
      },
    }
    const singleChips = buildActiveChips(singleValFilters, { fields: mockFields, t: mockT })
    expect(singleChips[0]?.patch).toEqual({ specs: {} })
  })

  it('builds boolean spec chip', () => {
    const filters: ListingFilters = {
      ...DEFAULT_LISTING_FILTERS,
      specs: {
        inverter: { type: 'boolean', value: true },
      },
    }
    const chips = buildActiveChips(filters, { fields: mockFields, t: mockT })

    expect(chips).toHaveLength(1)
    expect(chips[0]).toEqual({
      id: 'spec:inverter',
      label: 'انفرتر',
      patch: { specs: {} },
    })
  })

  it('builds number spec range chip with unit and removes spec on patch', () => {
    const filters: ListingFilters = {
      ...DEFAULT_LISTING_FILTERS,
      specs: {
        capacity: { type: 'number', min: 400, max: 550 },
      },
    }
    const chips = buildActiveChips(filters, { fields: mockFields, t: mockT })

    expect(chips).toHaveLength(1)
    expect(chips[0]?.id).toBe('spec:capacity')
    expect(chips[0]?.label).toBe('السعة: 400 - 550 لتر')
    expect(chips[0]?.patch).toEqual({ specs: {} })
  })
})
