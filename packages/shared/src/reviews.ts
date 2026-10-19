import type { ReviewStatus } from './enums.js'

export type { ReviewStatus }

export interface PublicReview {
  id: string
  name: string
  stars: number
  text: string
  reply: string | null
  verifiedBuyer: boolean
  createdAt: string
}

export type ReviewRatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>

export interface ReviewRatingSummary {
  average: number
  count: number
  distribution: ReviewRatingDistribution
}

export interface ProductRating {
  average: number
  count: number
}

export interface AdminReviewRow {
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
  createdAt: string
  updatedAt: string
}

export interface AdminReviewListResponse {
  items: AdminReviewRow[]
  total: number
  page: number
  pageSize: number
  counts: {
    pending: number
    approved: number
    rejected: number
  }
}

export interface PublicReviewListResponse {
  summary: ReviewRatingSummary
  items: PublicReview[]
  total: number
  page: number
  pageSize: number
}

export const REVIEW_TEXT_MIN = 20
export const REVIEW_TEXT_MAX = 1000
export const REVIEW_NAME_MIN = 2
export const REVIEW_NAME_MAX = 60
export const REVIEW_REPLY_MAX = 500

/**
 * Aggregates a star counts distribution (1–5) into a ReviewRatingSummary.
 * - Ignores keys outside the 1–5 range.
 * - Computes the average rounded to 1 decimal with half-up rounding.
 * - Returns average: 0 and an all-zero distribution when count is 0.
 */
export function summarizeRatings(
  counts: Partial<Record<number, number>>,
): ReviewRatingSummary {
  const distribution: ReviewRatingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }

  let totalCount = 0
  let totalScore = 0

  for (const star of [1, 2, 3, 4, 5] as const) {
    const raw = counts[star] ?? (counts as Record<string, number | undefined>)[String(star)]
    const count = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
    distribution[star] = count
    totalCount += count
    totalScore += count * star
  }

  if (totalCount === 0) {
    return {
      average: 0,
      count: 0,
      distribution,
    }
  }

  const rawAverage = totalScore / totalCount
  const average = Math.round((rawAverage + Number.EPSILON) * 10) / 10

  return {
    average,
    count: totalCount,
    distribution,
  }
}

/**
 * Extracts compact ProductRating for product cards, or null if no ratings exist.
 */
export function toProductRating(summary: ReviewRatingSummary): ProductRating | null {
  if (summary.count === 0) {
    return null
  }
  return {
    average: summary.average,
    count: summary.count,
  }
}
