import type { ComputedRef } from 'vue'
import { cartCount } from '../utils/cart'

export interface HeaderBadges {
  wishlist: ComputedRef<number>
  compare: ComputedRef<number>
  cart: ComputedRef<number>
}

/**
 * Reactive count badges for wishlist, compare, and cart in the store header and mobile bottom navigation.
 * Directly reads minimal state accessors (useCartLines, useWishlistEntries, useCompareEntries)
 * and derives counts via pure functions without invoking full feature composables.
 * Renders counts only after mount to prevent SSR hydration mismatches (server renders without a number).
 */
export function useHeaderBadges(): HeaderBadges {
  const isMounted = ref(false)

  if (import.meta.client) {
    onMounted(() => {
      isMounted.value = true
    })
  }

  const lines = useCartLines()
  const wishlistEntries = useWishlistEntries()
  const compareEntries = useCompareEntries()

  const rawCartCount = computed(() => cartCount(lines.value))
  const rawWishlistCount = computed(() => wishlistEntries.value.length)
  const rawCompareCount = computed(() => compareEntries.value.length)

  const cart = computed(() => (isMounted.value ? rawCartCount.value : 0))
  const wishlist = computed(() => (isMounted.value ? rawWishlistCount.value : 0))
  const compare = computed(() => (isMounted.value ? rawCompareCount.value : 0))

  return {
    wishlist,
    compare,
    cart,
  }
}
