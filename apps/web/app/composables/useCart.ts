import type { ProductCard } from '@serag/shared'
import {
  addLine,
  cartCount,
  cartSubtotal,
  removeLine,
  setLineQty,
} from '../utils/cart'

export function useCart() {
  const notify = useNotify()
  const analytics = useAnalytics()
  const lines = useCartLines()

  const count = computed(() => cartCount(lines.value))
  const subtotal = computed(() => cartSubtotal(lines.value))
  const isEmpty = computed(() => lines.value.length === 0)

  function add(card: ProductCard, qty = 1): void {
    if (!card.availability.orderable || qty <= 0) {
      return
    }

    lines.value = addLine(lines.value, card, qty)
    const t = useNuxtApp().$i18n.t
    notify.success(t('store.cart.addedToCart'))

    analytics.track('add_to_cart', {
      productId: card.id,
      slug: card.slug,
      price: card.price,
      qty,
    })
  }

  function setQty(productId: string, qty: number): void {
    lines.value = setLineQty(lines.value, productId, qty)
  }

  function remove(productId: string): void {
    lines.value = removeLine(lines.value, productId)
  }

  function clear(): void {
    lines.value = []
  }

  function has(productId: string): boolean {
    return lines.value.some((line) => line.productId === productId)
  }

  return {
    lines,
    count,
    subtotal,
    isEmpty,
    add,
    setQty,
    remove,
    clear,
    has,
  }
}
