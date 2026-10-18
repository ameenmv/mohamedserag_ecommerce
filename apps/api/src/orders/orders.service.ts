import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import {
  buildCartQuote,
  codDepositAmount,
  initialStatus,
  type CreateOrderInput,
  type CreateOrderResult,
  type OrderStatus,
} from '@serag/shared'
import { nanoid } from 'nanoid'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'
import { loadCartProducts } from './cart-products.js'
import { CouponService } from './coupon.service.js'

export const ORDER_RESULT_SELECT = {
  no: true,
  publicToken: true,
  status: true,
  total: true,
} as const

export function toCreateOrderResult(row: {
  no: string
  publicToken: string
  status: OrderStatus
  total: number
}): CreateOrderResult {
  return { no: row.no, publicToken: row.publicToken, status: row.status, total: row.total }
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: StoreSettingsService,
    private readonly couponService: CouponService,
  ) {}

  /**
   * Idempotently creates an order inside a single database transaction.
   */
  async createOrder(
    input: CreateOrderInput,
  ): Promise<{ result: CreateOrderResult; isNew: boolean }> {
    // 1. Idempotency check FIRST (retries return 200 even if method was since disabled)
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: ORDER_RESULT_SELECT,
    })
    if (existing) {
      return { result: toCreateOrderResult(existing), isNew: false }
    }

    // 2. Verify payment method is enabled in store settings
    const payments = await this.settingsService.getPayments()
    const methodSetting = payments.methods[input.paymentMethod]
    if (!methodSetting || !methodSetting.enabled) {
      throw new BadRequestException('طريقة الدفع دي مش متاحة')
    }

    const [zones, codDeposit] = await Promise.all([
      this.settingsService.getZones(),
      this.settingsService.getCodDeposit(),
    ])

    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        const existingInTx = await tx.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: ORDER_RESULT_SELECT,
        })
        if (existingInTx) {
          return { order: existingInTx, isNew: false }
        }

        const productIds = input.items.map((i) => i.productId)
        const products = await loadCartProducts(tx, productIds)
        const coupon = this.couponService.evaluate(input.couponCode)
        const quote = buildCartQuote(
          {
            items: input.items,
            governorate: input.customer.governorate,
            city: input.customer.city,
            paymentMethod: input.paymentMethod,
            couponCode: input.couponCode,
          },
          products,
          { zones, codDeposit, coupon },
        )

        const countableLines = quote.lines.filter((l) => l.qty > 0)
        if (quote.hasBlockingIssues || countableLines.length === 0) {
          throw new ConflictException({
            code: 'CART_CHANGED',
            message: 'في تغييرات في السلة، راجعها قبل ما تأكد',
            quote,
          })
        }

        if (quote.total !== input.expectedTotal) {
          throw new ConflictException({
            code: 'TOTAL_CHANGED',
            message: 'في تغييرات في السلة، راجعها قبل ما تأكد',
            quote,
          })
        }

        const seq = await tx.$queryRaw<Array<{ nextval: bigint | number | string }>>`SELECT nextval('order_no_seq')`
        const rawNextVal = seq[0]?.nextval
        if (rawNextVal === undefined) throw new Error('Failed to read next value from order_no_seq')
        const no = `SR-${new Date().getFullYear()}-${String(Number(rawNextVal)).padStart(6, '0')}`

        const publicToken = nanoid(24)
        const confirmToken = nanoid(24)
        const status = initialStatus(input.paymentMethod, quote.total, codDeposit)
        const isDeposit = status === 'awaiting_deposit'
        const depositPct = isDeposit ? codDeposit.pct : null
        const depositAmount = isDeposit ? codDepositAmount(quote.total, codDeposit.pct) : null
        const zoneId = quote.zone ? quote.zone.id : 'egypt'
        const productMap = new Map(products.map((p) => [p.id, p]))

        const orderItemsData = countableLines.map((line) => ({
          productId: line.productId,
          name: line.name,
          modelCode: line.modelCode,
          qty: line.qty,
          unitPrice: line.unitPrice,
          taxRate: productMap.get(line.productId)?.taxRate ?? 14,
        }))

        const created = await tx.order.create({
          data: {
            no,
            type: 'order',
            status,
            customerPhone: input.customer.phone,
            customerName: input.customer.name,
            governorate: input.customer.governorate,
            city: input.customer.city,
            zoneId,
            address: input.customer.address,
            notes: input.customer.notes ?? null,
            subtotal: quote.subtotal,
            discount: quote.discount,
            deliveryFee: quote.deliveryFee,
            total: quote.total,
            couponId: null,
            paymentMethod: input.paymentMethod,
            depositPct,
            depositAmount,
            paidAmount: 0,
            idempotencyKey: input.idempotencyKey,
            publicToken,
            confirmToken,
            items: { create: orderItemsData },
            events: {
              create: [{ status, note: 'إنشاء الطلب', userId: null }],
            },
          },
          select: ORDER_RESULT_SELECT,
        })

        return { order: created, isNew: true }
      })

      return {
        result: toCreateOrderResult(txResult.order),
        isNew: txResult.isNew,
      }
    } catch (err: unknown) {
      // A concurrent request with the same key won the insert: return its order.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: ORDER_RESULT_SELECT,
        })
        if (raced) {
          return { result: toCreateOrderResult(raced), isNew: false }
        }
      }
      throw err
    }
  }
}
