import type { Ref } from 'vue'
import type { ProductCard } from '@serag/shared'
import type { CartLine } from '../utils/cart'
import type { CompareEntry } from '../utils/compare'
import type { WishlistEntry } from '../utils/wishlist'

/**
 * Minimal, framework-safe state accessors.
 * Each accessor only wraps `useState` with no dependency on i18n, plugins, or UI,
 * allowing safe access from plugins, middleware, event handlers, and component setup.
 */

export function useCartLines(): Ref<CartLine[]> {
  return useState<CartLine[]>('storefront-cart-lines', () => [])
}

export function useWishlistEntries(): Ref<WishlistEntry[]> {
  return useState<WishlistEntry[]>('storefront-wishlist-entries', () => [])
}

export function useWishlistCards(): Ref<ProductCard[]> {
  return useState<ProductCard[]>('storefront-wishlist-cards', () => [])
}

export function useCompareEntries(): Ref<CompareEntry[]> {
  return useState<CompareEntry[]>('storefront-compare-entries', () => [])
}
