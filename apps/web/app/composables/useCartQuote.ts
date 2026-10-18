import type { Ref } from 'vue'
import type { CartQuote } from '@serag/shared'
import type { CartLine } from '../utils/cart'
import { getApiBaseUrl } from '../utils/api'
import {
  applyQuoteToCartState,
  buildQuoteRequest,
  cartQuoteKey,
  dismissPriceChange as dismissPriceChangeUtil,
  prunePriceChanges,
  type CartQuoteContext,
  type PriceChange,
} from '../utils/cart-quote'

export type { CartQuoteContext, PriceChange }

export interface UseCartQuoteControllerOptions {
  lines?: Ref<CartLine[]>
}

/**
 * Centralized cart quote controller.
 * The ONLY place with watchers, debounce (300ms), and last-request-wins request sequencing.
 * Automatically applies the quote to the cart state upon successful fetch.
 * Ignores price changes in the watch key to prevent infinite quote loops.
 */
export function useCartQuoteController(options: UseCartQuoteControllerOptions = {}) {
  const lines = options.lines ?? useCartLines()
  const quote = useState<CartQuote | null>('cart-quote-data', () => null)
  const priceChanges = useState<Record<string, PriceChange>>('cart-price-changes', () => ({}))
  const pending = useState<boolean>('cart-quote-pending', () => false)
  const error = useState<unknown>('cart-quote-error', () => null)
  const context = useState<CartQuoteContext>('cart-quote-context', () => ({}))
  const nonce = useState<number>('cart-quote-nonce', () => 0)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestSeq = 0

  async function fetchQuote(): Promise<CartQuote | null> {
    if (import.meta.server || typeof window === 'undefined') {
      return null
    }

    if (lines.value.length === 0) {
      quote.value = null
      pending.value = false
      error.value = null
      return null
    }

    const currentSeq = ++requestSeq
    pending.value = true
    error.value = null

    try {
      const baseURL = getApiBaseUrl()
      const payload = buildQuoteRequest(lines.value, context.value)

      const res = await $fetch<CartQuote>('/cart/quote', {
        baseURL,
        method: 'POST',
        body: payload,
      })

      if (currentSeq === requestSeq) {
        quote.value = res
        const applied = applyQuoteToCartState(lines.value, priceChanges.value, res)
        lines.value = applied.lines
        priceChanges.value = applied.priceChanges
        pending.value = false
        return res
      }
      return null
    } catch (err) {
      if (currentSeq === requestSeq) {
        error.value = err
        pending.value = false
      }
      return null
    }
  }

  function triggerDebounced(): void {
    if (import.meta.server || typeof window === 'undefined') return
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      fetchQuote()
    }, 300)
  }

  // Watch for cart line removals: clean up priceChanges for removed products
  watch(
    () => lines.value.map((l) => l.productId),
    (currentProductIds) => {
      priceChanges.value = prunePriceChanges(priceChanges.value, currentProductIds)
    },
  )

  // Watchers only installed here in the controller
  // Cart key ignores prices so price updates from quote don't loop
  const cartKey = computed(() => cartQuoteKey(lines.value))
  const contextKey = computed(() => {
    const c = context.value
    return `${c.governorate ?? ''}|${c.city ?? ''}|${c.paymentMethod ?? ''}|${c.couponCode ?? ''}`
  })

  watch(
    [cartKey, contextKey],
    () => {
      if (lines.value.length === 0) {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
          debounceTimer = null
        }
        quote.value = null
        pending.value = false
        error.value = null
        priceChanges.value = {}
      } else {
        triggerDebounced()
      }
    },
    { immediate: true },
  )

  // Watch nonce for immediate execution requested via refreshNow()
  watch(nonce, () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    fetchQuote()
  })

  return {
    fetchQuote,
    pending,
    error,
    quote,
  }
}

/**
 * Read-only cart quote composable with state actions.
 * Shares single-source-of-truth state maintained by useCartQuoteController.
 */
export function useCartQuote(options: { lines?: Ref<CartLine[]> } = {}) {
  const lines = options.lines ?? useCartLines()
  const quote = useState<CartQuote | null>('cart-quote-data', () => null)
  const priceChanges = useState<Record<string, PriceChange>>('cart-price-changes', () => ({}))
  const pending = useState<boolean>('cart-quote-pending', () => false)
  const error = useState<unknown>('cart-quote-error', () => null)
  const context = useState<CartQuoteContext>('cart-quote-context', () => ({}))
  const nonce = useState<number>('cart-quote-nonce', () => 0)

  function applyQuoteToCart(quoteToApply?: CartQuote): void {
    const applied = applyQuoteToCartState(
      lines.value,
      priceChanges.value,
      quoteToApply ?? quote.value,
    )
    lines.value = applied.lines
    priceChanges.value = applied.priceChanges
  }

  function dismissPriceChange(productId?: string): void {
    priceChanges.value = dismissPriceChangeUtil(priceChanges.value, productId)
  }

  function refreshNow(): void {
    nonce.value++
  }

  function setQuoteContext(partial: Partial<CartQuoteContext>): void {
    context.value = {
      ...context.value,
      ...partial,
    }
  }

  function resetQuoteContext(): void {
    context.value = {}
  }

  return {
    quote,
    pending,
    error,
    priceChanges,
    applyQuoteToCart,
    dismissPriceChange,
    refreshNow,
    refresh: refreshNow,
    fetchQuote: refreshNow,
    setQuoteContext,
    resetQuoteContext,
  }
}
