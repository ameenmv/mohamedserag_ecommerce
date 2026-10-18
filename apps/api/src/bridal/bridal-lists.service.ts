import { randomBytes } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  deriveAvailability,
  normalizeRooms,
  parseStoredRooms,
  priceRooms,
  roomForCategory,
  type BridalAlternative,
  type BridalListView,
  type BridalRooms,
  type CreateBridalListInput,
} from '@serag/shared'
import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { loadBridalProducts } from './bridal-products.js'

@Injectable()
export class BridalListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateBridalListInput): Promise<{ editToken: string }> {
    const editToken = randomBytes(32).toString('base64url')
    const shareToken = randomBytes(32).toString('base64url')

    if (input.tierId) {
      const tier = await this.prisma.bridalTier.findFirst({
        where: {
          OR: [{ id: input.tierId }, { slug: input.tierId }],
        },
      })
      if (!tier) {
        throw new NotFoundException('الباقة مش موجودة')
      }

      const rooms = parseStoredRooms(tier.rooms)
      await this.prisma.bridalList.create({
        data: {
          editToken,
          shareToken,
          tierId: tier.id,
          rooms: rooms as unknown as Prisma.InputJsonValue,
          status: 'draft',
        },
      })

      return { editToken }
    }

    if (input.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: input.productId },
        include: { category: { select: { slug: true } } },
      })

      if (!product || !product.visible || product.archivedAt !== null) {
        throw new NotFoundException('المنتج مش موجود')
      }

      const roomKey = roomForCategory(product.category.slug)
      const rooms: BridalRooms = normalizeRooms([
        {
          key: roomKey,
          items: [{ productId: product.id, qty: 1 }],
        },
      ])

      await this.prisma.bridalList.create({
        data: {
          editToken,
          shareToken,
          rooms: rooms as unknown as Prisma.InputJsonValue,
          status: 'draft',
        },
      })

      return { editToken }
    }

    await this.prisma.bridalList.create({
      data: {
        editToken,
        shareToken,
        rooms: [] as unknown as Prisma.InputJsonValue,
        status: 'draft',
      },
    })

    return { editToken }
  }

  async getByToken(token: string): Promise<BridalListView> {
    const list = await this.prisma.bridalList.findFirst({
      where: {
        OR: [{ editToken: token }, { shareToken: token }],
      },
      include: {
        tier: true,
        order: {
          select: {
            no: true,
            status: true,
            bridalStatus: true,
            total: true,
            depositAmount: true,
            paidAmount: true,
            lockedUntil: true,
          },
        },
      },
    })

    if (!list) {
      throw new NotFoundException('القايمة دي مش موجودة')
    }

    const mode: 'edit' | 'view' = list.editToken === token ? 'edit' : 'view'
    const storedRooms = parseStoredRooms(list.rooms)
    const tierRooms = list.tier ? parseStoredRooms(list.tier.rooms) : []

    const listProductIds = storedRooms.flatMap((r) => r.items.map((i) => i.productId))
    const tierProductIds = tierRooms.flatMap((r) => r.items.map((i) => i.productId))
    const allProductIds = Array.from(new Set([...listProductIds, ...tierProductIds]))

    const productsMap = await loadBridalProducts(this.prisma, allProductIds)
    const pricedList = priceRooms(storedRooms, productsMap)
    const pricedTier = list.tier ? priceRooms(tierRooms, productsMap) : null

    const view: BridalListView = {
      mode,
      ...(mode === 'edit' ? { editToken: list.editToken } : {}),
      shareToken: list.shareToken,
      status: list.status,
      tier:
        list.tier && pricedTier
          ? {
              id: list.tier.id,
              name: list.tier.name,
              total: pricedTier.total,
            }
          : null,
      rooms: pricedList.rooms,
      itemCount: pricedList.itemCount,
      total: pricedList.total,
      issues: {
        unavailable: pricedList.unavailable,
      },
      reservation: list.order
        ? {
            no: list.order.no,
            status: list.order.status,
            bridalStatus: list.order.bridalStatus,
            total: list.order.total,
            depositAmount: list.order.depositAmount,
            paidAmount: list.order.paidAmount,
            lockedUntil: list.order.lockedUntil,
          }
        : null,
    }

    return view
  }

  async save(token: string, rooms: BridalRooms): Promise<BridalListView> {
    const list = await this.prisma.bridalList.findFirst({
      where: {
        OR: [{ editToken: token }, { shareToken: token }],
      },
    })

    if (!list) {
      throw new NotFoundException('القايمة دي مش موجودة')
    }

    if (list.shareToken === token && list.editToken !== token) {
      throw new ForbiddenException('اللينك ده للعرض بس')
    }

    if (list.status !== 'draft') {
      throw new ConflictException('القايمة اتحجزت ومينفعش تتعدل')
    }

    const uniqueIds = Array.from(new Set(rooms.flatMap((r) => r.items.map((i) => i.productId))))
    if (uniqueIds.length > 0) {
      const existingCount = await this.prisma.product.count({
        where: { id: { in: uniqueIds } },
      })
      if (existingCount !== uniqueIds.length) {
        throw new BadRequestException('فيه منتج مش موجود')
      }
    }

    const normalized = normalizeRooms(rooms)
    await this.prisma.bridalList.update({
      where: { id: list.id },
      data: {
        rooms: normalized as unknown as Prisma.InputJsonValue,
      },
    })

    return this.getByToken(list.editToken)
  }

  async alternatives(productId: string): Promise<{ items: BridalAlternative[] }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true },
    })

    if (!product) {
      throw new NotFoundException('المنتج مش موجود')
    }

    const candidates = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        visible: true,
        archivedAt: null,
      },
      orderBy: { price: 'asc' },
      take: 24,
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        stock: true,
        availabilityMode: true,
        images: {
          orderBy: { sort: 'asc' },
          take: 1,
          select: { url: true },
        },
      },
    })

    const items: BridalAlternative[] = candidates.map((p) => {
      const avail = deriveAvailability({
        mode: p.availabilityMode,
        stock: p.stock,
        lowStockThreshold: 0,
      })
      return {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        imageUrl: p.images[0]?.url ?? null,
        price: p.price,
        available: avail.orderable,
      }
    })

    return { items }
  }
}
