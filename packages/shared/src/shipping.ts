export const SHIPPING_CLASSES = ['small', 'medium', 'large'] as const
export type ShippingClass = (typeof SHIPPING_CLASSES)[number]

export interface ZoneFees {
  small: number
  medium: number
  large: number
}

const SHIPPING_CLASS_RANK: Record<ShippingClass, number> = {
  small: 0,
  medium: 1,
  large: 2,
}

/** The class that costs the most to deliver; ties keep the existing class. */
export function maxShippingClass(
  current: ShippingClass,
  next: ShippingClass,
): ShippingClass {
  return SHIPPING_CLASS_RANK[next] > SHIPPING_CLASS_RANK[current] ? next : current
}

/**
 * Resolves a product's delivery class: product override → category → ancestors → `large`.
 * `large` is the safe fallback so an unknown product is never undercharged.
 */
export function resolveShippingClass(
  productClass: ShippingClass | null | undefined,
  categoryChain: readonly (ShippingClass | null | undefined)[],
): ShippingClass {
  if (productClass) return productClass
  for (const categoryClass of categoryChain) {
    if (categoryClass) return categoryClass
  }
  return 'large'
}

/** The delivery fee for one class in a zone, in integer piastres. */
export function zoneFeeFor(fees: ZoneFees, shippingClass: ShippingClass): number {
  return fees[shippingClass]
}

/**
 * Legacy zones stored one `fee`. Migration: large = fee, medium = round(fee × 0.75),
 * small = round(fee × 0.5), each rounded to a whole Egyptian pound (multiples of 100 piastres).
 */
export function legacyZoneFees(fee: number): ZoneFees {
  return {
    small: Math.round((fee * 0.5) / 100) * 100,
    medium: Math.round((fee * 0.75) / 100) * 100,
    large: fee,
  }
}

export interface DeliveryOffers {
  freeAbove: {
    enabled: boolean
    amount: number
    classes: ShippingClass[]
  }
  firstOrderFree: {
    enabled: boolean
    classes: ShippingClass[]
  }
}

/** Both offers are off by default; the owner opts in from the delivery page. */
export const DEFAULT_DELIVERY_OFFERS: DeliveryOffers = {
  freeAbove: {
    enabled: false,
    amount: 0,
    classes: [...SHIPPING_CLASSES],
  },
  firstOrderFree: {
    enabled: false,
    classes: [...SHIPPING_CLASSES],
  },
}

export type DeliveryFreeReason = 'threshold' | 'first_order' | null

export interface DeliveryOfferEvaluation {
  freeReason: DeliveryFreeReason
  freeAboveRemaining: number | null
}

export interface DeliveryOfferInput {
  shippingClass: ShippingClass
  /** Subtotal after any coupon discount, in integer piastres. */
  subtotalAfterDiscount: number
  offers: DeliveryOffers
  /** null means the phone is unknown, so the first-order offer is not applied. */
  isFirstOrder: boolean | null
}

/**
 * Applies the opt-in free-delivery offers. Threshold wins over first-order.
 * When neither applies and the threshold offer is on for this class, the amount
 * still needed to unlock it is returned for the cart hint.
 */
export function evaluateDeliveryOffers(input: DeliveryOfferInput): DeliveryOfferEvaluation {
  const { shippingClass, subtotalAfterDiscount, offers, isFirstOrder } = input
  const threshold = offers.freeAbove
  const thresholdApplies =
    threshold.enabled &&
    threshold.classes.includes(shippingClass) &&
    subtotalAfterDiscount >= threshold.amount

  if (thresholdApplies) {
    return { freeReason: 'threshold', freeAboveRemaining: null }
  }

  const firstOrder = offers.firstOrderFree
  const firstOrderApplies =
    firstOrder.enabled &&
    firstOrder.classes.includes(shippingClass) &&
    isFirstOrder === true

  if (firstOrderApplies) {
    return { freeReason: 'first_order', freeAboveRemaining: null }
  }

  const remaining =
    threshold.enabled &&
    threshold.classes.includes(shippingClass) &&
    subtotalAfterDiscount < threshold.amount
      ? threshold.amount - subtotalAfterDiscount
      : null

  return { freeReason: null, freeAboveRemaining: remaining }
}
