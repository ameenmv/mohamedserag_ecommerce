import type { ProductCard } from '@serag/shared'

export interface WishlistEntry {
  productId: string
  priceAtAdd: number // integer piastres snapshot at time added
  addedAt: number // epoch millisecond timestamp
}

/**
 * Checks whether a product ID is currently in the wishlist entries.
 */
export function hasEntry(
  entries: readonly WishlistEntry[],
  productId: string,
): boolean {
  return entries.some((entry) => entry.productId === productId)
}

/**
 * Toggles an item in the wishlist (PRD US-2.4).
 * Pure function:
 * - If present: removes entry.
 * - If absent: records entry with current priceAtAdd snapshot and addedAt timestamp.
 */
export function toggleEntry(
  entries: readonly WishlistEntry[],
  item: ProductCard | { id: string; price: number } | string,
  priceAtAdd?: number,
  now = Date.now(),
): WishlistEntry[] {
  const productId = typeof item === 'string' ? item : item.id
  const price = typeof item === 'string' ? (priceAtAdd ?? 0) : item.price

  if (hasEntry(entries, productId)) {
    return entries.filter((entry) => entry.productId !== productId)
  }

  return [
    ...entries,
    {
      productId,
      priceAtAdd: price,
      addedAt: now,
    },
  ]
}

/**
 * Determines whether the current catalog price is lower than when added (PRD US-2.4 «السعر نزل»).
 */
export function priceDropped(
  entry: WishlistEntry,
  currentPrice: number,
): boolean {
  return currentPrice < entry.priceAtAdd
}
