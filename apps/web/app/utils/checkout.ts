import { z } from 'zod'
import { COUPON_REASON_MESSAGES } from '@serag/shared'
import type {
  CartQuote,
  CouponReasonCode,
  CreateOrderInput,
  CreateOrderResult,
  OrderCustomerInput,
  PaymentMethod,
} from '@serag/shared'
import type { CartLine } from './cart'
import { cartCount } from './cart'
import { getErrorStatus } from './api'

export type PlaceOrderBlockReason =
  | 'notReady'
  | 'submitting'
  | 'pending'
  | 'noQuote'
  | 'noZone'
  | 'blocking'

export interface CheckoutCustomerFormInput {
  name: string
  phone: string
  governorate: string
  city: string
  address: string
  notes?: string
}

export interface CheckoutFormInput extends CheckoutCustomerFormInput {
  paymentMethod: PaymentMethod
  couponCode?: string
}

// A type alias (not an interface) so it stays assignable to FunnelEventData.
export type OrderPlacedAnalyticsEvent = {
  total: number
  itemCount: number
}

export type OrderConflictCode = 'CART_CHANGED' | 'TOTAL_CHANGED' | 'COUPON_REJECTED'

export interface OrderConflictResult {
  code: OrderConflictCode
  message: string
  quote: CartQuote
}

const orderConflictSchema = z.object({
  code: z.enum(['CART_CHANGED', 'TOTAL_CHANGED', 'COUPON_REJECTED']),
  message: z.string(),
  quote: z.custom<CartQuote>(
    (val) => Boolean(val && typeof val === 'object' && 'lines' in val && 'total' in val),
    { message: 'Invalid cart quote' },
  ),
})

/**
 * Determines whether order placement is blocked and returns the specific reason.
 * Evaluates reasons in strict order of precedence:
 * 1. notReady (not hydrated)
 * 2. submitting (submission in-flight)
 * 3. pending (quote calculation pending)
 * 4. noQuote (quote not yet loaded)
 * 5. noZone (delivery zone / governorate not chosen)
 * 6. blocking (quote has blocking issues like out-of-stock items)
 */
export function placeOrderBlockReason(params: {
  hydrated: boolean
  pending: boolean
  quote: CartQuote | null | undefined
  submitting: boolean
}): PlaceOrderBlockReason | null {
  if (!params.hydrated) {
    return 'notReady'
  }
  if (params.submitting) {
    return 'submitting'
  }
  if (params.pending) {
    return 'pending'
  }
  if (!params.quote) {
    return 'noQuote'
  }
  if (!params.quote.zone) {
    return 'noZone'
  }
  if (params.quote.hasBlockingIssues) {
    return 'blocking'
  }
  return null
}

/**
 * Builds the CreateOrderInput payload for POST /api/orders.
 * Trims customer inputs and drops empty or whitespace-only optional notes & coupon fields.
 */
export function buildCreateOrderPayload(
  lines: readonly CartLine[],
  form: CheckoutFormInput,
  idempotencyKey: string,
  expectedTotal: number,
): CreateOrderInput {
  const notesTrimmed = form.notes?.trim()
  const couponTrimmed = form.couponCode?.trim()

  const customer: OrderCustomerInput = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    governorate: form.governorate.trim(),
    city: form.city.trim(),
    address: form.address.trim(),
    ...(notesTrimmed ? { notes: notesTrimmed } : {}),
  }

  return {
    items: lines.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      knownPrice: l.price,
    })),
    customer,
    paymentMethod: form.paymentMethod,
    ...(couponTrimmed ? { couponCode: couponTrimmed } : {}),
    idempotencyKey,
    expectedTotal,
  }
}

/**
 * Extracts and validates a 409 Conflict error payload from a failed order creation.
 * Returns { code, message, quote } if valid, or null for other statuses and malformed shapes.
 */
export function parseOrderConflict(error: unknown): OrderConflictResult | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const status = getErrorStatus(error)
  if (status !== undefined && status !== 409) {
    return null
  }

  let payload: unknown = error
  if ('data' in error && error.data && typeof error.data === 'object') {
    payload = error.data
  } else if (
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    '_data' in error.response
  ) {
    payload = (error.response as { _data: unknown })._data
  }

  const res = orderConflictSchema.safeParse(payload)
  if (!res.success) {
    return null
  }

  return res.data
}

/**
 * Creates the privacy-safe analytics payload for the order_placed event.
 * Strips all personal identifiable information (name, phone, address).
 */
export function orderPlacedEvent(
  result: Pick<CreateOrderResult, 'total'>,
  lines: readonly CartLine[],
): OrderPlacedAnalyticsEvent {
  return {
    total: result.total,
    itemCount: cartCount(lines),
  }
}

/**
 * Pure mapping helper converting a CouponReasonCode to its localized i18n key.
 * Falls back to generic error key if code is unknown, empty, or undefined.
 */
export function couponReasonKey(reasonCode?: CouponReasonCode | string | null): string {
  if (reasonCode && Object.hasOwn(COUPON_REASON_MESSAGES, reasonCode)) {
    return `store.checkout.coupon.reasons.${reasonCode}`
  }
  return 'store.checkout.coupon.reasons.generic'
}
