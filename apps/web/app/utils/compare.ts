import type { ProductCard } from '@serag/shared'

export interface CompareEntry {
  productId: string
  categorySlug: string
}

export type CompareToggleResult = 'added' | 'removed' | 'full'

export interface ToggleCompareReturn {
  entries: CompareEntry[]
  result: CompareToggleResult
}

export const MAX_COMPARE_ITEMS = 3

/**
 * Checks whether a product ID is in the compare list.
 */
export function hasCompareEntry(
  entries: readonly CompareEntry[],
  productId: string,
): boolean {
  return entries.some((entry) => entry.productId === productId)
}

function resolveCompareItem(
  item: ProductCard | CompareEntry | { id: string; category: { slug: string } },
): { productId: string; categorySlug: string } {
  if ('productId' in item) {
    return { productId: item.productId, categorySlug: item.categorySlug }
  }
  return { productId: item.id, categorySlug: item.category.slug }
}

/**
 * Toggles a product in the compare table (PRD US-2.3).
 * Pure function:
 * - If present: removes it and returns result: 'removed'.
 * - If absent and entries count < 3: adds it and returns result: 'added'.
 * - If absent and entries count >= 3: refuses 4th item and returns result: 'full' (UI triggers replace dialog).
 */
export function toggleCompare(
  entries: readonly CompareEntry[],
  item: ProductCard | CompareEntry | { id: string; category: { slug: string } },
): ToggleCompareReturn {
  const { productId, categorySlug } = resolveCompareItem(item)

  if (hasCompareEntry(entries, productId)) {
    return {
      entries: entries.filter((entry) => entry.productId !== productId),
      result: 'removed',
    }
  }

  if (entries.length >= MAX_COMPARE_ITEMS) {
    return {
      entries: [...entries],
      result: 'full',
    }
  }

  return {
    entries: [...entries, { productId, categorySlug }],
    result: 'added',
  }
}

/**
 * Replaces an existing compare item with a new product (PRD US-2.3).
 */
export function replaceCompare(
  entries: readonly CompareEntry[],
  oldId: string,
  newItem: ProductCard | CompareEntry | { id: string; category: { slug: string } },
): CompareEntry[] {
  const { productId, categorySlug } = resolveCompareItem(newItem)

  const exists = entries.some((entry) => entry.productId === oldId)
  if (exists) {
    return entries.map((entry) =>
      entry.productId === oldId ? { productId, categorySlug } : entry,
    )
  }

  if (entries.length < MAX_COMPARE_ITEMS && !hasCompareEntry(entries, productId)) {
    return [...entries, { productId, categorySlug }]
  }

  return [...entries]
}

/**
 * Checks whether compare entries span different categories (PRD US-2.3).
 * When comparing products from different categories, UI shows common rows and a note.
 */
export function mixedCategories(entries: readonly CompareEntry[]): boolean {
  if (entries.length <= 1) {
    return false
  }
  const firstCategory = entries[0]?.categorySlug
  return entries.some((entry) => entry.categorySlug !== firstCategory)
}
