import { applyFlashToPrice, type CartProductRecord } from '@serag/shared'
import type { Prisma } from '../generated/prisma/client.js'
import type { PrismaService } from '../prisma/prisma.service.js'
import { activeFlashFor } from '../promotions/flash-pricing.service.js'

/**
 * Shared helper to load and map cart products from DB for quote and order creation.
 * Returns effective pricing taking into account active flash sales.
 */
export async function loadCartProducts(
  db: PrismaService | Prisma.TransactionClient,
  ids: string[],
  now: Date = new Date(),
): Promise<CartProductRecord[]> {
  const uniqueIds = Array.from(new Set(ids))
  if (uniqueIds.length === 0) {
    return []
  }

  const [dbProducts, flashes] = await Promise.all([
    db.product.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        slug: true,
        name: true,
        modelCode: true,
        price: true,
        oldPrice: true,
        categoryId: true,
        brandId: true,
        taxRate: true,
        stock: true,
        lowStockThreshold: true,
        availabilityMode: true,
        leadTimeText: true,
        visible: true,
        archivedAt: true,
        images: {
          orderBy: { sort: 'asc' },
          take: 1,
          select: { url: true },
        },
      },
    }),
    activeFlashFor(db, uniqueIds, now),
  ])

  return dbProducts.map((p) => {
    const flash = flashes.get(p.id) ?? null
    const pricing = applyFlashToPrice({ price: p.price, oldPrice: p.oldPrice }, flash)

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      modelCode: p.modelCode,
      price: pricing.price, // Effective price used by the quote
      oldPrice: pricing.oldPrice,
      categoryId: p.categoryId,
      brandId: p.brandId,
      taxRate: p.taxRate,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      availabilityMode: p.availabilityMode,
      leadTimeText: p.leadTimeText,
      imageUrl: p.images[0]?.url ?? null,
      purchasable: p.visible && p.archivedAt === null,
      flash,
    }
  })
}
