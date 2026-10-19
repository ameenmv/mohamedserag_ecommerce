import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { ReviewInput } from '@serag/shared'
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

  /**
   * Handles public shopper product review submission.
   * - Honeypot filled: silently accepts without touching the database.
   * - Product must exist, be visible, and not archived (404).
   * - Duplicate (productId, phone) in ANY status rejected (409).
   * - Computes verifiedBuyer flag.
   * - Persists review with status: 'pending'.
   */
  async submitReview(body: ReviewInput, ip?: string): Promise<{ ok: true }> {
    if (body.website && body.website.trim().length > 0) {
      return { ok: true }
    }

    const product = await this.prisma.product.findUnique({
      where: { id: body.productId },
      select: {
        id: true,
        visible: true,
        archivedAt: true,
      },
    })

    if (!product || !product.visible || product.archivedAt !== null) {
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
}
