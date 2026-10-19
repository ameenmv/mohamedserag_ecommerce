import type { Ref } from 'vue'
import type { CartLine } from '../utils/cart'
import type { CompareEntry } from '../utils/compare'
import type { WishlistEntry } from '../utils/wishlist'

export const STORAGE_KEY_CART = 'serag:cart:v1'
export const STORAGE_KEY_WISHLIST = 'serag:wishlist:v1'
export const STORAGE_KEY_COMPARE = 'serag:compare:v1'

function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CartLine =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.productId === 'string' &&
        typeof item.slug === 'string' &&
        typeof item.name === 'string' &&
        typeof item.price === 'number' &&
        Number.isFinite(item.price) &&
        typeof item.qty === 'number' &&
        item.qty > 0 &&
        Number.isFinite(item.qty) &&
        (item.image === null || typeof item.image === 'string') &&
        (item.maxQty === null ||
          (typeof item.maxQty === 'number' && Number.isFinite(item.maxQty))),
    )
  } catch {
    return []
  }
}

function parseStoredWishlist(raw: string | null): WishlistEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is WishlistEntry =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.productId === 'string' &&
        typeof item.priceAtAdd === 'number' &&
        Number.isFinite(item.priceAtAdd) &&
        typeof item.addedAt === 'number' &&
        Number.isFinite(item.addedAt),
    )
  } catch {
    return []
  }
}

function parseStoredCompare(raw: string | null): CompareEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid = parsed.filter(
      (item): item is CompareEntry =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.productId === 'string' &&
        typeof item.categorySlug === 'string',
    )
    return valid.slice(0, 3)
  } catch {
    return []
  }
}

/**
 * Loads and defensively parses localStorage, initializing state,
 * and attaches a deep watcher to persist changes back to versioned storage.
 */
function syncWithStorage<T>(
  key: string,
  state: Ref<T[]>,
  parse: (raw: string | null) => T[],
): void {
  try {
    const raw = localStorage.getItem(key)
    state.value = parse(raw)
  } catch {
    state.value = []
  }

  watch(
    state,
    (val) => {
      try {
        localStorage.setItem(key, JSON.stringify(val))
      } catch {
        // Handle quota exceeded or private browsing
      }
    },
    { deep: true },
  )
}

export default defineNuxtPlugin(() => {
  const lines = useCartLines()
  const wishlistEntries = useWishlistEntries()
  const compareEntries = useCompareEntries()

  syncWithStorage(STORAGE_KEY_CART, lines, parseStoredCart)
  syncWithStorage(STORAGE_KEY_WISHLIST, wishlistEntries, parseStoredWishlist)
  syncWithStorage(STORAGE_KEY_COMPARE, compareEntries, parseStoredCompare)
})
