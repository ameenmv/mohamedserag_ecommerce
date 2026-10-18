import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { canTransition, type OrderStatus, type OrderStockShortage } from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { OrderStockService } from './order-stock.service.js'

export interface TransitionParams {
  orderId: string
  to: OrderStatus
  userId?: string | null
  note?: string | null
}

@Injectable()
export class OrderStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStockService: OrderStockService,
  ) {}

  /**
   * Performs an atomic, conditionally checked status transition on an order.
   * Concurrency-safe: updateMany ensures winner proceeds and loser gets 409.
   */
  async transition(
    tx: Prisma.TransactionClient,
    params: TransitionParams,
  ): Promise<{ shortages: OrderStockShortage[] }> {
    const order = await tx.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, status: true, type: true, bridalListId: true, bridalStatus: true },
    })

    if (!order) {
      throw new NotFoundException('الطلب مش موجود')
    }

    const current = order.status
    if (!canTransition(current, params.to)) {
      throw new ConflictException('الحالة دي مش مسموحة للطلب ده')
    }

    if (order.type === 'bridal' && params.to === 'out_for_delivery') {
      if (order.bridalStatus !== 'delivery_agreed') {
        throw new ConflictException('لازم تحدد ميعاد التوصيل الأول')
      }
    }

    const updated = await tx.order.updateMany({
      where: { id: params.orderId, status: current },
      data: { status: params.to },
    })

    if (updated.count === 0) {
      throw new ConflictException('الطلب اتحدث، حدّث الصفحة')
    }

    await tx.orderEvent.create({
      data: {
        orderId: params.orderId,
        status: params.to,
        note: params.note ?? null,
        userId: params.userId ?? null,
      },
    })

    if (order.type === 'bridal') {
      if (params.to === 'cancelled' || params.to === 'delivered') {
        await tx.order.update({
          where: { id: params.orderId },
          data: { bridalStatus: params.to },
        })
        if (order.bridalListId) {
          await tx.bridalList.update({
            where: { id: order.bridalListId },
            data: { status: params.to },
          })
        }
      }
    }

    if (params.to === 'confirmed') {
      if (order.type === 'bridal') {
        return { shortages: [] }
      }
      return this.orderStockService.deductForOrder(tx, params.orderId, params.userId)
    }

    if (params.to === 'cancelled') {
      await this.orderStockService.restoreForOrder(tx, params.orderId, params.userId)
      return { shortages: [] }
    }

    return { shortages: [] }
  }

  /**
   * Convenience wrapper that executes a transition in its own transaction.
   */
  async transitionOrder(params: TransitionParams): Promise<{ shortages: OrderStockShortage[] }> {
    return this.prisma.$transaction(async (tx) => {
      return this.transition(tx, params)
    })
  }
}
