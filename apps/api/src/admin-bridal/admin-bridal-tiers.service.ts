import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  deriveAvailability,
  parseStoredRooms,
  type AdminBridalTier,
  type AdminBridalTierItem,
  type AdminBridalTierRoom,
  type BridalProductRecord,
  type BridalSettings,
  type BridalTierUpdateInput,
} from '@serag/shared'
import { roomsToJson } from '../bridal/bridal-json.js'
import { loadBridalProducts } from '../bridal/bridal-products.js'
import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'

@Injectable()
export class AdminBridalTiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: StoreSettingsService,
  ) {}

  private mapTierToAdmin(
    tier: {
      id: string
      slug: string
      name: string
      highlights: Prisma.JsonValue
      rooms: Prisma.JsonValue
    },
    productsMap: Map<string, BridalProductRecord>,
  ): AdminBridalTier {
    const rawRooms = parseStoredRooms(tier.rooms)
    const highlights = Array.isArray(tier.highlights)
      ? tier.highlights.filter((h): h is string => typeof h === 'string')
      : []

    let tierTotal = 0
    const mappedRooms: AdminBridalTierRoom[] = []

    for (const room of rawRooms) {
      const mappedItems: AdminBridalTierItem[] = []

      for (const item of room.items) {
        const product = productsMap.get(item.productId)
        if (!product) {
          mappedItems.push({
            productId: item.productId,
            name: '',
            modelCode: '',
            price: 0,
            qty: item.qty,
            flagged: true,
          })
          continue
        }

        const avail = deriveAvailability({
          mode: product.availabilityMode,
          stock: product.stock,
          lowStockThreshold: 0,
        })
        const available = product.purchasable && avail.orderable
        const flagged = !available

        mappedItems.push({
          productId: item.productId,
          name: product.name,
          modelCode: product.modelCode,
          price: product.price,
          qty: item.qty,
          flagged,
        })

        if (!flagged) {
          tierTotal += item.qty * product.price
        }
      }

      mappedRooms.push({
        key: room.key,
        items: mappedItems,
      })
    }

    return {
      id: tier.id,
      slug: tier.slug,
      name: tier.name,
      highlights,
      rooms: mappedRooms,
      total: tierTotal,
    }
  }

  /**
   * Lists all bridal tiers with resolved product details and availability flags.
   */
  async listTiers(): Promise<{ tiers: AdminBridalTier[] }> {
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
    const tiers = dbTiers.map((t) => this.mapTierToAdmin(t, productsMap))

    return { tiers }
  }

  /**
   * Updates tier name, highlights, and rooms. Unknown productIds produce 400.
   */
  async updateTier(
    id: string,
    input: BridalTierUpdateInput,
  ): Promise<AdminBridalTier> {
    const tier = await this.prisma.bridalTier.findUnique({
      where: { id },
    })

    if (!tier) {
      throw new NotFoundException('الباقة مش موجودة')
    }

    const productIds = Array.from(
      new Set(input.rooms.flatMap((r) => r.items.map((i) => i.productId))),
    )

    if (productIds.length > 0) {
      const existingProducts = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      })
      const existingSet = new Set(existingProducts.map((p) => p.id))
      const hasUnknown = productIds.some((pid) => !existingSet.has(pid))
      if (hasUnknown) {
        throw new BadRequestException('فيه منتج مش موجود')
      }
    }

    const updated = await this.prisma.bridalTier.update({
      where: { id },
      data: {
        name: input.name,
        highlights: input.highlights,
        rooms: roomsToJson(input.rooms),
      },
    })

    const productsMap = await loadBridalProducts(this.prisma, productIds)
    return this.mapTierToAdmin(updated, productsMap)
  }

  /**
   * Retrieves current bridal settings (depositPct, lockDays).
   */
  async getSettings(): Promise<BridalSettings> {
    return this.settingsService.getBridal()
  }

  /**
   * Saves updated bridal settings.
   */
  async updateSettings(input: BridalSettings): Promise<BridalSettings> {
    await this.prisma.setting.upsert({
      where: { key: 'bridal' },
      update: { value: input },
      create: { key: 'bridal', value: input },
    })
    return input
  }
}
