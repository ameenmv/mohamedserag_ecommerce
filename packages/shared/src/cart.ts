import type { AvailabilityMode } from './enums.js'
import { deriveAvailability, type AvailabilityResult } from './availability.js'
import { findZone, type Zone } from './zones.js'
import { initialStatus, type CodDepositRule } from './order-flow.js'
import { mergeCartItems, type CartQuoteInput, type CartQuoteItemInput } from './cart-schema.js'

export interface CartProductRecord {
  id: string
  slug: string
  name: string
  modelCode: string
  price: number
  taxRate: number
  stock: number
  lowStockThreshold: number
  availabilityMode: AvailabilityMode
  leadTimeText: string | null
  imageUrl: string | null
  purchasable: boolean
}

export interface CouponEvaluation {
  code: string
  status: 'applied' | 'rejected'
  discount: number
  reason: string | null
}

export interface CartQuoteContext {
  zones: readonly Zone[]
  codDeposit: CodDepositRule
  coupon?: CouponEvaluation | null
}

export type CartQuoteIssue = 'not_found' | 'unavailable' | 'qty_capped' | 'price_changed'

export interface CartQuoteLine {
  productId: string
  slug: string
  name: string
  modelCode: string
  imageUrl: string | null
  requestedQty: number
  qty: number
  unitPrice: number
  lineTotal: number
  availability: AvailabilityResult
  leadTimeText: string | null
  issues: CartQuoteIssue[]
  previousPrice: number | null
}

export interface CartQuoteCodDeposit {
  required: boolean
  pct: number
  amount: number
  threshold: number
}

export interface CartQuote {
  lines: CartQuoteLine[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  zone: { id: string; name: string; fee: number } | null
  coupon: CouponEvaluation | null
  codDeposit: CartQuoteCodDeposit
  hasBlockingIssues: boolean
}

export type BuildCartQuoteInput = Omit<CartQuoteInput, 'items'> & {
  readonly items: readonly CartQuoteItemInput[]
}

/**
 * Calculates the required deposit for an order, rounded UP to a whole Egyptian pound
 * (i.e. A multiple of 100 integer piastres).
 */
export function codDepositAmount(total: number, pct: number): number {
  if (total <= 0 || pct <= 0) {
    return 0
  }
  return Math.ceil((total * pct) / 10000) * 100
}

/**
 * Pure cart pricing and availability evaluation per PRD US-3.1, US-5.1, US-5.2, US-5.5.
 */
export function buildCartQuote(
  input: BuildCartQuoteInput,
  products: readonly CartProductRecord[],
  ctx: CartQuoteContext,
): CartQuote {
  const mergedItems = mergeCartItems(input.items)
  const productMap = new Map<string, CartProductRecord>()
  for (const product of products) {
    productMap.set(product.id, product)
  }

  const lines: CartQuoteLine[] = []

  for (const item of mergedItems) {
    const product = productMap.get(item.productId)

    if (!product || !product.purchasable) {
      lines.push({
        productId: item.productId,
        slug: product?.slug ?? '',
        name: product?.name ?? '',
        modelCode: product?.modelCode ?? '',
        imageUrl: product?.imageUrl ?? null,
        requestedQty: item.qty,
        qty: 0,
        unitPrice: product?.price ?? 0,
        lineTotal: 0,
        availability: {
          state: 'out',
          label: 'نفذ',
          orderable: false,
          maxQty: 0,
        },
        leadTimeText: null,
        issues: ['not_found'],
        previousPrice: null,
      })
      continue
    }

    const availability = deriveAvailability({
      mode: product.availabilityMode,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
    })

    const issues: CartQuoteIssue[] = []
    let effectiveQty = item.qty

    if (!availability.orderable) {
      issues.push('unavailable')
      effectiveQty = 0
    } else if (availability.maxQty !== null && item.qty > availability.maxQty) {
      issues.push('qty_capped')
      effectiveQty = availability.maxQty
    }

    let previousPrice: number | null = null
    if (item.knownPrice !== undefined && item.knownPrice !== product.price) {
      issues.push('price_changed')
      previousPrice = item.knownPrice
    }

    const unitPrice = product.price
    const lineTotal = effectiveQty > 0 ? effectiveQty * unitPrice : 0
    const leadTimeText = product.availabilityMode === 'on_request' ? product.leadTimeText : null

    lines.push({
      productId: item.productId,
      slug: product.slug,
      name: product.name,
      modelCode: product.modelCode,
      imageUrl: product.imageUrl,
      requestedQty: item.qty,
      qty: effectiveQty,
      unitPrice,
      lineTotal,
      availability,
      leadTimeText,
      issues,
      previousPrice,
    })
  }

  const countableLines = lines.filter((line) => line.qty > 0)
  const subtotal = countableLines.reduce((sum, line) => sum + line.lineTotal, 0)

  const hasBlockingIssues = lines.some((line) => line.issues.length > 0)

  let discount = 0
  if (ctx.coupon && ctx.coupon.status === 'applied') {
    discount = Math.min(subtotal, Math.max(0, ctx.coupon.discount))
  }

  let zone: { id: string; name: string; fee: number } | null = null
  let deliveryFee = 0

  if (input.governorate && input.governorate.trim().length > 0) {
    const matchedZone = findZone(ctx.zones, input.governorate.trim(), input.city?.trim())
    zone = {
      id: matchedZone.id,
      name: matchedZone.name,
      fee: matchedZone.fee,
    }
    if (countableLines.length > 0) {
      deliveryFee = matchedZone.fee
    }
  }

  const total = Math.max(0, subtotal - discount + deliveryFee)

  const isCod = input.paymentMethod === 'cod'
  const isAwaitingDeposit =
    isCod && initialStatus('cod', total, ctx.codDeposit) === 'awaiting_deposit'

  const codDeposit: CartQuoteCodDeposit = {
    required: isAwaitingDeposit,
    pct: ctx.codDeposit.pct,
    amount: isAwaitingDeposit ? codDepositAmount(total, ctx.codDeposit.pct) : 0,
    threshold: ctx.codDeposit.threshold,
  }

  return {
    lines,
    subtotal,
    discount,
    deliveryFee,
    total,
    zone,
    coupon: ctx.coupon ?? null,
    codDeposit,
    hasBlockingIssues,
  }
}
