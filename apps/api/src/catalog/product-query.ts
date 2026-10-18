import {
  applyFlashToPrice,
  deriveAvailability,
  type AvailabilityMode,
  type AvailabilityState,
  type CatalogSort,
  type ProductCard,
  type ProductFlash,
  type SpecTemplateField,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'

export type ParsedSpecFilter =
  | { key: string; type: 'choice'; values: string[] }
  | { key: string; type: 'boolean'; values: boolean[] }
  | { key: string; type: 'number'; min?: number; max?: number }
  | { key: string; type: 'text'; value: string }

/**
 * Parses spec filter parameters from a raw query object against a category's spec template fields.
 *
 * Rules:
 * - Only keys that the category's template marks `filterable` are honoured.
 * - Unknown or non-filterable keys are ignored without error.
 * - Choice and boolean fields support comma-separated values (`spec.<key>=v1,v2`).
 * - Number fields support range expressions (`spec.<key>=min..max`, `min..`, `..max`, or single number).
 */
export function parseSpecFilters(
  rawQuery: Record<string, unknown>,
  templateFields: readonly SpecTemplateField[],
): ParsedSpecFilter[] {
  const filterableMap = new Map<string, SpecTemplateField>()
  for (const field of templateFields) {
    if (field.filterable) {
      filterableMap.set(field.key, field)
    }
  }

  if (filterableMap.size === 0) {
    return []
  }

  // Extract all query values matching `spec.<key>` or nested `spec[<key>]`
  const rawValues = new Map<string, string>()

  for (const [rawKey, rawVal] of Object.entries(rawQuery)) {
    if (rawKey.startsWith('spec.') && typeof rawVal === 'string') {
      const key = rawKey.slice(5).trim()
      if (key.length > 0 && rawVal.trim().length > 0) {
        rawValues.set(key, rawVal.trim())
      }
    } else if (rawKey === 'spec' && typeof rawVal === 'object' && rawVal !== null) {
      for (const [nestedKey, nestedVal] of Object.entries(rawVal as Record<string, unknown>)) {
        if (typeof nestedVal === 'string' && nestedVal.trim().length > 0) {
          rawValues.set(nestedKey.trim(), nestedVal.trim())
        }
      }
    }
  }

  const result: ParsedSpecFilter[] = []

  for (const [key, rawVal] of rawValues.entries()) {
    const fieldDef = filterableMap.get(key)
    if (!fieldDef) {
      // Ignore unknown or non-filterable spec keys
      continue
    }

    if (fieldDef.type === 'choice') {
      const values = rawVal
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      if (values.length > 0) {
        result.push({ key, type: 'choice', values })
      }
    } else if (fieldDef.type === 'boolean') {
      const parts = rawVal.split(',').map((s) => s.trim().toLowerCase())
      const bools: boolean[] = []
      for (const p of parts) {
        if (p === 'true' || p === '1' || p === 'yes') {
          bools.push(true)
        } else if (p === 'false' || p === '0' || p === 'no') {
          bools.push(false)
        }
      }
      if (bools.length > 0) {
        result.push({ key, type: 'boolean', values: Array.from(new Set(bools)) })
      }
    } else if (fieldDef.type === 'number') {
      if (rawVal.includes('..')) {
        const [minStr, maxStr] = rawVal.split('..')
        const minNum = minStr && minStr.trim().length > 0 ? Number(minStr.trim()) : undefined
        const maxNum = maxStr && maxStr.trim().length > 0 ? Number(maxStr.trim()) : undefined
        const min = minNum !== undefined && !Number.isNaN(minNum) ? minNum : undefined
        const max = maxNum !== undefined && !Number.isNaN(maxNum) ? maxNum : undefined
        if (min !== undefined || max !== undefined) {
          result.push({ key, type: 'number', min, max })
        }
      } else {
        const num = Number(rawVal.trim())
        if (!Number.isNaN(num)) {
          result.push({ key, type: 'number', min: num, max: num })
        }
      }
    } else if (fieldDef.type === 'text') {
      result.push({ key, type: 'text', value: rawVal })
    }
  }

  return result
}

/**
 * Converts parsed spec filters into parameterized Prisma.Sql WHERE fragments.
 */
export function buildSpecFilterSqlConditions(filters: readonly ParsedSpecFilter[]): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = []

  for (const f of filters) {
    if (f.type === 'choice') {
      const valueParams = f.values.map((v) => Prisma.sql`${v}`)
      conditions.push(Prisma.sql`p.specs->>${f.key} IN (${Prisma.join(valueParams, ', ')})`)
    } else if (f.type === 'boolean') {
      const stringValues = f.values.map((b) => (b ? 'true' : 'false'))
      const valueParams = stringValues.map((v) => Prisma.sql`${v}`)
      conditions.push(Prisma.sql`p.specs->>${f.key} IN (${Prisma.join(valueParams, ', ')})`)
    } else if (f.type === 'number') {
      const numExpr = Prisma.sql`CASE WHEN (p.specs->>${f.key}) ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (p.specs->>${f.key})::numeric ELSE NULL END`
      if (f.min !== undefined && f.max !== undefined) {
        conditions.push(Prisma.sql`(${numExpr} >= ${f.min} AND ${numExpr} <= ${f.max})`)
      } else if (f.min !== undefined) {
        conditions.push(Prisma.sql`${numExpr} >= ${f.min}`)
      } else if (f.max !== undefined) {
        conditions.push(Prisma.sql`${numExpr} <= ${f.max}`)
      }
    } else if (f.type === 'text') {
      conditions.push(Prisma.sql`p.specs->>${f.key} = ${f.value}`)
    }
  }

  return conditions
}

/**
 * Escapes characters with special meaning in LIKE / ILIKE patterns (% and _ and \).
 */
export function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}

/**
 * Builds the parameterized SQL WHERE fragment for search matching (PRD US-2.1).
 *
 * A product matches if:
 * - EVERY term group has at least one alternative with `p.search_text ILIKE '%alt%'`
 * - OR `word_similarity(${normalizedQuery}, p.search_text) >= 0.35` for typo tolerance.
 */
export function searchMatchSql(
  terms: readonly (readonly string[])[],
  normalizedQuery: string,
): Prisma.Sql {
  if (terms.length === 0) {
    if (normalizedQuery.length >= 2) {
      return Prisma.sql`word_similarity(${normalizedQuery}, p.search_text) >= 0.35`
    }
    return Prisma.sql`1 = 0`
  }

  const groupConditions: Prisma.Sql[] = []

  for (const group of terms) {
    const altConditions: Prisma.Sql[] = []
    for (const alt of group) {
      if (alt.length === 0) continue
      const pattern = `%${escapeLikePattern(alt)}%`
      altConditions.push(Prisma.sql`p.search_text ILIKE ${pattern}`)
    }
    if (altConditions.length > 0) {
      groupConditions.push(Prisma.sql`(${Prisma.join(altConditions, ' OR ')})`)
    }
  }

  const allTermsCondition =
    groupConditions.length > 0 ? Prisma.sql`(${Prisma.join(groupConditions, ' AND ')})` : Prisma.sql`1 = 0`

  if (normalizedQuery.length >= 2) {
    return Prisma.sql`(${allTermsCondition} OR word_similarity(${normalizedQuery}, p.search_text) >= 0.35)`
  }

  return allTermsCondition
}

/**
 * Builds the parameterized SQL ORDER BY fragment for search relevance ranking (PRD US-2.1).
 *
 * Ranking order:
 * 1. Exact model code match (lower(p.model_code) = normalizedQuery)
 * 2. Model code prefix match (lower(p.model_code) LIKE normalizedQuery%)
 * 3. word_similarity(normalizedQuery, p.search_text) DESC
 * 4. Popularity (units sold in last 90 days DESC)
 * 5. Newest (p.created_at DESC)
 */
export function searchRankSql(normalizedQuery: string): Prisma.Sql {
  const prefixPattern = `${escapeLikePattern(normalizedQuery)}%`
  return Prisma.sql`
    CASE WHEN lower(p.model_code) = ${normalizedQuery} THEN 0 ELSE 1 END ASC,
    CASE WHEN lower(p.model_code) LIKE ${prefixPattern} THEN 0 ELSE 1 END ASC,
    word_similarity(${normalizedQuery}, p.search_text) DESC,
    COALESCE(pop.units_sold, 0) DESC,
    p.created_at DESC
  `
}

/**
 * Maps a catalog sort option to a parameterized Prisma.Sql ORDER BY fragment.
 */
export function mapSortToOrderBy(sort: CatalogSort, normalizedQuery?: string): Prisma.Sql {
  switch (sort) {
    case 'relevance':
      return normalizedQuery && normalizedQuery.length > 0
        ? searchRankSql(normalizedQuery)
        : Prisma.sql`COALESCE(pop.units_sold, 0) DESC, p.created_at DESC`
    case 'popular':
      return Prisma.sql`COALESCE(pop.units_sold, 0) DESC, p.created_at DESC`
    case 'price_asc':
      return Prisma.sql`p.price ASC, p.created_at DESC`
    case 'price_desc':
      return Prisma.sql`p.price DESC, p.created_at DESC`
    case 'discount':
      return Prisma.sql`CASE WHEN p.old_price IS NOT NULL AND p.old_price > p.price THEN ((p.old_price - p.price)::float / p.old_price) ELSE 0 END DESC, p.created_at DESC`
    case 'newest':
      return Prisma.sql`p.created_at DESC`
  }
}

/**
 * Parameterized SQL fragment joining order unit sales (PRD US-2.2).
 * Sums `order_items.qty` for orders currently `delivered` whose `delivered`
 * status OrderEvent occurred in the last 90 days.
 */
export function popularityJoinSql(): Prisma.Sql {
  return Prisma.sql`
    LEFT JOIN (
      SELECT
        oi.product_id,
        COALESCE(SUM(oi.qty), 0)::int AS units_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'delivered'
        AND EXISTS (
          SELECT 1 FROM order_events oe
          WHERE oe.order_id = o.id
            AND oe.status = 'delivered'
            AND oe.at >= NOW() - INTERVAL '90 days'
        )
      GROUP BY oi.product_id
    ) pop ON pop.product_id = p.id
  `
}

const VALID_AVAILABILITY_STATES = new Set<AvailabilityState>(['in_stock', 'low', 'on_request', 'out'])

/**
 * Parses a comma-separated availability query string into validated AvailabilityState values.
 */
export function parseAvailabilityFilter(raw?: string): AvailabilityState[] {
  if (!raw || typeof raw !== 'string') return []
  const parts = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => VALID_AVAILABILITY_STATES.has(s as AvailabilityState))
  return Array.from(new Set(parts)) as AvailabilityState[]
}

/**
 * Builds the parameterized SQL fragment for availability filtering matching `deriveAvailability`.
 */
export function buildAvailabilitySqlCondition(states: readonly AvailabilityState[]): Prisma.Sql | null {
  if (states.length === 0) return null

  const stateClauses: Prisma.Sql[] = []

  for (const st of states) {
    switch (st) {
      case 'out':
        stateClauses.push(
          Prisma.sql`(p.availability_mode = 'out' OR (p.availability_mode = 'auto' AND p.stock <= 0))`,
        )
        break
      case 'on_request':
        stateClauses.push(Prisma.sql`p.availability_mode = 'on_request'`)
        break
      case 'low':
        stateClauses.push(
          Prisma.sql`(p.availability_mode = 'auto' AND p.stock > 0 AND p.stock <= p.low_stock_threshold)`,
        )
        break
      case 'in_stock':
        stateClauses.push(
          Prisma.sql`(p.availability_mode = 'auto' AND p.stock > p.low_stock_threshold)`,
        )
        break
    }
  }

  if (stateClauses.length === 0) return null
  return Prisma.sql`(${Prisma.join(stateClauses, ' OR ')})`
}

export interface RawProductEntity {
  id: string
  slug: string
  name: string
  modelCode: string
  price: number
  oldPrice: number | null
  stock: number
  lowStockThreshold: number
  availabilityMode: AvailabilityMode
  leadTimeText: string | null
  brand: {
    slug: string
    name: string
  }
  category: {
    slug: string
    name: string
  }
  images: Array<{
    url: string
    alt: string
    isReal: boolean
  }>
}

/**
 * Pure mapping from a database Product entity to the public `ProductCard` contract.
 */
export function toProductCard(
  product: RawProductEntity,
  flash: ProductFlash | null = null,
): ProductCard {
  const pricing = applyFlashToPrice(
    { price: product.price, oldPrice: product.oldPrice },
    flash,
  )

  const firstImg = product.images[0]
  const image = firstImg
    ? {
        url: firstImg.url,
        alt: firstImg.alt,
        isReal: firstImg.isReal,
      }
    : null

  const derived = deriveAvailability({
    mode: product.availabilityMode,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
  })

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    modelCode: product.modelCode,
    brand: {
      slug: product.brand.slug,
      name: product.brand.name,
    },
    category: {
      slug: product.category.slug,
      name: product.category.name,
    },
    price: pricing.price,
    oldPrice: pricing.oldPrice,
    discountPercent: pricing.discountPercent,
    image,
    availability: {
      state: derived.state,
      orderable: derived.orderable,
      maxQty: derived.maxQty,
      leadTimeText: product.leadTimeText,
    },
    flash,
  }
}
