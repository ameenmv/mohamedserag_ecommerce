import { describe, expect, it } from 'vitest'
import {
  REVIEW_NAME_MAX,
  REVIEW_NAME_MIN,
  REVIEW_REPLY_MAX,
  REVIEW_TEXT_MAX,
  REVIEW_TEXT_MIN,
  summarizeRatings,
  toProductRating,
} from './reviews.js'

describe('reviews shared domain logic (T001)', () => {
  it('exports expected domain limits constants', () => {
    expect(REVIEW_TEXT_MIN).toBe(20)
    expect(REVIEW_TEXT_MAX).toBe(1000)
    expect(REVIEW_NAME_MIN).toBe(2)
    expect(REVIEW_NAME_MAX).toBe(60)
    expect(REVIEW_REPLY_MAX).toBe(500)
  })

  describe('summarizeRatings', () => {
    it('handles empty counts with zero average and all-zero distribution', () => {
      const summary = summarizeRatings({})
      expect(summary).toEqual({
        average: 0,
        count: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      })
    })

    it('handles a single rating correctly', () => {
      const summary = summarizeRatings({ 5: 1 })
      expect(summary).toEqual({
        average: 5,
        count: 1,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 1,
        },
      })
    })

    it('calculates average for a mixed distribution (5, 4, 3 -> 4.0)', () => {
      const summary = summarizeRatings({ 5: 1, 4: 1, 3: 1 })
      expect(summary).toEqual({
        average: 4.0,
        count: 3,
        distribution: {
          1: 0,
          2: 0,
          3: 1,
          4: 1,
          5: 1,
        },
      })
    })

    it('rounds half-up to one decimal (4.25 -> 4.3)', () => {
      // 1x5 + 3x4 = 17 / 4 = 4.25 -> 4.3
      const summary = summarizeRatings({ 5: 1, 4: 3 })
      expect(summary.count).toBe(4)
      expect(summary.average).toBe(4.3)
    })

    it('rounds half-up to one decimal (4.24 -> 4.2)', () => {
      // 6x5 + 19x4 = 30 + 76 = 106 / 25 = 4.24 -> 4.2
      const summary = summarizeRatings({ 5: 6, 4: 19 })
      expect(summary.count).toBe(25)
      expect(summary.average).toBe(4.2)
    })

    it('ignores out-of-range keys outside 1 to 5', () => {
      const summary = summarizeRatings({
        0: 10,
        6: 5,
        99: 100,
        '-1': 50,
        5: 2,
        4: 2,
      })
      expect(summary).toEqual({
        average: 4.5,
        count: 4,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 2,
          5: 2,
        },
      })
    })
  })

  describe('toProductRating', () => {
    it('returns null when count is 0', () => {
      const summary = summarizeRatings({})
      expect(toProductRating(summary)).toBeNull()
    })

    it('returns { average, count } when count is greater than 0', () => {
      const summary = summarizeRatings({ 5: 1, 4: 3 })
      expect(toProductRating(summary)).toEqual({
        average: 4.3,
        count: 4,
      })
    })
  })
})
