import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  bridalDeposit,
  cairoEndOfDay,
  cairoToday,
  DEFAULT_TEMPLATES,
  formatEgpWithUnit,
  lockEndDate,
  lockState,
  renderTemplate,
  waLink,
  type BridalDeliveryDateInput,
  type BridalExpiringItem,
  type BridalLockExtendInput,
  type BridalRepriceResult,
  type OrderStockShortage,
} from '@serag/shared'
import { OrderStockService } from '../admin-orders/order-stock.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'

@Injectable()
export class BridalReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStockService: OrderStockService,
    private readonly settingsService: StoreSettingsService,
  ) {}

  /**
   * Sets the agreed delivery date on a locked bridal reservation.
   * Deducts inventory stock with reason 'bridal_delivery_agreed' in a concurrency-safe transaction.
   * Double submissions receive 409 Conflict.
   */
  async agreeDeliveryDate(
    orderId: string,
    input: BridalDeliveryDateInput,
    userId?: string | null,
  ): Promise<{ shortages: OrderStockShortage[] }> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          type: true,
          status: true,
          bridalStatus: true,
          bridalListId: true,
        },
      })

      if (!order) {
        throw new NotFoundException('الطلب مش موجود')
      }

      if (
        order.type !== 'bridal' ||
        order.status !== 'confirmed' ||
        order.bridalStatus !== 'locked'
      ) {
        throw new ConflictException('مينفعش تحديد ميعاد التوصيل دلوقتي')
      }

      const deliveryDateUtc = new Date(`${input.date}T12:00:00.000Z`)

      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          bridalStatus: 'locked',
        },
        data: {
          agreedDeliveryDate: deliveryDateUtc,
          bridalStatus: 'delivery_agreed',
        },
      })

      if (updated.count === 0) {
        throw new ConflictException('الطلب اتحدث، حدّث الصفحة')
      }

      if (order.bridalListId) {
        await tx.bridalList.update({
          where: { id: order.bridalListId },
          data: { status: 'delivery_agreed' },
        })
      }

      await tx.orderEvent.create({
        data: {
          orderId,
          status: 'bridal_delivery_agreed',
          note: input.date,
          userId: userId ?? null,
        },
      })

      const { shortages } = await this.orderStockService.deductForOrder(
        tx,
        orderId,
        userId,
        'bridal_delivery_agreed',
      )

      return { shortages }
    })
  }

  /**
   * Extends price lock end date to the end of the specified Cairo day.
   */
  async extendLock(
    orderId: string,
    input: BridalLockExtendInput,
    userId?: string | null,
  ): Promise<{ lockedUntil: Date }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, type: true, status: true, bridalStatus: true },
    })

    if (!order) {
      throw new NotFoundException('الطلب مش موجود')
    }

    if (
      order.type !== 'bridal' ||
      order.status !== 'confirmed' ||
      order.bridalStatus !== 'locked'
    ) {
      throw new ConflictException('مينفعش تمديد التثبيت للطلب ده')
    }

    const newLockedUntil = cairoEndOfDay(input.until)

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { lockedUntil: newLockedUntil },
      })

      await tx.orderEvent.create({
        data: {
          orderId,
          status: 'bridal_lock_extended',
          note: input.until,
          userId: userId ?? null,
        },
      })
    })

    return { lockedUntil: newLockedUntil }
  }

  /**
   * Re-prices every line item on a locked bridal reservation to its current catalog regular price.
   * Computes new totals and deposit requirement, extends the lock for a full period from today,
   * and creates a prefilled WhatsApp update message link for the customer.
   */
  async reprice(
    orderId: string,
    userId?: string | null,
  ): Promise<BridalRepriceResult> {
    const settings = await this.settingsService.getBridal()
    const templates = await this.settingsService.getTemplates()

    const { oldTotal, newTotal, difference, newLockedUntil, customerName, orderNo, customerPhone } =
      await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        })

        if (!order) {
          throw new NotFoundException('الطلب مش موجود')
        }

        if (
          order.type !== 'bridal' ||
          order.status !== 'confirmed' ||
          order.bridalStatus !== 'locked'
        ) {
          throw new ConflictException('مينفعش إعادة تسعير الطلب ده')
        }

        const productIds = order.items
          .map((it) => it.productId)
          .filter((id): id is string => Boolean(id))

        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, price: true },
        })

        const priceMap = new Map<string, number>()
        for (const p of products) {
          priceMap.set(p.id, p.price)
        }

        let newSubtotal = 0
        for (const item of order.items) {
          const currentPrice = item.productId
            ? (priceMap.get(item.productId) ?? item.unitPrice)
            : item.unitPrice

          if (currentPrice !== item.unitPrice) {
            await tx.orderItem.update({
              where: { id: item.id },
              data: { unitPrice: currentPrice },
            })
          }
          newSubtotal += item.qty * currentPrice
        }

        const oldTotal = order.total
        const newTotal = newSubtotal + order.deliveryFee
        const difference = newTotal - oldTotal

        const depositPct = order.depositPct ?? settings.depositPct
        const newDepositAmount = bridalDeposit(newTotal, depositPct)

        const lockDays = order.lockDays ?? settings.lockDays
        const now = new Date()
        const newLockedUntil = lockEndDate(now, lockDays)

        await tx.order.update({
          where: { id: orderId },
          data: {
            subtotal: newSubtotal,
            total: newTotal,
            depositAmount: newDepositAmount,
            lockedUntil: newLockedUntil,
          },
        })

        await tx.orderEvent.create({
          data: {
            orderId,
            status: 'bridal_repriced',
            note: `${oldTotal} → ${newTotal}`,
            userId: userId ?? null,
          },
        })

        return {
          oldTotal,
          newTotal,
          difference,
          newLockedUntil,
          customerName: order.customerName,
          orderNo: order.no,
          customerPhone: order.customerPhone,
        }
      })

    const template = templates.bridal_repriced ?? DEFAULT_TEMPLATES.bridal_repriced
    const text = renderTemplate(template, {
      customerName,
      orderNo,
      oldTotal: formatEgpWithUnit(oldTotal),
      newTotal: formatEgpWithUnit(newTotal),
      lockedUntil: cairoToday(newLockedUntil),
    })
    const whatsappUrl = waLink(customerPhone, text)

    return {
      oldTotal,
      newTotal,
      difference,
      lockedUntil: newLockedUntil,
      whatsappUrl,
    }
  }

  /**
   * Retrieves bridal reservations whose price lock ends within 7 Cairo days or has already expired.
   */
  async getExpiringReservations(): Promise<{ items: BridalExpiringItem[] }> {
    const now = new Date()
    const endOf7Days = lockEndDate(now, 7)

    const orders = await this.prisma.order.findMany({
      where: {
        type: 'bridal',
        status: 'confirmed',
        bridalStatus: 'locked',
        lockedUntil: {
          not: null,
          lte: endOf7Days,
        },
      },
      orderBy: {
        lockedUntil: 'asc',
      },
      take: 50,
      select: {
        id: true,
        no: true,
        customerName: true,
        lockedUntil: true,
        bridalStatus: true,
      },
    })

    const items: BridalExpiringItem[] = orders.map((o) => {
      const state = lockState(
        { bridalStatus: o.bridalStatus, lockedUntil: o.lockedUntil },
        now,
      )
      return {
        id: o.id,
        no: o.no,
        customerName: o.customerName,
        lockedUntil: o.lockedUntil!,
        lockDaysLeft: state.daysLeft,
        lockExpired: state.expired,
      }
    })

    return { items }
  }
}
