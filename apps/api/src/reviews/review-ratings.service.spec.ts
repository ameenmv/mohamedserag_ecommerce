import { describe, expect, it, vi } from 'vitest'
import { ReviewRatingsService } from './review-ratings.service.js'
import type { PrismaService } from '../prisma/prisma.service.js'

describe('ReviewRatingsService', () => {
  it('returns empty map immediately when productIds is empty', async () => {
    const mockGroupBy = vi.fn()
    const mockPrisma = {
      review: { groupBy: mockGroupBy },
    } as unknown as PrismaService

    const service = new ReviewRatingsService(mockPrisma)
    const result = await service.ratingsFor([])

    expect(result.size).toBe(0)
    expect(mockGroupBy).not.toHaveBeenCalled()
  })

  it('filters empty strings and returns empty map without querying if no valid IDs', async () => {
    const mockGroupBy = vi.fn()
    const mockPrisma = {
      review: { groupBy: mockGroupBy },
    } as unknown as PrismaService

    const service = new ReviewRatingsService(mockPrisma)
    const result = await service.ratingsFor(['', ''])

    expect(result.size).toBe(0)
    expect(mockGroupBy).not.toHaveBeenCalled()
  })

  it('deduplicates productIds and folds grouped results per product', async () => {
    const mockGroupBy = vi.fn().mockResolvedValue([
      { productId: 'prod_1', stars: 5, _count: { _all: 2 } },
      { productId: 'prod_1', stars: 4, _count: { _all: 1 } },
      { productId: 'prod_2', stars: 3, _count: { _all: 3 } },
    ])
    const mockPrisma = {
      review: { groupBy: mockGroupBy },
    } as unknown as PrismaService

    const service = new ReviewRatingsService(mockPrisma)
    const result = await service.ratingsFor(['prod_1', 'prod_2', 'prod_1'])

    expect(mockGroupBy).toHaveBeenCalledWith({
      by: ['productId', 'stars'],
      where: {
        productId: { in: ['prod_1', 'prod_2'] },
        status: 'approved',
      },
      _count: { _all: true },
    })

    expect(result.size).toBe(2)

    // prod_1: (5*2 + 4*1) / 3 = 14 / 3 = 4.666... -> rounded to 4.7, count = 3
    const prod1Rating = result.get('prod_1')
    expect(prod1Rating).toEqual({
      average: 4.7,
      count: 3,
    })

    // prod_2: (3*3) / 3 = 3.0, count = 3
    const prod2Rating = result.get('prod_2')
    expect(prod2Rating).toEqual({
      average: 3,
      count: 3,
    })
  })

  it('does not include products that have no approved reviews in grouped results', async () => {
    const mockGroupBy = vi.fn().mockResolvedValue([
      { productId: 'prod_1', stars: 5, _count: { _all: 1 } },
    ])
    const mockPrisma = {
      review: { groupBy: mockGroupBy },
    } as unknown as PrismaService

    const service = new ReviewRatingsService(mockPrisma)
    const result = await service.ratingsFor(['prod_1', 'prod_no_reviews'])

    expect(result.size).toBe(1)
    expect(result.get('prod_1')).toEqual({ average: 5, count: 1 })
    expect(result.get('prod_no_reviews')).toBeUndefined()
  })
})
