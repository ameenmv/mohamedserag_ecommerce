import type { BridalProductRecord } from '@serag/shared'
import type { Prisma } from '../generated/prisma/client.js'
import type { PrismaService } from '../prisma/prisma.service.js'

export async function loadBridalProducts(
  db: PrismaService | Prisma.TransactionClient,
  ids: string[],
): Promise<Map<string, BridalProductRecord>> {
  const uniqueIds = Array.from(new Set(ids))
  const map = new Map<string, BridalProductRecord>()
  if (uniqueIds.length === 0) {
    return map
  }

  const dbProducts = await db.product.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      slug: true,
      name: true,
      modelCode: true,
      price: true,
      stock: true,
      availabilityMode: true,
      leadTimeText: true,
      visible: true,
      archivedAt: true,
      taxRate: true,
      category: {
        select: { slug: true },
      },
      images: {
        orderBy: { sort: 'asc' },
        take: 1,
        select: { url: true },
      },
    },
  })

  for (const p of dbProducts) {
    map.set(p.id, {
      id: p.id,
      slug: p.slug,
      name: p.name,
      modelCode: p.modelCode,
      imageUrl: p.images[0]?.url ?? null,
      categorySlug: p.category.slug,
      price: p.price,
      stock: p.stock,
      availabilityMode: p.availabilityMode,
      leadTimeText: p.leadTimeText,
      purchasable: p.visible && p.archivedAt === null,
      taxRate: p.taxRate,
    })
  }

  return map
}
