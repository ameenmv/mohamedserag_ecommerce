import type { CartProductRecord } from '@serag/shared'
import type { Prisma } from '../generated/prisma/client.js'
import type { PrismaService } from '../prisma/prisma.service.js'

/**
 * Shared helper to load and map cart products from DB for quote and order creation.
 */
export async function loadCartProducts(
  db: PrismaService | Prisma.TransactionClient,
  ids: string[],
): Promise<CartProductRecord[]> {
  const uniqueIds = Array.from(new Set(ids))
  if (uniqueIds.length === 0) {
    return []
  }

  const dbProducts = await db.product.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      slug: true,
      name: true,
      modelCode: true,
      price: true,
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
  })

  return dbProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    modelCode: p.modelCode,
    price: p.price,
    taxRate: p.taxRate,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    availabilityMode: p.availabilityMode,
    leadTimeText: p.leadTimeText,
    imageUrl: p.images[0]?.url ?? null,
    purchasable: p.visible && p.archivedAt === null,
  }))
}
