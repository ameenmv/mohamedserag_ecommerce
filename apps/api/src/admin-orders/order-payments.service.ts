import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  cairoToday,
  defaultConfirmAmount,
  isPaymentAddable,
  isPaymentConfirmable,
  lockEndDate,
  reachesDeposit,
  remainingAmount,
  type ConfirmPaymentInput,
  type OrderStockShortage,
  type RejectPaymentInput,
} from '@serag/shared'
import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'
import { OrderStatusService } from './order-status.service.js'

export interface ConfirmPaymentResult {
  shortages: OrderStockShortage[]
  deposit?: {
    paid: number
    required: number
    remaining: number
  }
  locked?: {
    lockedUntil: Date
  } | null
}

@Injectable()
export class OrderPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStatusService: OrderStatusService,
    private readonly settingsService: StoreSettingsService,
  ) {}

  /**
   * Confirms payment for an order within a single transaction.
   * Concurrency guarantee: Guarded conditional updateMany prevents race overpayments;
   * order transitions prevent duplicate initial confirmations.
   */
  async confirm(
    orderId: string,
    input: ConfirmPaymentInput,
    userId?: string | null,
  ): Promise<ConfirmPaymentResult> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      })

      if (!order) {
        throw new NotFoundException('الطلب مش موجود')
      }

      const isConfirmable = isPaymentConfirmable(order.status)
      const isAddable = isPaymentAddable(order.status)

      if (!isConfirmable && !isAddable) {
        throw new ConflictException('مينفعش تأكيد دفع للطلب ده دلوقتي')
      }

      const remaining = remainingAmount(order)
      // Nothing left to pay is a state conflict (e.g. a second confirm that read the order after a
      // parallel one committed), not a bad amount: answer 409 like the conditional update below.
      if (remaining === 0) {
        throw new ConflictException('الطلب اتدفع بالكامل، حدّث الصفحة')
      }
      if (input.amount > remaining) {
        throw new BadRequestException('المبلغ أكبر من الباقي')
      }

      // Guard: conditional update on paidAmount prevents concurrent payments exceeding total
      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          status: order.status,
          paidAmount: { lte: order.total - input.amount },
        },
        data: {
          paidAmount: { increment: input.amount },
        },
      })

      if (updated.count === 0) {
        throw new ConflictException('الطلب اتحدث، حدّث الصفحة')
      }

      // Record confirmed payment
      await tx.payment.create({
        data: {
          orderId,
          method: order.paymentMethod,
          amount: input.amount,
          status: 'confirmed',
          userId: userId ?? null,
        },
      })

      const eventNote = input.note ? `payment_confirmed: ${input.note}` : 'payment_confirmed'
      await tx.orderEvent.create({
        data: {
          orderId,
          status: 'payment_confirmed',
          note: eventNote,
          userId: userId ?? null,
        },
      })

      let shortages: OrderStockShortage[] = []
      let locked: { lockedUntil: Date } | null = null

      const isDepositOrder =
        order.depositAmount !== null &&
        order.depositAmount > 0 &&
        (order.status === 'awaiting_deposit' ||
          (order.status === 'payment_rejected' && order.paidAmount < order.depositAmount))

      if (isDepositOrder) {
        if (!reachesDeposit(order, input.amount)) {
          if (order.status === 'payment_rejected') {
            await this.orderStatusService.transition(tx, {
              orderId,
              to: 'awaiting_deposit',
              userId,
              note: input.note ?? null,
            })
          }
        } else {
          const res = await this.orderStatusService.transition(tx, {
            orderId,
            to: 'confirmed',
            userId,
            note: input.note ?? null,
          })
          shortages = res.shortages

          if (order.type === 'bridal') {
            locked = await this.startBridalLock(tx, order, userId)
          }
        }
      } else if (isConfirmable) {
        const res = await this.orderStatusService.transition(tx, {
          orderId,
          to: 'confirmed',
          userId,
          note: input.note ?? null,
        })
        shortages = res.shortages

        if (order.type === 'bridal') {
          locked = await this.startBridalLock(tx, order, userId)
        }
      }

      const newPaidAmount = order.paidAmount + input.amount
      const deposit =
        order.depositAmount !== null && order.depositAmount > 0
          ? {
              paid: newPaidAmount,
              required: order.depositAmount,
              remaining: Math.max(0, order.depositAmount - newPaidAmount),
            }
          : undefined

      return {
        shortages,
        deposit,
        locked,
      }
    })
  }

  /**
   * Starts the bridal price lock once the deposit is fully paid (same transaction as the payment):
   * lock end = end of day (Cairo) of today + the lock days stored on the reservation.
   */
  private async startBridalLock(
    tx: Prisma.TransactionClient,
    order: { id: string; lockDays: number | null; bridalListId: string | null },
    userId?: string | null,
  ): Promise<{ lockedUntil: Date }> {
    const days = order.lockDays ?? (await this.settingsService.getBridal()).lockDays
    const lockedUntil = lockEndDate(new Date(), days)

    await tx.order.update({
      where: { id: order.id },
      data: { bridalStatus: 'locked', lockedUntil },
    })

    if (order.bridalListId) {
      await tx.bridalList.update({
        where: { id: order.bridalListId },
        data: { status: 'locked' },
      })
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: 'bridal_locked',
        note: cairoToday(lockedUntil),
        userId: userId ?? null,
      },
    })

    return { lockedUntil }
  }

  /**
   * Rejects payment for an order within a single transaction.
   */
  async reject(
    orderId: string,
    input: RejectPaymentInput,
    userId?: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      })

      if (!order) {
        throw new NotFoundException('الطلب مش موجود')
      }

      if (order.status !== 'awaiting_payment' && order.status !== 'awaiting_deposit') {
        throw new ConflictException('مينفعش رفض الدفع للطلب ده دلوقتي')
      }

      const amount = defaultConfirmAmount(order)

      await tx.payment.create({
        data: {
          orderId,
          method: order.paymentMethod,
          amount,
          status: 'rejected',
          rejectReason: input.reason,
          userId: userId ?? null,
        },
      })

      await this.orderStatusService.transition(tx, {
        orderId,
        to: 'payment_rejected',
        userId,
        note: input.reason,
      })
    })
  }
}
