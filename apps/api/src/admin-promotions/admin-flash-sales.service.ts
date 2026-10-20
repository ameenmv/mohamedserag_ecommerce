import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  type AdminFlashSaleDetail,
  type AdminFlashSaleItem,
  type AdminFlashSaleListQueryOutput,
  type AdminFlashSaleListResponse,
  type AdminFlashSaleRow,
  flashStatus,
  type FlashSaleInput,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const flashSaleWithItemsInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          modelCode: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.FlashSaleInclude

type FlashSaleWithItems = Prisma.FlashSaleGetPayload<{
  include: typeof flashSaleWithItemsInclude
}>

@Injectable()
export class AdminFlashSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminFlashSaleListQueryOutput): Promise<AdminFlashSaleListResponse> {
    const { page, pageSize, q } = query
    const skip = (page - 1) * pageSize

    const where: Prisma.FlashSaleWhereInput = {}
    if (q && q.trim().length > 0) {
      where.name = { contains: q.trim(), mode: 'insensitive' }
    }

    const [sales, total] = await Promise.all([
      this.prisma.flashSale.findMany({
        where,
        orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        include: {
          _count: { select: { items: true } },
        },
      }),
      this.prisma.flashSale.count({ where }),
    ])

    const now = new Date()
    const items: AdminFlashSaleRow[] = sales.map((sale) => ({
      id: sale.id,
      name: sale.name,
      startsAt: sale.startsAt.toISOString(),
      endsAt: sale.endsAt.toISOString(),
      status: flashStatus({ startsAt: sale.startsAt, endsAt: sale.endsAt }, now),
      itemCount: sale._count.items,
    }))

    return {
      items,
      total,
      page,
      pageSize,
    }
  }

  async getById(id: string): Promise<AdminFlashSaleDetail> {
    const sale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: flashSaleWithItemsInclude,
    })

    if (!sale) {
      throw new NotFoundException('العرض غير موجود')
    }

    return this.toDetail(sale)
  }

  async create(body: FlashSaleInput): Promise<AdminFlashSaleDetail> {
    return this.prisma.$transaction(async (tx) => {
      await this.validateSaleInput(tx, body)

      const created = await tx.flashSale.create({
        data: {
          name: body.name,
          startsAt: new Date(body.startsAt),
          endsAt: new Date(body.endsAt),
          items: {
            create: body.items.map((i) => ({
              productId: i.productId,
              salePrice: i.salePrice,
            })),
          },
        },
        include: flashSaleWithItemsInclude,
      })

      return this.toDetail(created)
    })
  }

  async update(id: string, body: FlashSaleInput): Promise<AdminFlashSaleDetail> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.flashSale.findUnique({ where: { id } })
      if (!existing) {
        throw new NotFoundException('العرض غير موجود')
      }

      await this.validateSaleInput(tx, body, id)

      await tx.flashSaleItem.deleteMany({ where: { flashSaleId: id } })

      const updated = await tx.flashSale.update({
        where: { id },
        data: {
          name: body.name,
          startsAt: new Date(body.startsAt),
          endsAt: new Date(body.endsAt),
          items: {
            create: body.items.map((i) => ({
              productId: i.productId,
              salePrice: i.salePrice,
            })),
          },
        },
        include: flashSaleWithItemsInclude,
      })

      return this.toDetail(updated)
    })
  }

  async end(id: string): Promise<AdminFlashSaleDetail> {
    const sale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: flashSaleWithItemsInclude,
    })

    if (!sale) {
      throw new NotFoundException('العرض غير موجود')
    }

    const now = new Date()
    const status = flashStatus({ startsAt: sale.startsAt, endsAt: sale.endsAt }, now)
    if (status === 'scheduled') {
      throw new ConflictException('العرض لسه مبدأش — احذفه بدل ما تنهيه')
    }
    if (status === 'ended') {
      throw new ConflictException('العرض خلص بالفعل')
    }

    const updated = await this.prisma.flashSale.update({
      where: { id },
      data: { endsAt: now },
      include: flashSaleWithItemsInclude,
    })

    return this.toDetail(updated, now)
  }

  async delete(id: string): Promise<void> {
    const sale = await this.prisma.flashSale.findUnique({ where: { id } })
    if (!sale) {
      throw new NotFoundException('العرض غير موجود')
    }

    await this.prisma.flashSale.delete({ where: { id } })
  }

  private async validateSaleInput(
    tx: Prisma.TransactionClient,
    body: FlashSaleInput,
    excludeSaleId?: string,
  ): Promise<void> {
    const productIds = body.items.map((i) => i.productId)

    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        modelCode: true,
        price: true,
        archivedAt: true,
      },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of body.items) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new BadRequestException(`المنتج غير موجود: ${item.productId}`)
      }
      if (product.archivedAt !== null) {
        throw new BadRequestException(`المنتج مؤرشف ولا يمكن إضافته للعرض: ${product.name}`)
      }
      if (item.salePrice >= product.price) {
        throw new BadRequestException(`سعر العرض لازم يكون أقل من السعر الأصلي: ${product.name}`)
      }
    }

    const newStartsAt = new Date(body.startsAt)
    const newEndsAt = new Date(body.endsAt)

    const overlappingItems = await tx.flashSaleItem.findMany({
      where: {
        productId: { in: productIds },
        ...(excludeSaleId ? { flashSaleId: { not: excludeSaleId } } : {}),
        flashSale: {
          startsAt: { lt: newEndsAt },
          endsAt: { gt: newStartsAt },
        },
      },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    })

    if (overlappingItems.length > 0) {
      const uniqueProductsMap = new Map<string, { id: string; name: string }>()
      for (const item of overlappingItems) {
        uniqueProductsMap.set(item.product.id, {
          id: item.product.id,
          name: item.product.name,
        })
      }
      const productList = Array.from(uniqueProductsMap.values())
      const names = productList.map((p) => p.name).join('، ')
      throw new ConflictException({
        code: 'OVERLAP',
        message: `المنتجات دي في عرض تاني في نفس الوقت: ${names}`,
        products: productList,
      })
    }
  }

  private toDetail(sale: FlashSaleWithItems, now = new Date()): AdminFlashSaleDetail {
    const items: AdminFlashSaleItem[] = sale.items.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      modelCode: item.product.modelCode,
      regularPrice: item.product.price,
      salePrice: item.salePrice,
    }))

    return {
      id: sale.id,
      name: sale.name,
      startsAt: sale.startsAt.toISOString(),
      endsAt: sale.endsAt.toISOString(),
      status: flashStatus({ startsAt: sale.startsAt, endsAt: sale.endsAt }, now),
      itemCount: sale.items.length,
      items,
    }
  }
}
