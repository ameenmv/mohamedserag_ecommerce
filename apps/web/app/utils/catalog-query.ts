import type {
  CatalogAvailabilityFilter,
  CatalogSort,
  SpecTemplateField,
} from '@serag/shared'
import {
  CATALOG_AVAILABILITY_FILTERS,
  CATALOG_SORTS,
  PRICE_FILTER_MAX_EGP,
} from '@serag/shared'

export interface NumberRangeSpec {
  min?: number
  max?: number
}

export type SpecFilterValue =
  | { type: 'choice'; values: string[] }
  | { type: 'boolean'; value: boolean }
  | { type: 'number'; min?: number; max?: number }
  | { type: 'text'; values: string[] }

export interface ListingFilters {
  brands: string[]
  minPrice?: number
  maxPrice?: number
  availability: CatalogAvailabilityFilter[]
  discounted: boolean
  specs: Record<string, SpecFilterValue>
  sort?: CatalogSort
  page: number
  q?: string
}

export const DEFAULT_LISTING_FILTERS: Readonly<ListingFilters> = {
  brands: [],
  minPrice: undefined,
  maxPrice: undefined,
  availability: [],
  discounted: false,
  specs: {},
  sort: undefined,
  page: 1,
  q: undefined,
}

function getQueryString(val: unknown): string | undefined {
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
    return val[0].trim()
  }
  return undefined
}

function getQueryStringList(val: unknown): string[] {
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  if (Array.isArray(val)) {
    return val
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  return []
}

function parseNumberRange(str: string): { min?: number; max?: number } | undefined {
  if (str.includes('..')) {
    const [minStr, maxStr] = str.split('..')
    const minNum = minStr && minStr.trim().length > 0 ? Number(minStr.trim()) : undefined
    const maxNum = maxStr && maxStr.trim().length > 0 ? Number(maxStr.trim()) : undefined
    const min = minNum !== undefined && !Number.isNaN(minNum) ? minNum : undefined
    const max = maxNum !== undefined && !Number.isNaN(maxNum) ? maxNum : undefined
    if (min !== undefined || max !== undefined) {
      return { min, max }
    }
    return undefined
  }
  const num = Number(str.trim())
  if (!Number.isNaN(num)) {
    return { min: num, max: num }
  }
  return undefined
}

/**
 * Pure function parsing route query parameters into typed ListingFilters.
 * Invalid values and unrecognized filters are gracefully dropped.
 */
export function parseListingQuery(
  routeQuery: Record<string, unknown>,
  fields?: readonly SpecTemplateField[] | SpecTemplateField[],
): ListingFilters {
  // Brands
  const brands = getQueryStringList(routeQuery.brand ?? routeQuery.brands)

  // Prices in EGP (non-negative integers)
  const minPriceStr = getQueryString(routeQuery.minPrice)
  const minPrice =
    minPriceStr && /^\d+$/.test(minPriceStr) ? Math.min(parseInt(minPriceStr, 10), PRICE_FILTER_MAX_EGP) : undefined

  const maxPriceStr = getQueryString(routeQuery.maxPrice)
  const maxPrice =
    maxPriceStr && /^\d+$/.test(maxPriceStr) ? Math.min(parseInt(maxPriceStr, 10), PRICE_FILTER_MAX_EGP) : undefined

  // Availability
  const rawAvailability = getQueryStringList(routeQuery.availability)
  const availability = rawAvailability.filter((a): a is CatalogAvailabilityFilter =>
    (CATALOG_AVAILABILITY_FILTERS as readonly string[]).includes(a),
  )

  // Discounted
  const discounted = getQueryString(routeQuery.discounted) === 'true'

  // Sort
  const rawSort = getQueryString(routeQuery.sort)
  const sort: CatalogSort | undefined =
    rawSort && (CATALOG_SORTS as readonly string[]).includes(rawSort)
      ? (rawSort as CatalogSort)
      : undefined

  // Page (starts at 1)
  const rawPage = getQueryString(routeQuery.page)
  let page = 1
  if (rawPage && /^\d+$/.test(rawPage)) {
    const parsedPage = parseInt(rawPage, 10)
    if (parsedPage >= 1) {
      page = parsedPage
    }
  }

  // Search query q
  const rawQ = getQueryString(routeQuery.q)
  const q = rawQ && rawQ.length > 0 ? rawQ : undefined

  // Spec fields
  const specs: Record<string, SpecFilterValue> = {}
  const filterableMap = new Map<string, SpecTemplateField>()
  if (fields && fields.length > 0) {
    for (const f of fields) {
      if (f.filterable !== false) {
        filterableMap.set(f.key, f)
      }
    }
  }

  for (const [rawKey, rawVal] of Object.entries(routeQuery)) {
    if (!rawKey.startsWith('spec.')) continue
    const specKey = rawKey.slice(5).trim()
    if (!specKey) continue
    const strVal = getQueryString(rawVal)
    if (!strVal) continue

    const fieldDef = filterableMap.get(specKey)
    if (fields && fields.length > 0 && !fieldDef) {
      // If fields were specified, ignore non-filterable / unknown specs
      continue
    }

    const fieldType = fieldDef ? fieldDef.type : undefined

    if (fieldType === 'boolean') {
      if (strVal === 'true') {
        specs[specKey] = { type: 'boolean', value: true }
      }
    } else if (fieldType === 'number') {
      const range = parseNumberRange(strVal)
      if (range) {
        specs[specKey] = { type: 'number', ...range }
      }
    } else if (fieldType === 'choice' || fieldType === 'text') {
      const values = strVal
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      const allowed =
        fieldDef?.options && fieldDef.options.length > 0
          ? values.filter((v) => fieldDef.options!.includes(v))
          : values
      if (allowed.length > 0) {
        specs[specKey] = { type: 'choice', values: allowed }
      }
    } else {
      // Untyped / no fields definition: infer from value
      if (strVal === 'true') {
        specs[specKey] = { type: 'boolean', value: true }
      } else if (strVal.includes('..')) {
        const range = parseNumberRange(strVal)
        if (range) {
          specs[specKey] = { type: 'number', ...range }
        }
      } else {
        const values = strVal
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
        if (values.length > 0) {
          specs[specKey] = { type: 'choice', values }
        }
      }
    }
  }

  return {
    brands,
    minPrice,
    maxPrice,
    availability,
    discounted,
    specs,
    sort,
    page,
    q,
  }
}

/**
 * Pure function converting ListingFilters into a clean, canonical URL route query object.
 * Omits defaults and empty values, and produces a stable alphabetical key order.
 */
export function toRouteQuery(filters: ListingFilters): Record<string, string> {
  const query: Record<string, string> = {}

  if (filters.q && filters.q.trim().length > 0) {
    query.q = filters.q.trim()
  }

  if (filters.brands && filters.brands.length > 0) {
    const cleanBrands = filters.brands.map((b) => b.trim()).filter((b) => b.length > 0)
    if (cleanBrands.length > 0) {
      query.brand = cleanBrands.join(',')
    }
  }

  if (filters.minPrice !== undefined && filters.minPrice >= 0) {
    query.minPrice = String(filters.minPrice)
  }

  if (filters.maxPrice !== undefined && filters.maxPrice >= 0) {
    query.maxPrice = String(filters.maxPrice)
  }

  if (filters.availability && filters.availability.length > 0) {
    query.availability = filters.availability.join(',')
  }

  if (filters.discounted) {
    query.discounted = 'true'
  }

  if (filters.specs) {
    for (const [key, spec] of Object.entries(filters.specs)) {
      if (spec.type === 'choice' || spec.type === 'text') {
        const cleanVals = spec.values.map((v) => v.trim()).filter((v) => v.length > 0)
        if (cleanVals.length > 0) {
          query[`spec.${key}`] = cleanVals.join(',')
        }
      } else if (spec.type === 'boolean') {
        if (spec.value) {
          query[`spec.${key}`] = 'true'
        }
      } else if (spec.type === 'number') {
        if (spec.min !== undefined || spec.max !== undefined) {
          const minPart = spec.min !== undefined ? String(spec.min) : ''
          const maxPart = spec.max !== undefined ? String(spec.max) : ''
          query[`spec.${key}`] = `${minPart}..${maxPart}`
        }
      }
    }
  }

  const defaultSort: CatalogSort =
    filters.q && filters.q.trim().length > 0 ? 'relevance' : 'popular'
  if (filters.sort && filters.sort !== defaultSort) {
    query.sort = filters.sort
  }

  if (filters.page && filters.page > 1) {
    query.page = String(filters.page)
  }

  // Stable deterministic key order
  const sortedKeys = Object.keys(query).sort()
  const result: Record<string, string> = {}
  for (const k of sortedKeys) {
    result[k] = query[k]!
  }
  return result
}

/**
 * Pure function converting ListingFilters into the backend API query format accepted by GET /api/products.
 */
export function toApiQuery(
  filters: ListingFilters,
  base?: { category?: string; brand?: string },
): Record<string, unknown> {
  const query: Record<string, unknown> = {
    page: filters.page > 1 ? filters.page : 1,
    pageSize: 24,
  }

  if (base?.category) {
    query.category = base.category
  }

  if (base?.brand) {
    query.brand = base.brand
  } else if (filters.brands && filters.brands.length > 0) {
    query.brand = filters.brands.join(',')
  }

  if (filters.minPrice !== undefined && filters.minPrice >= 0) {
    query.minPrice = filters.minPrice
  }

  if (filters.maxPrice !== undefined && filters.maxPrice >= 0) {
    query.maxPrice = filters.maxPrice
  }

  if (filters.availability && filters.availability.length > 0) {
    query.availability = filters.availability.join(',')
  }

  if (filters.discounted) {
    query.discounted = true
  }

  if (filters.sort) {
    query.sort = filters.sort
  }

  if (filters.q && filters.q.trim().length > 0) {
    query.q = filters.q.trim()
  }

  if (filters.specs) {
    for (const [key, spec] of Object.entries(filters.specs)) {
      if (spec.type === 'choice' || spec.type === 'text') {
        const cleanVals = spec.values.map((v) => v.trim()).filter((v) => v.length > 0)
        if (cleanVals.length > 0) {
          query[`spec.${key}`] = cleanVals.join(',')
        }
      } else if (spec.type === 'boolean') {
        if (spec.value) {
          query[`spec.${key}`] = 'true'
        }
      } else if (spec.type === 'number') {
        if (spec.min !== undefined || spec.max !== undefined) {
          const minPart = spec.min !== undefined ? String(spec.min) : ''
          const maxPart = spec.max !== undefined ? String(spec.max) : ''
          query[`spec.${key}`] = `${minPart}..${maxPart}`
        }
      }
    }
  }

  return query
}

/**
 * Updates listing filters with a patch.
 * When any filter other than page changes, page resets to 1.
 */
export function patchListingFilters(
  current: ListingFilters,
  patch: Partial<ListingFilters>,
): ListingFilters {
  const next: ListingFilters = {
    ...current,
    ...patch,
  }

  if (patch.page === undefined) {
    next.page = 1
  }

  return next
}

/**
 * Returns a new specs record with the given key set to value, or omitted if value is undefined.
 * Uses object destructuring rest to avoid the delete operator (no-dynamic-delete).
 */
export function withSpec(
  specs: Record<string, SpecFilterValue>,
  key: string,
  value: SpecFilterValue | undefined,
): Record<string, SpecFilterValue> {
  if (value === undefined) {
    const { [key]: _omitted, ...rest } = specs
    return rest
  }
  return {
    ...specs,
    [key]: value,
  }
}

/**
 * Toggles an option in a choice or text spec field while preserving its original type.
 * If the resulting values array is empty, the spec key is removed.
 */
export function toggleSpecChoice(
  specs: Record<string, SpecFilterValue>,
  key: string,
  option: string,
): Record<string, SpecFilterValue> {
  const current = specs[key]
  const targetType: 'choice' | 'text' =
    current && (current.type === 'choice' || current.type === 'text') ? current.type : 'choice'
  const existingValues =
    current && (current.type === 'choice' || current.type === 'text') ? current.values : []

  const nextValues = existingValues.includes(option)
    ? existingValues.filter((v) => v !== option)
    : [...existingValues, option]

  if (nextValues.length > 0) {
    return withSpec(specs, key, { type: targetType, values: nextValues })
  }
  return withSpec(specs, key, undefined)
}

/**
 * Toggles a boolean spec filter between true and undefined (removed).
 */
export function toggleSpecBoolean(
  specs: Record<string, SpecFilterValue>,
  key: string,
): Record<string, SpecFilterValue> {
  const current = specs[key]
  const isSelected = current?.type === 'boolean' && current.value === true
  if (isSelected) {
    return withSpec(specs, key, undefined)
  }
  return withSpec(specs, key, { type: 'boolean', value: true })
}

/**
 * Sets min and max values for a number spec filter.
 * If both min and max are undefined, the key is removed.
 */
export function setSpecRange(
  specs: Record<string, SpecFilterValue>,
  key: string,
  min: number | undefined,
  max: number | undefined,
): Record<string, SpecFilterValue> {
  if (min !== undefined || max !== undefined) {
    return withSpec(specs, key, { type: 'number', min, max })
  }
  return withSpec(specs, key, undefined)
}
