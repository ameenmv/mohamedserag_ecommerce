import { Injectable } from '@nestjs/common'
import type { OffersResponse, ProductCard } from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { toProductCard } from '../catalog/product-query.js'

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOffers(now: Date = new Date()): Promise<OffersResponse> {
    // 1. Running flash sales ordered by endsAt asc
    const runningSales = await this.prisma.flashSale.findMany({
      where: {
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { endsAt: 'asc' },
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: { select: { slug: true, name: true, visible: true } },
                category: { select: { slug: true, name: true, visible: true } },
                images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
              },
            },
          },
        },
      },
    })

    const flashGroups: OffersResponse['flash'] = []
    const runningProductIds = new Set<string>()

    for (const sale of runningSales) {
      const endsAtIso = sale.endsAt.toISOString()
      const visibleProducts: ProductCard[] = []

      for (const item of sale.items) {
        const p = item.product
        if (
          p.visible &&
          p.archivedAt === null &&
          p.brand.visible &&
          p.category.visible
        ) {
          runningProductIds.add(p.id)
          visibleProducts.push(
            toProductCard(p, {
              salePrice: item.salePrice,
              endsAt: endsAtIso,
            }),
          )
        }
      }

      if (visibleProducts.length > 0) {
        flashGroups.push({
          id: sale.id,
          name: sale.name,
          endsAt: endsAtIso,
          products: visibleProducts,
        })
      }
    }

    // 2. Discounted products: visible, non-archived, oldPrice > price, NOT on an active sale, ordered by discount desc, max 24
    const runningIdsArray = Array.from(runningProductIds)
    const excludeRunningSql =
      runningIdsArray.length > 0
        ? Prisma.sql`AND p.id NOT IN (${Prisma.join(runningIdsArray.map((id) => Prisma.sql`${id}`))})`
        : Prisma.empty

    const discountedRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.visible = true
        AND p.archived_at IS NULL
        AND b.visible = true
        AND c.visible = true
        AND p.old_price IS NOT NULL
        AND p.old_price > p.price
        ${excludeRunningSql}
      ORDER BY ((p.old_price - p.price)::float / p.old_price) DESC, p.created_at DESC
      LIMIT 24
    `

    const discountedIds = discountedRows.map((r) => r.id)
    let discounted: ProductCard[] = []

    if (discountedIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: discountedIds } },
        include: {
          brand: { select: { slug: true, name: true } },
          category: { select: { slug: true, name: true } },
          images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
        },
      })

      const productMap = new Map(products.map((p) => [p.id, p]))
      discounted = discountedIds
        .map((id) => productMap.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map((p) => toProductCard(p, null))
    }

    return {
      flash: flashGroups,
      discounted,
    }
  }
}
