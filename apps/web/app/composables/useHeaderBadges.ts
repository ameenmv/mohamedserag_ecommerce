import type { Ref } from 'vue'

export interface HeaderBadges {
  wishlist: Ref<number>
  compare: Ref<number>
  cart: Ref<number>
}

/**
 * Reactive count badges for wishlist, compare, and cart in the store header and mobile bottom navigation.
 */
export function useHeaderBadges(): HeaderBadges {
  const wishlist = useState<number>('header-badge-wishlist', () => 0)
  const compare = useState<number>('header-badge-compare', () => 0)
  const cart = useState<number>('header-badge-cart', () => 0)

  return {
    wishlist,
    compare,
    cart,
  }
}
