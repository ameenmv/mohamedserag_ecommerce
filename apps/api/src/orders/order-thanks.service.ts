import crypto from 'node:crypto'
import { Injectable, NotFoundException } from '@nestjs/common'
import {
  PAYMENT_METHOD_LABELS,
  type OrderThanks,
} from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'

@Injectable()
export class OrderThanksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: StoreSettingsService,
  ) {}

  /**
   * Secure thank-you lookup by order number and publicToken.
   * Constant-time comparison ensures token validation is safe against timing attacks.
   * Never returns customer phone, address, notes, city, or internal database IDs.
   */
  async getOrderThanks(no: string, token: string | undefined): Promise<OrderThanks> {
    const order = await this.prisma.order.findUnique({
      where: { no },
      include: {
        items: true,
      },
    })

    if (!order) {
      throw new NotFoundException('الطلب غير موجود')
    }

    if (!token || typeof token !== 'string' || token.length === 0) {
      throw new NotFoundException('الطلب غير موجود')
    }

    const tokenBuf = Buffer.from(token, 'utf8')
    const expectedBuf = Buffer.from(order.publicToken, 'utf8')
    const isMatch =
      tokenBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(tokenBuf, expectedBuf)

    if (!isMatch) {
      throw new NotFoundException('الطلب غير موجود')
    }

    const payments = await this.settingsService.getPayments()
    const methodSetting = payments.methods[order.paymentMethod]
    const payment = {
      name: methodSetting?.name ?? PAYMENT_METHOD_LABELS[order.paymentMethod],
      account: methodSetting?.account ?? null,
      hint: methodSetting?.hint ?? null,
    }

    const deposit =
      order.depositAmount !== null && order.depositAmount > 0
        ? {
            pct: order.depositPct ?? 0,
            amount: order.depositAmount,
          }
        : null

    const canConfirm =
      order.status === 'awaiting_payment' ||
      order.status === 'awaiting_deposit' ||
      order.status === 'payment_rejected'
    const confirmToken = canConfirm ? order.confirmToken : null

    const customerFirstName =
      order.customerName.trim().split(/\s+/)[0] ?? order.customerName

    const items = order.items.map((item) => ({
      name: item.name,
      modelCode: item.modelCode,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.qty * item.unitPrice,
    }))

    return {
      no: order.no,
      status: order.status,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      items,
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      deposit,
      payment,
      confirmToken,
      customerFirstName,
    }
  }
}
