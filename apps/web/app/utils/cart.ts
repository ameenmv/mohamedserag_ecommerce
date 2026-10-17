import type { ProductCard } from '@serag/shared'

export interface CartLine {
  productId: string
  slug: string
  name: string
  image: string | null
  price: number // integer piastres snapshot at add
  qty: number
  maxQty: number | null
}

/**
 * Adds a product card to cart lines (PRD US-3.1 & US-5.1).
 * Pure function:
 * - Refuses non-orderable items (returns lines unchanged).
 * - Merges quantity if product already exists.
 * - Caps quantity at `maxQty` (availability stock threshold).
 */
export function addLine(
  lines: readonly CartLine[],
  card: ProductCard,
  qty = 1,
): CartLine[] {
  if (!card.availability.orderable || qty <= 0) {
    return [...lines]
  }

  const existingIndex = lines.findIndex((line) => line.productId === card.id)

  if (existingIndex !== -1) {
    const existing = lines[existingIndex]!
    const effectiveMax = card.availability.maxQty ?? existing.maxQty
    const requestedQty = existing.qty + qty
    const finalQty = effectiveMax !== null ? Math.min(requestedQty, effectiveMax) : requestedQty

    if (finalQty <= 0) {
      return lines.filter((line) => line.productId !== card.id)
    }

    const next = [...lines]
    next[existingIndex] = {
      ...existing,
      qty: finalQty,
      maxQty: effectiveMax,
    }
    return next
  }

  const maxQty = card.availability.maxQty
  const finalQty = maxQty !== null ? Math.min(qty, maxQty) : qty
  if (finalQty <= 0) {
    return [...lines]
  }

  const newLine: CartLine = {
    productId: card.id,
    slug: card.slug,
    name: card.name,
    image: card.image?.url ?? null,
    price: card.price,
    qty: finalQty,
    maxQty,
  }

  return [...lines, newLine]
}

/**
 * Sets explicit quantity for a cart line.
 * If qty <= 0, the line is removed.
 * Caps at line's maxQty if specified.
 */
export function setLineQty(
  lines: readonly CartLine[],
  productId: string,
  qty: number,
): CartLine[] {
  if (qty <= 0) {
    return removeLine(lines, productId)
  }

  const index = lines.findIndex((line) => line.productId === productId)
  if (index === -1) {
    return [...lines]
  }

  const existing = lines[index]!
  const finalQty = existing.maxQty !== null ? Math.min(qty, existing.maxQty) : qty

  if (finalQty <= 0) {
    return removeLine(lines, productId)
  }

  const next = [...lines]
  next[index] = {
    ...existing,
    qty: finalQty,
  }
  return next
}

/**
 * Removes a cart line by productId.
 */
export function removeLine(
  lines: readonly CartLine[],
  productId: string,
): CartLine[] {
  return lines.filter((line) => line.productId !== productId)
}

/**
 * Total item units in cart.
 */
export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.qty, 0)
}

/**
 * Subtotal of all cart lines in integer piastres.
 */
export function cartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.price * line.qty, 0)
}
