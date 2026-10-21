import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  type AdminCouponDeleteResponse,
  type AdminCouponListQueryOutput,
  type AdminCouponListResponse,
  type AdminCouponRow,
  couponStatus,
  type CouponInput,
} from '@serag/shared'
import { Prisma, type Coupon } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AdminCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminCouponListQueryOutput): Promise<AdminCouponListResponse> {
    const { page, pageSize, q } = query
    const skip = (page - 1) * pageSize

    const where: Prisma.CouponWhereInput = {}
    if (q && q.trim().length > 0) {
      where.code = { contains: q.trim().toUpperCase(), mode: 'insensitive' }
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.coupon.count({ where }),
    ])

    const statsMap = new Map<string, { activeUses: number; totalDiscount: number }>()

    if (coupons.length > 0) {
      const couponIds = coupons.map((c) => c.id)
      const aggregates = await this.prisma.couponRedemption.groupBy({
        by: ['couponId'],
        where: {
          couponId: { in: couponIds },
          status: 'active',
        },
        _count: { _all: true },
        _sum: { amount: true },
      })

      for (const agg of aggregates) {
        statsMap.set(agg.couponId, {
          activeUses: agg._count._all,
          totalDiscount: agg._sum.amount ?? 0,
        })
      }
    }

    const now = new Date()
    const items: AdminCouponRow[] = coupons.map((c) => {
      const stats = statsMap.get(c.id) ?? { activeUses: 0, totalDiscount: 0 }
      return this.toRow(c, stats.activeUses, stats.totalDiscount, now)
    })

    return {
      items,
      total,
      page,
      pageSize,
    }
  }

  async getById(id: string): Promise<AdminCouponRow> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    })

    if (!coupon) {
      throw new NotFoundException('الكوبون غير موجود')
    }

    const agg = await this.prisma.couponRedemption.aggregate({
      where: { couponId: id, status: 'active' },
      _count: { _all: true },
      _sum: { amount: true },
    })

    return this.toRow(coupon, agg._count._all ?? 0, agg._sum.amount ?? 0)
  }

  async create(body: CouponInput): Promise<AdminCouponRow> {
    await this.validateScopes(body.categoryIds, body.brandIds)

    const existing = await this.prisma.coupon.findUnique({
      where: { code: body.code },
    })
    if (existing) {
      throw new ConflictException({ message: 'الكود ده موجود بالفعل' })
    }

    try {
      const created = await this.prisma.coupon.create({
        data: {
          code: body.code,
          type: body.type,
          value: body.value,
          minOrder: body.minOrder,
          startsAt: body.startsAt ? new Date(body.startsAt) : null,
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
          maxUses: body.maxUses ?? null,
          maxUsesPerPhone: body.maxUsesPerPhone ?? null,
          categoryIds: body.categoryIds,
          brandIds: body.brandIds,
          active: body.active,
        },
      })

      return this.toRow(created, 0, 0)
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ message: 'الكود ده موجود بالفعل' })
      }
      throw err
    }
  }

  async update(id: string, body: CouponInput): Promise<AdminCouponRow> {
    const current = await this.prisma.coupon.findUnique({ where: { id } })
    if (!current) {
      throw new NotFoundException('الكوبون غير موجود')
    }

    await this.validateScopes(body.categoryIds, body.brandIds)

    if (body.code !== current.code) {
      const existing = await this.prisma.coupon.findUnique({
        where: { code: body.code },
      })
      if (existing) {
        throw new ConflictException({ message: 'الكود ده موجود بالفعل' })
      }
    }

    try {
      const updated = await this.prisma.coupon.update({
        where: { id },
        data: {
          code: body.code,
          type: body.type,
          value: body.value,
          minOrder: body.minOrder,
          startsAt: body.startsAt ? new Date(body.startsAt) : null,
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
          maxUses: body.maxUses ?? null,
          maxUsesPerPhone: body.maxUsesPerPhone ?? null,
          categoryIds: body.categoryIds,
          brandIds: body.brandIds,
          active: body.active,
        },
      })

      const agg = await this.prisma.couponRedemption.aggregate({
        where: { couponId: id, status: 'active' },
        _count: { _all: true },
        _sum: { amount: true },
      })

      return this.toRow(updated, agg._count._all ?? 0, agg._sum.amount ?? 0)
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ message: 'الكود ده موجود بالفعل' })
      }
      throw err
    }
  }

  async delete(id: string): Promise<AdminCouponDeleteResponse> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } })
    if (!coupon) {
      throw new NotFoundException('الكوبون غير موجود')
    }

    const redemptionCount = await this.prisma.couponRedemption.count({
      where: { couponId: id },
    })

    if (redemptionCount > 0) {
      await this.prisma.coupon.update({
        where: { id },
        data: { active: false },
      })
      return { deactivated: true }
    }

    await this.prisma.coupon.delete({ where: { id } })
    return { deleted: true }
  }

  private async validateScopes(categoryIds: string[], brandIds: string[]): Promise<void> {
    const uniqueCategoryIds = Array.from(new Set(categoryIds))
    if (uniqueCategoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds } },
        select: { id: true },
      })
      if (categories.length !== uniqueCategoryIds.length) {
        const found = new Set(categories.map((c) => c.id))
        const missing = uniqueCategoryIds.filter((id) => !found.has(id))
        throw new BadRequestException(`فئات غير موجودة: ${missing.join(', ')}`)
      }
    }

    const uniqueBrandIds = Array.from(new Set(brandIds))
    if (uniqueBrandIds.length > 0) {
      const brands = await this.prisma.brand.findMany({
        where: { id: { in: uniqueBrandIds } },
        select: { id: true },
      })
      if (brands.length !== uniqueBrandIds.length) {
        const found = new Set(brands.map((b) => b.id))
        const missing = uniqueBrandIds.filter((id) => !found.has(id))
        throw new BadRequestException(`ماركات غير موجودة: ${missing.join(', ')}`)
      }
    }
  }

  private toRow(
    c: Coupon,
    activeUses: number,
    totalDiscount: number,
    now = new Date(),
  ): AdminCouponRow {
    return {
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder,
      startsAt: c.startsAt ? c.startsAt.toISOString() : null,
      endsAt: c.endsAt ? c.endsAt.toISOString() : null,
      maxUses: c.maxUses,
      maxUsesPerPhone: c.maxUsesPerPhone,
      categoryIds: c.categoryIds,
      brandIds: c.brandIds,
      active: c.active,
      status: couponStatus(c, now),
      activeUses,
      totalDiscount,
    }
  }
}
