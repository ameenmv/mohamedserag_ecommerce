import { describe, expect, it } from 'vitest'
import { reviewCountKey } from '../app/utils/review-count-label'

describe('reviewCountKey utility', () => {
  it('correctly maps Arabic plural rules according to CLDR', () => {
    // 0 -> zero
    expect(reviewCountKey(0, 'ar')).toBe('store.reviews.count.zero')
    // 1 -> one
    expect(reviewCountKey(1, 'ar')).toBe('store.reviews.count.one')
    // 2 -> two
    expect(reviewCountKey(2, 'ar')).toBe('store.reviews.count.two')
    // 3..10 -> few
    expect(reviewCountKey(3, 'ar')).toBe('store.reviews.count.few')
    expect(reviewCountKey(10, 'ar')).toBe('store.reviews.count.few')
    // 11..99 -> many
    expect(reviewCountKey(11, 'ar')).toBe('store.reviews.count.many')
    // 100 -> other
    expect(reviewCountKey(100, 'ar')).toBe('store.reviews.count.other')
  })

  it('correctly maps English plural rules', () => {
    // 0 -> zero
    expect(reviewCountKey(0, 'en')).toBe('store.reviews.count.zero')
    // 1 -> one
    expect(reviewCountKey(1, 'en')).toBe('store.reviews.count.one')
    // 2 -> other
    expect(reviewCountKey(2, 'en')).toBe('store.reviews.count.other')
    // > 2 -> other
    expect(reviewCountKey(10, 'en')).toBe('store.reviews.count.other')
  })
})
