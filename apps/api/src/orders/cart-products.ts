import {
  applyFlashToPrice,
  resolveShippingClass,
  type CartProductRecord,
  type ShippingClass,
} from '@serag/shared'
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
        shippingClass: true,
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

  const categoryChains = await loadCategoryChains(
    db,
    dbProducts.map((p) => p.categoryId),
  )

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
      shippingClass: resolveShippingClass(
        p.shippingClass,
        categoryChains.get(p.categoryId) ?? [],
      ),
    }
  })
}

interface CategoryRow {
  id: string
  parentId: string | null
  shippingClass: ShippingClass | null
}

/** Loads the category chain of each product, nearest category first. */
async function loadCategoryChains(
  db: PrismaService | Prisma.TransactionClient,
  categoryIds: string[],
): Promise<Map<string, ShippingClass[]>> {
  const rows = new Map<string, CategoryRow>()
  let pending = Array.from(new Set(categoryIds))

  while (pending.length > 0) {
    const batch = await db.category.findMany({
      where: { id: { in: pending } },
      select: { id: true, parentId: true, shippingClass: true },
    })

    const next: string[] = []
    for (const row of batch) {
      rows.set(row.id, row)
      if (row.parentId !== null && !rows.has(row.parentId)) {
        next.push(row.parentId)
      }
    }
    pending = Array.from(new Set(next))
  }

  const chains = new Map<string, ShippingClass[]>()
  for (const categoryId of categoryIds) {
    const chain: ShippingClass[] = []
    const visited = new Set<string>()
    let current: string | null = categoryId
    while (current !== null && !visited.has(current)) {
      visited.add(current)
      const row = rows.get(current)
      if (row === undefined) break
      if (row.shippingClass !== null) chain.push(row.shippingClass)
      current = row.parentId
    }
    chains.set(categoryId, chain)
  }

  return chains
}
