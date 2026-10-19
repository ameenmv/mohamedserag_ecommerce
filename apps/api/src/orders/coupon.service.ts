import { Injectable } from '@nestjs/common'
import {
  COUPON_REASON_MESSAGES,
  evaluateCoupon,
  normalizeCouponCode,
  normalizePhone,
  type CartProductRecord,
  type CouponEvaluation,
  type CouponLine,
  type CouponRule,
} from '@serag/shared'
import { Prisma, type Coupon } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { CouponAttemptLimiter } from './coupon-attempt-limiter.js'

@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limiter: CouponAttemptLimiter,
  ) {}

  /**
   * Builds normalized CouponLine items from cart products and ordered items.
   * Items on active flash sale or having an old-price discount are identified.
   * Note: While on flash, the record's oldPrice is the regular price, so derive from flash first.
   */
  buildLines(
    products: readonly CartProductRecord[],
    items: readonly { productId: string; qty: number }[],
  ): CouponLine[] {
    const productMap = new Map<string, CartProductRecord>()
    for (const product of products) {
      productMap.set(product.id, product)
    }

    const lines: CouponLine[] = []
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product || !product.purchasable || item.qty <= 0) {
        continue
      }

      const onFlash = product.flash !== null
      const hasOldPriceDiscount =
        !onFlash && product.oldPrice !== null && product.oldPrice > product.price
      const lineTotal = product.price * item.qty

      lines.push({
        productId: product.id,
        lineTotal,
        onFlash,
        hasOldPriceDiscount,
        categoryId: product.categoryId,
        brandId: product.brandId,
      })
    }

    return lines
  }

  /** Evaluates a coupon for the cart quote (no locking; the order transaction re-checks). */
  async evaluateForQuote(
    code?: string | null,
    products: readonly CartProductRecord[] = [],
    items: readonly { productId: string; qty: number }[] = [],
    phone?: string | null,
    ip?: string,
  ): Promise<CouponEvaluation | null> {
    if (!code || code.trim().length === 0) {
      return null
    }

    const normalizedCode = normalizeCouponCode(code)

    if (ip && this.limiter.isBlocked(ip)) {
      return {
        code: normalizedCode,
        status: 'rejected',
        discount: 0,
        reason: COUPON_REASON_MESSAGES.too_many_attempts,
        reasonCode: 'too_many_attempts',
        minOrder: null,
      }
    }

    const coupon = await this.prisma.coupon.findUnique({ where: { code: normalizedCode } })
    if (!coupon) {
      if (ip) {
        this.limiter.recordFailure(ip)
      }
      return notFound(normalizedCode)
    }
    return this.evaluateRow(this.prisma, coupon, products, items, phone)
  }

  /**
   * Evaluates a coupon inside the order transaction. The coupon row is locked
   * FOR UPDATE so concurrent orders serialize on the usage-limit counts.
   */
  async applyInOrderTx(
    tx: Prisma.TransactionClient,
    code: string | null | undefined,
    products: readonly CartProductRecord[],
    items: readonly { productId: string; qty: number }[],
    phone: string,
  ): Promise<{ evaluation: CouponEvaluation | null; couponId: string | null }> {
    if (!code || code.trim().length === 0) {
      return { evaluation: null, couponId: null }
    }

    const normalizedCode = normalizeCouponCode(code)
    const rows = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM coupons WHERE code = ${normalizedCode} FOR UPDATE`,
    )
    const couponId = rows[0]?.id
    const coupon = couponId ? await tx.coupon.findUnique({ where: { id: couponId } }) : null
    if (!coupon) {
      return { evaluation: notFound(normalizedCode), couponId: null }
    }

    const evaluation = await this.evaluateRow(tx, coupon, products, items, phone)
    return { evaluation, couponId: coupon.id }
  }

  private async evaluateRow(
    client: Prisma.TransactionClient,
    coupon: Coupon,
    products: readonly CartProductRecord[],
    items: readonly { productId: string; qty: number }[],
    phone?: string | null,
  ): Promise<CouponEvaluation> {
    const activeUses = await client.couponRedemption.count({
      where: { couponId: coupon.id, status: 'active' },
    })

    let phoneUses: number | null = null
    if (phone && phone.trim().length > 0) {
      const normalizedPhone = normalizePhone(phone) ?? phone.trim()
      phoneUses = await client.couponRedemption.count({
        where: { couponId: coupon.id, customerPhone: normalizedPhone, status: 'active' },
      })
    }

    const rule: CouponRule = {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
      maxUses: coupon.maxUses,
      maxUsesPerPhone: coupon.maxUsesPerPhone,
      categoryIds: coupon.categoryIds,
      brandIds: coupon.brandIds,
      active: coupon.active,
    }

    const result = evaluateCoupon(rule, this.buildLines(products, items), {
      now: new Date(),
      activeUses,
      phoneUses,
    })

    return {
      code: coupon.code,
      status: result.status,
      discount: result.discount,
      reason: result.reason,
      reasonCode: result.reasonCode,
      minOrder: coupon.minOrder > 0 ? coupon.minOrder : null,
    }
  }
}

function notFound(code: string): CouponEvaluation {
  return {
    code,
    status: 'rejected',
    discount: 0,
    reason: COUPON_REASON_MESSAGES.not_found,
    reasonCode: 'not_found',
    minOrder: null,
  }
}
