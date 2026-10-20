import { Injectable } from '@nestjs/common'
import {
  summarizeRatings,
  toProductRating,
  type ProductRating,
} from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class ReviewRatingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches approved review ratings for a list of product IDs in a single grouped query.
   * Returns a Map of productId -> ProductRating.
   * If productIds is empty, returns an empty Map without querying the database.
   */
  async ratingsFor(productIds: string[]): Promise<Map<string, ProductRating>> {
    const uniqueIds = Array.from(new Set(productIds)).filter((id) => id.length > 0)
    if (uniqueIds.length === 0) {
      return new Map()
    }

    const grouped = await this.prisma.review.groupBy({
      by: ['productId', 'stars'],
      where: {
        productId: { in: uniqueIds },
        status: 'approved',
      },
      _count: { _all: true },
    })

    const countsByProduct = new Map<string, Partial<Record<number, number>>>()
    for (const row of grouped) {
      let pCounts = countsByProduct.get(row.productId)
      if (!pCounts) {
        pCounts = {}
        countsByProduct.set(row.productId, pCounts)
      }
      const count = row._count?._all ?? 0
      pCounts[row.stars] = count
    }

    const result = new Map<string, ProductRating>()
    for (const [productId, counts] of countsByProduct.entries()) {
      const summary = summarizeRatings(counts)
      const rating = toProductRating(summary)
      if (rating) {
        result.set(productId, rating)
      }
    }

    return result
  }
}
