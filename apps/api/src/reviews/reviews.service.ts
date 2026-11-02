import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
  summarizeRatings,
  type PublicReview,
  type PublicReviewListResponse,
  type ReviewInput,
  type StoreReviewsResponse,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks whether the normalized phone number has at least one delivered order containing the product.
   * Reused by the moderation queue at review approval time.
   */
  async isVerifiedBuyer(phone: string, productId: string): Promise<boolean> {
    const deliveredOrder = await this.prisma.order.findFirst({
      where: {
        status: 'delivered',
        customerPhone: phone,
        items: {
          some: {
            productId,
          },
        },
      },
      select: { id: true },
    })

    return deliveredOrder !== null
  }

  private publicProductWhere(filter: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
    return {
      ...filter,
      visible: true,
      archivedAt: null,
      brand: { visible: true },
      category: { visible: true },
    }
  }

  /**
   * Handles public shopper product review submission.
   * - Honeypot filled: silently accepts without touching the database.
   * - Product must exist, be visible, not archived, with visible brand and category (404).
   * - Duplicate (productId, phone) in ANY status rejected (409).
   * - Computes verifiedBuyer flag.
   * - Persists review with status: 'pending'.
   */
  async submitReview(body: ReviewInput, ip?: string): Promise<{ ok: true }> {
    if (body.website && body.website.trim().length > 0) {
      return { ok: true }
    }

    const product = await this.prisma.product.findFirst({
      where: this.publicProductWhere({ id: body.productId }),
      select: { id: true },
    })

    if (!product) {
      throw new NotFoundException('المنتج مش موجود')
    }

    const existingReview = await this.prisma.review.findUnique({
      where: {
        productId_phone: {
          productId: body.productId,
          phone: body.phone,
        },
      },
      select: { id: true },
    })

    if (existingReview) {
      throw new ConflictException('انت قيّمت المنتج ده قبل كده')
    }

    const verifiedBuyer = await this.isVerifiedBuyer(body.phone, body.productId)

    try {
      await this.prisma.review.create({
        data: {
          productId: body.productId,
          name: body.name,
          phone: body.phone,
          stars: body.stars,
          text: body.text,
          status: 'pending',
          verifiedBuyer,
          ip: ip ?? null,
        },
      })
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('انت قيّمت المنتج ده قبل كده')
      }
      throw err
    }

    return { ok: true }
  }

  /**
   * The newest approved 4–5 star reviews across visible products, for the home page, with the
   * store-wide rating. Same privacy as listPublic: no phone, ip or status.
   */
  async listLatest(limit: number): Promise<StoreReviewsResponse> {
    const product = this.publicProductWhere({})
    const [stats, items] = await Promise.all([
      this.prisma.review.aggregate({
        where: { status: 'approved', product },
        _avg: { stars: true },
        _count: { _all: true },
      }),
      this.prisma.review.findMany({
        where: { status: 'approved', stars: { gte: 4 }, product },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        select: {
          id: true,
          name: true,
          stars: true,
          text: true,
          verifiedBuyer: true,
          createdAt: true,
          product: { select: { name: true, slug: true } },
        },
      }),
    ])

    return {
      items: items.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      summary: {
        average: Math.round((stats._avg.stars ?? 0) * 10) / 10,
        count: stats._count._all,
      },
    }
  }

  /**
   * Returns approved reviews and rating summary for a public product.
   * 404 «المنتج مش موجود» for unknown, hidden or archived products.
   * Returns items newest first (createdAt desc, tie-break id desc).
   * Strips all private data (phone, ip, status).
   */
  async listPublic(
    slug: string,
    page: number,
    pageSize: number,
  ): Promise<PublicReviewListResponse> {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        visible: true,
        archivedAt: null,
        brand: { visible: true },
        category: { visible: true },
      },
      select: { id: true },
    })

    if (!product) {
      throw new NotFoundException('المنتج مش موجود')
    }

    const [grouped, items] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['stars'],
        where: {
          productId: product.id,
          status: 'approved',
        },
        _count: { _all: true },
      }),
      this.prisma.review.findMany({
        where: {
          productId: product.id,
          status: 'approved',
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          stars: true,
          text: true,
          reply: true,
          verifiedBuyer: true,
          createdAt: true,
        },
      }),
    ])

    const counts: Partial<Record<number, number>> = {}
    for (const row of grouped) {
      counts[row.stars] = row._count?._all ?? 0
    }

    const summary = summarizeRatings(counts)

    const publicItems: PublicReview[] = items.map((r) => ({
      id: r.id,
      name: r.name,
      stars: r.stars,
      text: r.text,
      reply: r.reply,
      verifiedBuyer: r.verifiedBuyer,
      createdAt: r.createdAt.toISOString(),
    }))

    return {
      summary,
      items: publicItems,
      total: summary.count,
      page,
      pageSize,
    }
  }
}
