import { describe, expect, it } from 'vitest'
import type { SpecTemplateField } from '@serag/shared'
import {
  DEFAULT_LISTING_FILTERS,
  parseListingQuery,
  patchListingFilters,
  setSpecRange,
  toApiQuery,
  toRouteQuery,
  toggleSpecBoolean,
  toggleSpecChoice,
  withSpec,
  type ListingFilters,
} from '../app/utils/catalog-query'

const testCategoryFields: SpecTemplateField[] = [
  {
    key: 'capacity',
    label: 'السعة',
    type: 'number',
    unit: 'لتر',
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
    key: 'color',
    label: 'اللون',
    type: 'choice',
    options: ['silver', 'black', 'white'],
    filterable: true,
    comparable: true,
  },
  {
    key: 'internal_code',
    label: 'كود داخلي',
    type: 'text',
    filterable: false,
    comparable: false,
  },
]

describe('catalog-query: parseListingQuery, toRouteQuery, toApiQuery', () => {
  it('omits defaults and empties in toRouteQuery', () => {
    const routeQuery = toRouteQuery(DEFAULT_LISTING_FILTERS)
    expect(routeQuery).toEqual({})

    const withPopular = toRouteQuery({
      ...DEFAULT_LISTING_FILTERS,
      page: 1,
      discounted: false,
      sort: 'popular',
    })
    expect(withPopular).toEqual({})

    const withRelevanceOnSearch = toRouteQuery({
      ...DEFAULT_LISTING_FILTERS,
      q: 'fridge',
      sort: 'relevance',
    })
    expect(withRelevanceOnSearch).toEqual({ q: 'fridge' })
  })

  it('performs a clean round trip of filters', () => {
    const input: Record<string, string> = {
      availability: 'in_stock,low',
      brand: 'lg,samsung',
      discounted: 'true',
      maxPrice: '30000',
      minPrice: '5000',
      page: '3',
      q: 'smart',
      sort: 'price_asc',
      'spec.color': 'silver,black',
      'spec.inverter': 'true',
    }

    const parsed = parseListingQuery(input, testCategoryFields)
    expect(parsed.brands).toEqual(['lg', 'samsung'])
    expect(parsed.minPrice).toBe(5000)
    expect(parsed.maxPrice).toBe(30000)
    expect(parsed.availability).toEqual(['in_stock', 'low'])
    expect(parsed.discounted).toBe(true)
    expect(parsed.sort).toBe('price_asc')
    expect(parsed.page).toBe(3)
    expect(parsed.q).toBe('smart')
    expect(parsed.specs.color).toEqual({ type: 'choice', values: ['silver', 'black'] })
    expect(parsed.specs.inverter).toEqual({ type: 'boolean', value: true })

    const serialized = toRouteQuery(parsed)
    expect(serialized).toEqual(input)
  })

  it('ignores garbage and invalid values gracefully without throwing', () => {
    const garbage: Record<string, unknown> = {
      brand: '  ',
      minPrice: 'not-a-number',
      maxPrice: '-100',
      availability: 'invalid_state,in_stock,another_bad',
      discounted: 'yes', // must be exactly 'true'
      sort: 'unsupported_sort',
      page: '-5',
      q: '   ',
      'spec.capacity': 'abc..xyz',
      'spec.inverter': 'maybe',
      'spec.internal_code': 'secret', // non-filterable
      'spec.unknown': 'something',
    }

    const parsed = parseListingQuery(garbage, testCategoryFields)

    expect(parsed.brands).toEqual([])
    expect(parsed.minPrice).toBeUndefined()
    expect(parsed.maxPrice).toBeUndefined()
    expect(parsed.availability).toEqual(['in_stock'])
    expect(parsed.discounted).toBe(false)
    expect(parsed.sort).toBeUndefined()
    expect(parsed.page).toBe(1)
    expect(parsed.q).toBeUndefined()
    expect(parsed.specs).toEqual({})
  })

  it('handles number spec ranges: 400.., ..500, and 400..500', () => {
    // 1. Min only: 400..
    const queryMin = { 'spec.capacity': '400..' }
    const parsedMin = parseListingQuery(queryMin, testCategoryFields)
    expect(parsedMin.specs.capacity).toEqual({ type: 'number', min: 400, max: undefined })
    expect(toRouteQuery(parsedMin)).toEqual({ 'spec.capacity': '400..' })

    // 2. Max only: ..500
    const queryMax = { 'spec.capacity': '..500' }
    const parsedMax = parseListingQuery(queryMax, testCategoryFields)
    expect(parsedMax.specs.capacity).toEqual({ type: 'number', min: undefined, max: 500 })
    expect(toRouteQuery(parsedMax)).toEqual({ 'spec.capacity': '..500' })

    // 3. Both: 400..500
    const queryBoth = { 'spec.capacity': '400..500' }
    const parsedBoth = parseListingQuery(queryBoth, testCategoryFields)
    expect(parsedBoth.specs.capacity).toEqual({ type: 'number', min: 400, max: 500 })
    expect(toRouteQuery(parsedBoth)).toEqual({ 'spec.capacity': '400..500' })
  })

  it('handles boolean spec filters', () => {
    const query = { 'spec.inverter': 'true' }
    const parsed = parseListingQuery(query, testCategoryFields)
    expect(parsed.specs.inverter).toEqual({ type: 'boolean', value: true })
    expect(toRouteQuery(parsed)).toEqual({ 'spec.inverter': 'true' })
    const apiQuery = toApiQuery(parsed)
    expect(apiQuery['spec.inverter']).toBe('true')
  })

  it('resets page to 1 when changing any filter, but keeps explicit page patches', () => {
    const current: ListingFilters = {
      ...DEFAULT_LISTING_FILTERS,
      page: 5,
      brands: ['samsung'],
    }

    // Changing brands resets page to 1
    const patchedBrand = patchListingFilters(current, { brands: ['lg'] })
    expect(patchedBrand.page).toBe(1)
    expect(patchedBrand.brands).toEqual(['lg'])

    // Changing minPrice resets page to 1
    const patchedPrice = patchListingFilters(current, { minPrice: 2000 })
    expect(patchedPrice.page).toBe(1)
    expect(patchedPrice.minPrice).toBe(2000)

    // Explicitly patching page preserves the new page
    const patchedPage = patchListingFilters(current, { page: 3 })
    expect(patchedPage.page).toBe(3)
    expect(patchedPage.brands).toEqual(['samsung'])
  })

  it('formats toApiQuery correctly with base overrides', () => {
    const filters: ListingFilters = {
      brands: ['lg', 'samsung'],
      minPrice: 1000,
      maxPrice: 10000,
      availability: ['in_stock'],
      discounted: true,
      specs: {
        capacity: { type: 'number', min: 300, max: 450 },
        inverter: { type: 'boolean', value: true },
        color: { type: 'choice', values: ['silver'] },
      },
      sort: 'price_asc',
      page: 2,
      q: 'led',
    }

    // With base category and brand overrides
    const apiQuery = toApiQuery(filters, { category: 'fridges', brand: 'toshiba' })
    expect(apiQuery).toEqual({
      category: 'fridges',
      brand: 'toshiba', // base brand overrides filters.brands
      minPrice: 1000,
      maxPrice: 10000,
      availability: 'in_stock',
      discounted: true,
      sort: 'price_asc',
      page: 2,
      pageSize: 24,
      q: 'led',
      'spec.capacity': '300..450',
      'spec.inverter': 'true',
      'spec.color': 'silver',
    })
  })

  describe('pure spec-filter mutation helpers', () => {
    it('withSpec sets a value or removes the key using rest destructuring', () => {
      const initial = {
        inverter: { type: 'boolean' as const, value: true },
        color: { type: 'choice' as const, values: ['silver'] },
      }

      // Add or update key
      const updated = withSpec(initial, 'capacity', { type: 'number', min: 300, max: 500 })
      expect(updated.capacity).toEqual({ type: 'number', min: 300, max: 500 })
      expect(updated.inverter).toEqual({ type: 'boolean', value: true })

      // Remove key by passing undefined
      const removed = withSpec(updated, 'inverter', undefined)
      expect(removed.inverter).toBeUndefined()
      expect('inverter' in removed).toBe(false)
      expect(removed.color).toEqual({ type: 'choice', values: ['silver'] })
      expect(removed.capacity).toEqual({ type: 'number', min: 300, max: 500 })
    })

    it('toggleSpecChoice adds or removes an option and preserves original field type', () => {
      // Choice type
      const emptySpecs = {}
      const step1 = toggleSpecChoice(emptySpecs, 'color', 'silver')
      expect(step1.color).toEqual({ type: 'choice', values: ['silver'] })

      const step2 = toggleSpecChoice(step1, 'color', 'black')
      expect(step2.color).toEqual({ type: 'choice', values: ['silver', 'black'] })

      const step3 = toggleSpecChoice(step2, 'color', 'silver')
      expect(step3.color).toEqual({ type: 'choice', values: ['black'] })

      const step4 = toggleSpecChoice(step3, 'color', 'black')
      expect(step4.color).toBeUndefined()
      expect('color' in step4).toBe(false)

      // Text type preservation
      const textSpecs = { note: { type: 'text' as const, values: ['option1'] } }
      const textAdded = toggleSpecChoice(textSpecs, 'note', 'option2')
      expect(textAdded.note).toEqual({ type: 'text', values: ['option1', 'option2'] })
    })

    it('toggleSpecBoolean toggles boolean spec value and removes when untoggled', () => {
      const emptySpecs = {}
      const toggledOn = toggleSpecBoolean(emptySpecs, 'inverter')
      expect(toggledOn.inverter).toEqual({ type: 'boolean', value: true })

      const toggledOff = toggleSpecBoolean(toggledOn, 'inverter')
      expect(toggledOff.inverter).toBeUndefined()
      expect('inverter' in toggledOff).toBe(false)
    })

    it('setSpecRange sets number range and removes when both are undefined', () => {
      const emptySpecs = {}
      const withRange = setSpecRange(emptySpecs, 'capacity', 350, 500)
      expect(withRange.capacity).toEqual({ type: 'number', min: 350, max: 500 })

      const minOnly = setSpecRange(withRange, 'capacity', 400, undefined)
      expect(minOnly.capacity).toEqual({ type: 'number', min: 400, max: undefined })

      const cleared = setSpecRange(minOnly, 'capacity', undefined, undefined)
      expect(cleared.capacity).toBeUndefined()
      expect('capacity' in cleared).toBe(false)
    })
  })
})
