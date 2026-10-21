import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  AdminReviewListQueryOutput,
  AdminReviewListResponse,
  AdminReviewRow,
  ReviewStatus,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { ReviewsService } from '../reviews/reviews.service.js'

interface ReviewWithProduct {
  id: string
  product: {
    id: string
    name: string
    slug: string
  }
  name: string
  phone: string
  stars: number
  text: string
  status: ReviewStatus
  reply: string | null
  verifiedBuyer: boolean
  createdAt: Date
  updatedAt: Date
}

function toAdminReviewRow(review: ReviewWithProduct): AdminReviewRow {
  return {
    id: review.id,
    product: {
      id: review.product.id,
      name: review.product.name,
      slug: review.product.slug,
    },
    name: review.name,
    phone: review.phone,
    stars: review.stars,
    text: review.text,
    status: review.status,
    reply: review.reply,
    verifiedBuyer: review.verifiedBuyer,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }
}

@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  /**
   * Lists reviews filtered by status (default pending), search term q (product name), and stars.
   * Computes counts for pending, approved, and rejected in one grouped query under the same filters.
   * Orders pending oldest first (createdAt asc), others newest first (updatedAt desc), tie-breaking by id.
   */
  async list(query: AdminReviewListQueryOutput): Promise<AdminReviewListResponse> {
    const filterWithoutStatus: Prisma.ReviewWhereInput = {}

    if (query.q && query.q.length > 0) {
      filterWithoutStatus.product = {
        name: {
          contains: query.q,
          mode: 'insensitive',
        },
      }
    }

    if (query.stars !== undefined) {
      filterWithoutStatus.stars = query.stars
    }

    const grouped = await this.prisma.review.groupBy({
      by: ['status'],
      where: filterWithoutStatus,
      _count: {
        _all: true,
      },
    })

    const counts: { pending: number; approved: number; rejected: number } = {
      pending: 0,
      approved: 0,
      rejected: 0,
    }

    for (const g of grouped) {
      if (g.status === 'pending' || g.status === 'approved' || g.status === 'rejected') {
        counts[g.status] = g._count?._all ?? 0
      }
    }

    const total = counts[query.status]

    const where: Prisma.ReviewWhereInput = {
      ...filterWithoutStatus,
      status: query.status,
    }

    const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
      query.status === 'pending'
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : [{ updatedAt: 'desc' }, { id: 'asc' }]

    const skip = (query.page - 1) * query.pageSize
    const take = query.pageSize

    const items = await this.prisma.review.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return {
      items: items.map(toAdminReviewRow),
      total,
      page: query.page,
      pageSize: query.pageSize,
      counts,
    }
  }

  /**
   * Returns the count of pending reviews for dashboard and sidebar counters.
   */
  async getPendingCount(): Promise<{ count: number }> {
    const count = await this.prisma.review.count({
      where: {
        status: 'pending',
      },
    })
    return { count }
  }

  /**
   * Approves a review after re-checking whether the phone number has a delivered order with the product.
   * Idempotent: repeated calls still refresh verifiedBuyer and return 200 with the row.
   */
  async approve(id: string): Promise<AdminReviewRow> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        productId: true,
      },
    })

    if (!review) {
      throw new NotFoundException('التقييم غير موجود')
    }

    const verifiedBuyer = await this.reviewsService.isVerifiedBuyer(
      review.phone,
      review.productId,
    )

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        status: 'approved',
        verifiedBuyer,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return toAdminReviewRow(updated)
  }

  /**
   * Rejects a review from pending or approved (unpublish).
   * Idempotent: returns 200 with the updated row.
   */
  async reject(id: string): Promise<AdminReviewRow> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!review) {
      throw new NotFoundException('التقييم غير موجود')
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        status: 'rejected',
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return toAdminReviewRow(updated)
  }

  /**
   * Sets or clears a public store reply for a review.
   * Passing null or an empty string clears the reply to null.
   */
  async reply(id: string, reply: string | null): Promise<AdminReviewRow> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!review) {
      throw new NotFoundException('التقييم غير موجود')
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        reply,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return toAdminReviewRow(updated)
  }

  /**
   * Permanently deletes a review, allowing the phone to review that product again.
   */
  async delete(id: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!review) {
      throw new NotFoundException('التقييم غير موجود')
    }

    await this.prisma.review.delete({
      where: { id },
    })
  }
}
