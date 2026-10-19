import { Injectable } from '@nestjs/common'
import {
  parseStoredRooms,
  priceRooms,
  type BridalTierSummary,
} from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { loadBridalProducts } from './bridal-products.js'

@Injectable()
export class BridalTiersService {
  constructor(private readonly prisma: PrismaService) {}

  async listTiers(): Promise<{ tiers: BridalTierSummary[] }> {
    const dbTiers = await this.prisma.bridalTier.findMany({
      orderBy: { sort: 'asc' },
    })

    const parsedTiers = dbTiers.map((t) => ({
      tier: t,
      rooms: parseStoredRooms(t.rooms),
    }))

    const allProductIds = Array.from(
      new Set(
        parsedTiers.flatMap((pt) =>
          pt.rooms.flatMap((r) => r.items.map((i) => i.productId)),
        ),
      ),
    )

    const productsMap = await loadBridalProducts(this.prisma, allProductIds)

    const tiers: BridalTierSummary[] = parsedTiers.map(({ tier, rooms }) => {
      const priced = priceRooms(rooms, productsMap)
      const availableItems = priced.rooms.flatMap((r) =>
        r.items.filter((i) => i.available),
      )
      const roomCount = priced.rooms.filter((r) =>
        r.items.some((i) => i.available),
      ).length
      const itemCount = availableItems.reduce((sum, i) => sum + i.qty, 0)
      const highlights = Array.isArray(tier.highlights)
        ? tier.highlights.filter((h): h is string => typeof h === 'string')
        : []

      return {
        id: tier.id,
        slug: tier.slug,
        name: tier.name,
        highlights,
        roomCount,
        itemCount,
        total: priced.total,
      }
    })

    return { tiers }
  }
}
