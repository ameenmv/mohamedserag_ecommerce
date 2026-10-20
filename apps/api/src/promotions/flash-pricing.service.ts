import { Injectable } from '@nestjs/common'
import type { ProductFlash } from '@serag/shared'
import type { Prisma } from '../generated/prisma/client.js'
import type { PrismaService } from '../prisma/prisma.service.js'

/**
 * Returns a map of productId -> ProductFlash for currently active flash sales.
 * If a product appears in multiple active flash sales, the lowest salePrice is used.
 */
export async function activeFlashFor(
  db: PrismaService | Prisma.TransactionClient,
  productIds: string[],
  now: Date = new Date(),
): Promise<Map<string, ProductFlash>> {
  const uniqueIds = Array.from(new Set(productIds))
  if (uniqueIds.length === 0) {
    return new Map()
  }

  const items = await db.flashSaleItem.findMany({
    where: {
      productId: { in: uniqueIds },
      flashSale: {
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
    },
    select: {
      productId: true,
      salePrice: true,
      flashSale: {
        select: { endsAt: true },
      },
    },
  })

  const map = new Map<string, ProductFlash>()
  for (const item of items) {
    const existing = map.get(item.productId)
    if (!existing || item.salePrice < existing.salePrice) {
      map.set(item.productId, {
        salePrice: item.salePrice,
        endsAt: item.flashSale.endsAt.toISOString(),
      })
    }
  }

  return map
}

@Injectable()
export class FlashPricingService {
  async activeFlashFor(
    db: PrismaService | Prisma.TransactionClient,
    productIds: string[],
    now: Date = new Date(),
  ): Promise<Map<string, ProductFlash>> {
    return activeFlashFor(db, productIds, now)
  }
}
