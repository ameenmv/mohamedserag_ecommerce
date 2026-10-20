import type { CartQuote, CartQuoteInput, PaymentMethod } from '@serag/shared'
import type { CartLine } from './cart'

export interface PriceChange {
  from: number
  to: number
}

export interface CartQuoteContext {
  governorate?: string
  city?: string
  paymentMethod?: PaymentMethod
  couponCode?: string
}

/**
 * Builds a cache/watch key for cart lines that ignores price changes,
 * preventing infinite quote refresh loops when prices update.
 */
export function cartQuoteKey(lines: readonly CartLine[]): string {
  return lines.map((l) => `${l.productId}:${l.qty}`).join(',')
}

/**
 * Builds the POST /api/cart/quote request payload from cart lines and quote context.
 * Governorate and city are only included when non-empty strings are provided.
 */
export function buildQuoteRequest(
  lines: readonly CartLine[],
  context?: CartQuoteContext | null,
): CartQuoteInput {
  return {
    items: lines.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      knownPrice: l.price,
    })),
    governorate: context?.governorate?.trim() || undefined,
    city: context?.city?.trim() || undefined,
    paymentMethod: context?.paymentMethod || undefined,
    couponCode: context?.couponCode?.trim() || undefined,
  }
}

/**
 * Applies a server quote back onto cart lines and records price changes.
 * Pure function: takes immutable inputs and returns updated lines and priceChanges.
 */
export function applyQuoteToCartState(
  lines: readonly CartLine[],
  priceChanges: Readonly<Record<string, PriceChange>>,
  quote: CartQuote | null | undefined,
): { lines: CartLine[]; priceChanges: Record<string, PriceChange> } {
  if (!quote) {
    return {
      lines: [...lines],
      priceChanges: { ...priceChanges },
    }
  }

  // 1. Record price changes
  const nextChanges: Record<string, PriceChange> = { ...priceChanges }
  for (const qLine of quote.lines) {
    if (qLine.issues.includes('price_changed') && qLine.previousPrice !== null) {
      nextChanges[qLine.productId] = {
        from: qLine.previousPrice,
        to: qLine.unitPrice,
      }
    }
  }

  // 2. Update cart lines with new prices, maxQty, and capped quantities
  const nextLines = lines.map((cartLine) => {
    const qLine = quote.lines.find((l) => l.productId === cartLine.productId)
    if (!qLine) return cartLine

    const effectiveMaxQty = qLine.availability.maxQty
    let effectiveQty = cartLine.qty

    if (qLine.qty > 0 && qLine.qty < effectiveQty) {
      effectiveQty = qLine.qty
    } else if (effectiveMaxQty !== null && effectiveQty > effectiveMaxQty) {
      effectiveQty = effectiveMaxQty
    }

    return {
      ...cartLine,
      price: qLine.unitPrice,
      maxQty: effectiveMaxQty,
      qty: effectiveQty,
    }
  })

  return {
    lines: nextLines,
    priceChanges: nextChanges,
  }
}

/**
 * Prunes price changes for products that are no longer in the cart.
 * Uses Object.fromEntries to comply with the no-dynamic-delete rule.
 */
export function prunePriceChanges(
  priceChanges: Readonly<Record<string, PriceChange>>,
  productIds: readonly string[],
): Record<string, PriceChange> {
  const currentSet = new Set(productIds)
  return Object.fromEntries(
    Object.entries(priceChanges).filter(([id]) => currentSet.has(id)),
  )
}

/**
 * Clears a specific price change or all price changes when dismissed by shopper.
 */
export function dismissPriceChange(
  priceChanges: Readonly<Record<string, PriceChange>>,
  productId?: string,
): Record<string, PriceChange> {
  if (productId) {
    return Object.fromEntries(
      Object.entries(priceChanges).filter(([id]) => id !== productId),
    )
  }
  return {}
}
