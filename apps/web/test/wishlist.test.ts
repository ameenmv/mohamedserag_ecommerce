import { describe, expect, it } from 'vitest'
import type { ProductCard } from '@serag/shared'
import {
  hasEntry,
  priceDropped,
  toggleEntry,
  type WishlistEntry,
} from '../app/utils/wishlist'

function mockProduct(id: string, price: number): ProductCard {
  return {
    id,
    slug: `slug-${id}`,
    name: `Product ${id}`,
    modelCode: `MOD-${id}`,
    brand: { slug: 'brand', name: 'Brand' },
    category: { slug: 'cat', name: 'Cat' },
    price,
    oldPrice: null,
    discountPercent: null,
    image: null,
    availability: {
      state: 'in_stock',
      orderable: true,
      maxQty: 5,
      leadTimeText: null,
    },
  }
}

describe('wishlist utils - toggleEntry and hasEntry', () => {
  it('adds an entry when absent and captures priceAtAdd and timestamp', () => {
    const card = mockProduct('p-100', 2500000)
    const fixedTime = 1700000000000
    const list = toggleEntry([], card, undefined, fixedTime)

    expect(hasEntry(list, 'p-100')).toBe(true)
    expect(list).toEqual<WishlistEntry[]>([
      {
        productId: 'p-100',
        priceAtAdd: 2500000,
        addedAt: fixedTime,
      },
    ])
  })

  it('removes an existing entry when toggled a second time', () => {
    const card = mockProduct('p-100', 2500000)
    const step1 = toggleEntry([], card)
    expect(hasEntry(step1, 'p-100')).toBe(true)

    const step2 = toggleEntry(step1, card)
    expect(hasEntry(step2, 'p-100')).toBe(false)
    expect(step2).toHaveLength(0)
  })

  it('supports passing productId string and explicit priceAtAdd', () => {
    const list = toggleEntry([], 'p-200', 120000)
    expect(hasEntry(list, 'p-200')).toBe(true)
    expect(list[0]?.priceAtAdd).toBe(120000)
  })
})

describe('wishlist utils - priceDropped', () => {
  it('returns true strictly when current catalog price is lower than priceAtAdd', () => {
    const entry: WishlistEntry = {
      productId: 'p-1',
      priceAtAdd: 3000000, // 30,000 EGP
      addedAt: 1700000000000,
    }

    // Dropped by 2,000 EGP
    expect(priceDropped(entry, 2800000)).toBe(true)

    // Unchanged
    expect(priceDropped(entry, 3000000)).toBe(false)

    // Increased
    expect(priceDropped(entry, 3200000)).toBe(false)
  })
})
