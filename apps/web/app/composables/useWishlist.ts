import type { ProductCard } from '@serag/shared'
import {
  hasEntry,
  priceDropped,
  toggleEntry,
  type WishlistEntry,
} from '../utils/wishlist'


export interface WishlistItem {
  entry: WishlistEntry
  card: ProductCard | null
  priceDropped: boolean
}

export function useWishlist() {
  const entries = useWishlistEntries()
  const currentCards = useWishlistCards()
  const loading = useState<boolean>('storefront-wishlist-loading', () => false)

  const count = computed(() => entries.value.length)
  const isEmpty = computed(() => entries.value.length === 0)

  const items = computed<WishlistItem[]>(() =>
    entries.value.map((entry) => {
      const card = currentCards.value.find((c) => c.id === entry.productId) ?? null
      const dropped = card !== null ? priceDropped(entry, card.price) : false
      return {
        entry,
        card,
        priceDropped: dropped,
      }
    }),
  )

  function has(productId: string): boolean {
    return hasEntry(entries.value, productId)
  }

  function toggle(
    item: ProductCard | { id: string; price: number } | string,
    priceAtAdd?: number,
  ): boolean {
    const productId = typeof item === 'string' ? item : item.id
    const wasPresent = has(productId)
    entries.value = toggleEntry(entries.value, item, priceAtAdd)
    if (wasPresent) {
      currentCards.value = currentCards.value.filter((c) => c.id !== productId)
    }
    return !wasPresent // returns true if added, false if removed
  }

  function remove(productId: string): void {
    entries.value = entries.value.filter((e) => e.productId !== productId)
    currentCards.value = currentCards.value.filter((c) => c.id !== productId)
  }

  function clear(): void {
    entries.value = []
    currentCards.value = []
  }

  /**
   * Loads current catalog cards via `productsByIds` to compare current prices (PRD US-2.4).
   */
  async function refresh(): Promise<ProductCard[]> {
    if (entries.value.length === 0) {
      currentCards.value = []
      return []
    }

    loading.value = true
    try {
      const api = useStoreApi()
      const ids = entries.value.map((e) => e.productId)
      const cards = await api.productsByIds(ids)
      currentCards.value = cards
      return cards
    } finally {
      loading.value = false
    }
  }

  return {
    entries,
    currentCards,
    items,
    count,
    isEmpty,
    loading,
    has,
    toggle,
    remove,
    clear,
    refresh,
  }
}
