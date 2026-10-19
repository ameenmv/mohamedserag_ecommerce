import { formatEgpWithUnit } from './money.js'
import type { ProductCard } from './catalog.js'

export type FlashStatus = 'scheduled' | 'running' | 'ended'

export interface ProductFlash {
  salePrice: number // integer piastres
  endsAt: string // ISO string
}

export interface FlashSaleOffersGroup {
  id: string
  name: string
  endsAt: string
  products: ProductCard[]
}

export interface OffersResponse {
  flash: FlashSaleOffersGroup[]
  discounted: ProductCard[]
}

export function flashStatus(
  dates: { startsAt: Date | string; endsAt: Date | string },
  now: Date | string | number = new Date(),
): FlashStatus {
  const nowMs = new Date(now).getTime()
  const startMs = new Date(dates.startsAt).getTime()
  const endMs = new Date(dates.endsAt).getTime()

  if (nowMs < startMs) {
    return 'scheduled'
  }
  if (nowMs >= endMs) {
    return 'ended'
  }
  return 'running'
}

export function isFlashActive(
  dates: { startsAt: Date | string; endsAt: Date | string },
  now: Date | string | number = new Date(),
): boolean {
  return flashStatus(dates, now) === 'running'
}

export function applyFlashToPrice(
  product: { price: number; oldPrice: number | null },
  flash: ProductFlash | null,
): { price: number; oldPrice: number | null; discountPercent: number | null } {
  if (flash) {
    const salePrice = flash.salePrice
    const oldPrice = product.price
    const discountPercent =
      oldPrice > salePrice ? Math.round(((oldPrice - salePrice) / oldPrice) * 100) : null
    return {
      price: salePrice,
      oldPrice,
      discountPercent,
    }
  }

  const discountPercent =
    product.oldPrice !== null && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null

  return {
    price: product.price,
    oldPrice: product.oldPrice,
    discountPercent,
  }
}

export type CouponType = 'percent' | 'fixed'

export interface CouponRule {
  id: string
  code: string
  type: CouponType
  value: number // percent 1-90 or fixed piastres > 0
  minOrder: number // integer piastres
  startsAt: Date | string | null
  endsAt: Date | string | null
  maxUses: number | null
  maxUsesPerPhone: number | null
  categoryIds: string[]
  brandIds: string[]
  active: boolean
}

export interface CouponLine {
  productId: string
  lineTotal: number // integer piastres
  onFlash: boolean
  hasOldPriceDiscount: boolean
  categoryId: string
  brandId: string
}

export type CouponReasonCode =
  | 'not_found'
  | 'expired'
  | 'not_started'
  | 'min_order'
  | 'limit'
  | 'phone_limit'
  | 'no_eligible'

export const COUPON_REASON_MESSAGES: Record<CouponReasonCode, string> = {
  not_found: 'الكود ده مش موجود',
  expired: 'الكود انتهى',
  not_started: 'الكود لسه مبدأش',
  min_order: 'الحد الأدنى للطلب {amount}',
  limit: 'الكود ده خلص',
  phone_limit: 'استخدمت الكود ده قبل كده',
  no_eligible: 'الكود ده مش على المنتجات اللي في السلة',
}

export interface EvaluateCouponContext {
  now?: Date | string | number
  activeUses?: number
  phoneUses?: number | null
}

export interface EvaluateCouponResult {
  status: 'applied' | 'rejected'
  discount: number // integer piastres
  eligibleSubtotal: number // integer piastres
  reasonCode: CouponReasonCode | null
  reason: string | null
}

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export type CouponStatus = 'inactive' | 'scheduled' | 'running' | 'expired'

export function couponStatus(
  coupon: { active: boolean; startsAt?: Date | string | null; endsAt?: Date | string | null },
  now: Date | string | number = new Date(),
): CouponStatus {
  if (!coupon.active) {
    return 'inactive'
  }
  const nowMs = new Date(now).getTime()
  if (coupon.startsAt) {
    const startMs = new Date(coupon.startsAt).getTime()
    if (nowMs < startMs) {
      return 'scheduled'
    }
  }
  if (coupon.endsAt) {
    const endMs = new Date(coupon.endsAt).getTime()
    if (nowMs >= endMs) {
      return 'expired'
    }
  }
  return 'running'
}

export function evaluateCoupon(
  rule: CouponRule | null | undefined,
  lines: readonly CouponLine[],
  ctx: EvaluateCouponContext = {},
): EvaluateCouponResult {
  if (!rule) {
    return {
      status: 'rejected',
      discount: 0,
      eligibleSubtotal: 0,
      reasonCode: 'not_found',
      reason: COUPON_REASON_MESSAGES.not_found,
    }
  }

  const nowMs = ctx.now !== undefined ? new Date(ctx.now).getTime() : Date.now()

  if (!rule.active) {
    return {
      status: 'rejected',
      discount: 0,
      eligibleSubtotal: 0,
      reasonCode: 'expired',
      reason: COUPON_REASON_MESSAGES.expired,
    }
  }

  if (rule.startsAt) {
    const startMs = new Date(rule.startsAt).getTime()
    if (nowMs < startMs) {
      return {
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'not_started',
        reason: COUPON_REASON_MESSAGES.not_started,
      }
    }
  }

  if (rule.endsAt) {
    const endMs = new Date(rule.endsAt).getTime()
    if (nowMs >= endMs) {
      return {
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'expired',
        reason: COUPON_REASON_MESSAGES.expired,
      }
    }
  }

  // FR-008: Eligible items are not on an active flash sale, without an old-price discount, and inside category/brand scope
  let eligibleSubtotal = 0
  for (const line of lines) {
    if (line.onFlash || line.hasOldPriceDiscount) {
      continue
    }

    const categoryMatch = rule.categoryIds.length === 0 || rule.categoryIds.includes(line.categoryId)
    const brandMatch = rule.brandIds.length === 0 || rule.brandIds.includes(line.brandId)

    if (categoryMatch && brandMatch) {
      eligibleSubtotal += line.lineTotal
    }
  }

  if (eligibleSubtotal <= 0) {
    return {
      status: 'rejected',
      discount: 0,
      eligibleSubtotal: 0,
      reasonCode: 'no_eligible',
      reason: COUPON_REASON_MESSAGES.no_eligible,
    }
  }

  if (rule.minOrder > 0 && eligibleSubtotal < rule.minOrder) {
    return {
      status: 'rejected',
      discount: 0,
      eligibleSubtotal,
      reasonCode: 'min_order',
      reason: COUPON_REASON_MESSAGES.min_order.replace('{amount}', formatEgpWithUnit(rule.minOrder)),
    }
  }

  const activeUses = ctx.activeUses ?? 0
  if (rule.maxUses !== null && rule.maxUses !== undefined && activeUses >= rule.maxUses) {
    return {
      status: 'rejected',
      discount: 0,
      eligibleSubtotal,
      reasonCode: 'limit',
      reason: COUPON_REASON_MESSAGES.limit,
    }
  }

  const phoneUses = ctx.phoneUses ?? null
  if (
    phoneUses !== null &&
    rule.maxUsesPerPhone !== null &&
    rule.maxUsesPerPhone !== undefined &&
    phoneUses >= rule.maxUsesPerPhone
  ) {
    return {
      status: 'rejected',
      discount: 0,
      eligibleSubtotal,
      reasonCode: 'phone_limit',
      reason: COUPON_REASON_MESSAGES.phone_limit,
    }
  }

  let calculatedDiscount = 0
  if (rule.type === 'percent') {
    calculatedDiscount = Math.round((eligibleSubtotal * rule.value) / 100)
  } else {
    calculatedDiscount = Math.min(rule.value, eligibleSubtotal)
  }

  const discount = Math.max(0, Math.min(calculatedDiscount, eligibleSubtotal))

  return {
    status: 'applied',
    discount,
    eligibleSubtotal,
    reasonCode: null,
    reason: null,
  }
}
