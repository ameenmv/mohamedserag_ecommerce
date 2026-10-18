import { Injectable } from '@nestjs/common'
import type { OrderStockShortage } from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'

@Injectable()
export class OrderStockService {
  /**
   * Deducts stock upon entering 'confirmed'.
   * Locks product rows with SELECT ... FOR UPDATE in deterministic order to prevent stock race conditions.
   * Per item: taken = min(qty, current stock); writes a negative StockMovement (reason: order_confirmed).
   * Items without a productId are skipped.
   * Returns list of shortages where taken < requested.
   */
  async deductForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    userId?: string | null,
  ): Promise<{ shortages: OrderStockShortage[] }> {
    const items = await tx.orderItem.findMany({
      where: { orderId },
    })

    const shortages: OrderStockShortage[] = []
    const stockMap = new Map<string, number>()

    const validItems = items.filter(
      (item): item is typeof item & { productId: string } => Boolean(item.productId),
    )
    // Sort items by productId ascending to ensure deterministic row-lock order across concurrent transactions
    validItems.sort((a, b) => a.productId.localeCompare(b.productId))

    for (const item of validItems) {
      let currentStock: number
      if (stockMap.has(item.productId)) {
        currentStock = stockMap.get(item.productId) ?? 0
      } else {
        const rows = await tx.$queryRaw<Array<{ stock: number }>>`SELECT stock FROM products WHERE id = ${item.productId} FOR UPDATE`
        if (!rows || rows.length === 0 || rows[0] === undefined) continue
        currentStock = Math.max(0, rows[0].stock)
      }

      const taken = Math.min(item.qty, currentStock)
      stockMap.set(item.productId, currentStock - taken)

      if (taken > 0) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: taken } },
        })
      }

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          qty: -taken,
          reason: 'order_confirmed',
          orderId,
          userId: userId ?? null,
        },
      })

      if (taken < item.qty) {
        shortages.push({
          productId: item.productId,
          name: item.name,
          requested: item.qty,
          taken,
        })
      }
    }

    return { shortages }
  }

  /**
   * Restores deducted stock upon entering 'cancelled'.
   * For each product: restore = -SUM(order_confirmed) - SUM(order_cancelled).
   * Only restores what was actually deducted and not yet restored.
   */
  async restoreForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    userId?: string | null,
  ): Promise<void> {
    const movements = await tx.stockMovement.findMany({
      where: { orderId },
    })

    const productIds = Array.from(new Set(movements.map((m) => m.productId))).sort((a, b) =>
      a.localeCompare(b),
    )

    for (const productId of productIds) {
      const confirmed = movements
        .filter((m) => m.reason === 'order_confirmed' && m.productId === productId)
        .reduce((sum, m) => sum + m.qty, 0)
      const cancelled = movements
        .filter((m) => m.reason === 'order_cancelled' && m.productId === productId)
        .reduce((sum, m) => sum + m.qty, 0)

      const toRestore = -confirmed - cancelled
      if (toRestore > 0) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: toRestore } },
        })

        await tx.stockMovement.create({
          data: {
            productId,
            qty: toRestore,
            reason: 'order_cancelled',
            orderId,
            userId: userId ?? null,
          },
        })
      }
    }
  }
}
