import { describe, expect, it } from 'vitest'
import { PRICE_FILTER_MAX_EGP, productQuerySchema } from './catalog-schema.js'

describe('productQuerySchema price filters', () => {
  it('accepts a price up to the cap', () => {
    expect(productQuerySchema.safeParse({ minPrice: String(PRICE_FILTER_MAX_EGP) }).success).toBe(true)
  })

  it('rejects prices that would overflow the piastre column', () => {
    expect(productQuerySchema.safeParse({ minPrice: '99999999' }).success).toBe(false)
    expect(productQuerySchema.safeParse({ maxPrice: '99999999' }).success).toBe(false)
  })
})
