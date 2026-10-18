import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  defaultConfirmAmount,
  isPaymentAddable,
  isPaymentConfirmable,
  remainingAmount,
  type ConfirmPaymentInput,
  type OrderStockShortage,
  type RejectPaymentInput,
} from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { OrderStatusService } from './order-status.service.js'

@Injectable()
export class OrderPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStatusService: OrderStatusService,
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
  ): Promise<{ shortages: OrderStockShortage[] }> {
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

      if (isConfirmable) {
        return this.orderStatusService.transition(tx, {
          orderId,
          to: 'confirmed',
          userId,
          note: input.note ?? null,
        })
      }

      return { shortages: [] }
    })
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
