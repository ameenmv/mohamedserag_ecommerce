import type { CategoryDetail, ProductDetail, SpecTemplateField } from '@serag/shared'

export interface CompareTableRow {
  key: string
  label: string
  type: 'price' | 'brand' | 'spec' | 'warranty' | 'origin'
  unit?: string | null
  values: (string | number | boolean | null)[]
  different: boolean
}

export interface CompareTableResult {
  rows: CompareTableRow[]
  isMixed: boolean
  hasDifferences: boolean
}

/**
 * Checks whether an array of values has differences.
 * Returns true strictly when not all values are equal.
 */
export function areValuesDifferent(
  values: readonly (string | number | boolean | null)[],
): boolean {
  if (values.length <= 1) {
    return false
  }
  const first = values[0]
  return values.some((val) => val !== first)
}

/**
 * Pure formatter for comparison table cell values.
 * - null or undefined -> '—'
 * - boolean -> yes / no (configurable via options)
 * - number or string with unit -> `${val} ${unit}`
 * - primitive -> String(val)
 */
export function formatCompareValue(
  val: string | number | boolean | null | undefined,
  unit?: string | null,
  options?: { yesLabel?: string; noLabel?: string },
): string {
  if (val === null || val === undefined) {
    return '—'
  }
  if (typeof val === 'boolean') {
    return val ? (options?.yesLabel ?? 'Yes') : (options?.noLabel ?? 'No')
  }
  if (unit) {
    return `${val} ${unit}`
  }
  return String(val)
}

/**
 * Pure builder function for the product comparison table (PRD US-2.3).
 * - Standard rows: price, brand, then comparable specs, warranty, origin.
 * - Same category: union of comparable spec keys across the products' categories.
 * - Mixed categories: only spec rows whose key is present in ALL products.
 * - Marks `different: true` when values across products are not all equal.
 */
export function buildCompareTable(
  products: readonly ProductDetail[],
  categories: readonly CategoryDetail[],
): CompareTableResult {
  if (products.length === 0) {
    return {
      rows: [],
      isMixed: false,
      hasDifferences: false,
    }
  }

  const categorySlugs = new Set(products.map((p) => p.category.slug))
  const isMixed = categorySlugs.size > 1

  const rows: CompareTableRow[] = []

  // 1. Price row
  const priceValues = products.map((p) => p.price)
  rows.push({
    key: 'price',
    label: 'price',
    type: 'price',
    values: priceValues,
    different: areValuesDifferent(priceValues),
  })

  // 2. Brand row
  const brandValues = products.map((p) => p.brand.name)
  rows.push({
    key: 'brand',
    label: 'brand',
    type: 'brand',
    values: brandValues,
    different: areValuesDifferent(brandValues),
  })

  // 3. Comparable spec fields
  const categoryMap = new Map<string, CategoryDetail>()
  for (const cat of categories) {
    categoryMap.set(cat.slug, cat)
  }

  // Union of comparable fields across the products' categories in stable order
  const comparableFieldKeys: string[] = []
  const comparableFieldMeta = new Map<string, SpecTemplateField>()

  for (const product of products) {
    const cat = categoryMap.get(product.category.slug)
    if (cat?.fields) {
      for (const field of cat.fields) {
        if (field.comparable) {
          if (!comparableFieldMeta.has(field.key)) {
            comparableFieldKeys.push(field.key)
            comparableFieldMeta.set(field.key, field)
          }
        }
      }
    }
  }

  // Fallback: If category fields were not found or empty, inspect products' specs
  if (comparableFieldKeys.length === 0) {
    for (const product of products) {
      for (const s of product.specs) {
        if (!comparableFieldMeta.has(s.key)) {
          comparableFieldKeys.push(s.key)
          comparableFieldMeta.set(s.key, {
            key: s.key,
            label: s.label,
            type: s.type,
            unit: s.unit,
            filterable: false,
            comparable: true,
          })
        }
      }
    }
  }

  // If mixed categories: only include spec rows whose key is present in ALL products
  const activeSpecKeys = isMixed
    ? comparableFieldKeys.filter((key) =>
        products.every((p) => p.specs.some((s) => s.key === key)),
      )
    : comparableFieldKeys

  for (const specKey of activeSpecKeys) {
    const meta = comparableFieldMeta.get(specKey)
    let label = meta?.label ?? specKey
    let unit = meta?.unit ?? null

    const values = products.map((p) => {
      const found = p.specs.find((s) => s.key === specKey)
      if (!found) return null
      if (!label && found.label) label = found.label
      if (!unit && found.unit) unit = found.unit
      return found.value
    })

    rows.push({
      key: `spec_${specKey}`,
      label,
      type: 'spec',
      unit,
      values,
      different: areValuesDifferent(values),
    })
  }

  // 4. Warranty row
  const warrantyValues = products.map((p) => p.warranty ?? null)
  rows.push({
    key: 'warranty',
    label: 'warranty',
    type: 'warranty',
    values: warrantyValues,
    different: areValuesDifferent(warrantyValues),
  })

  // 5. Origin row
  const originValues = products.map((p) => p.origin ?? null)
  rows.push({
    key: 'origin',
    label: 'origin',
    type: 'origin',
    values: originValues,
    different: areValuesDifferent(originValues),
  })

  const hasDifferences = rows.some((r) => r.different)

  return {
    rows,
    isMixed,
    hasDifferences,
  }
}
