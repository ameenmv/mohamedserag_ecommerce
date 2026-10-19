import { describe, expect, it } from 'vitest'
import type { ProductCard } from '@serag/shared'
import {
  addLine,
  cartCount,
  cartSubtotal,
  removeLine,
  setLineQty,
  type CartLine,
} from '../app/utils/cart'

function makeProductCard(overrides: Partial<ProductCard> = {}): ProductCard {
  return {
    id: 'prod-1',
    slug: 'lg-fridge-450l',
    name: 'ثلاجة إل جي 450 لتر نوفروست',
    modelCode: 'GN-B450SQCL',
    brand: { slug: 'lg', name: 'LG' },
    category: { slug: 'fridges', name: 'ثلاجات' },
    price: 3500000, // 35,000 EGP
    oldPrice: 3800000,
    discountPercent: 8,
    image: { url: '/uploads/fridge.webp', alt: 'LG Fridge', isReal: false },
    availability: {
      state: 'in_stock',
      orderable: true,
      maxQty: 5,
      leadTimeText: null,
    },
    flash: null,
    ...overrides,
  }
}

describe('cart utils - addLine', () => {
  it('adds an orderable product to an empty cart with snapshot data', () => {
    const card = makeProductCard()
    const result = addLine([], card, 2)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual<CartLine>({
      productId: 'prod-1',
      slug: 'lg-fridge-450l',
      name: 'ثلاجة إل جي 450 لتر نوفروست',
      image: '/uploads/fridge.webp',
      price: 3500000,
      qty: 2,
      maxQty: 5,
    })
  })

  it('refuses to add out-of-stock or non-orderable products', () => {
    const outCard = makeProductCard({
      availability: {
        state: 'out',
        orderable: false,
        maxQty: 0,
        leadTimeText: null,
      },
    })
    const initial: CartLine[] = []
    const result = addLine(initial, outCard, 1)

    expect(result).toHaveLength(0)
  })

  it('refuses invalid or zero quantity', () => {
    const card = makeProductCard()
    const result = addLine([], card, 0)
    expect(result).toHaveLength(0)

    const negative = addLine([], card, -2)
    expect(negative).toHaveLength(0)
  })

  it('caps initial quantity at maxQty stock limit', () => {
    const card = makeProductCard({
      availability: {
        state: 'low',
        orderable: true,
        maxQty: 2,
        leadTimeText: null,
      },
    })
    const result = addLine([], card, 10)

    expect(result).toHaveLength(1)
    expect(result[0]?.qty).toBe(2)
  })

  it('merges quantities when adding the same product', () => {
    const card = makeProductCard()
    const step1 = addLine([], card, 1)
    const step2 = addLine(step1, card, 2)

    expect(step2).toHaveLength(1)
    expect(step2[0]?.qty).toBe(3)
  })

  it('caps merged quantity at maxQty when adding more than stock allows', () => {
    const card = makeProductCard({
      availability: {
        state: 'in_stock',
        orderable: true,
        maxQty: 4,
        leadTimeText: null,
      },
    })
    const step1 = addLine([], card, 3)
    const step2 = addLine(step1, card, 3) // requests 3 + 3 = 6, but max is 4

    expect(step2[0]?.qty).toBe(4)
  })

  it('allows unconstrained addition when maxQty is null (e.g. on_request)', () => {
    const card = makeProductCard({
      availability: {
        state: 'on_request',
        orderable: true,
        maxQty: null,
        leadTimeText: '3-7 أيام',
      },
    })
    const step1 = addLine([], card, 15)
    const step2 = addLine(step1, card, 10)

    expect(step2[0]?.qty).toBe(25)
  })
})

describe('cart utils - setLineQty and removeLine', () => {
  it('updates line quantity to a valid number', () => {
    const card = makeProductCard()
    const initial = addLine([], card, 1)
    const updated = setLineQty(initial, 'prod-1', 4)

    expect(updated[0]?.qty).toBe(4)
  })

  it('caps updated quantity at maxQty', () => {
    const card = makeProductCard({
      availability: {
        state: 'low',
        orderable: true,
        maxQty: 3,
        leadTimeText: null,
      },
    })
    const initial = addLine([], card, 1)
    const updated = setLineQty(initial, 'prod-1', 9)

    expect(updated[0]?.qty).toBe(3)
  })

  it('removes line when setLineQty receives 0 or negative', () => {
    const card = makeProductCard()
    const initial = addLine([], card, 2)
    const zeroed = setLineQty(initial, 'prod-1', 0)
    expect(zeroed).toHaveLength(0)

    const neg = setLineQty(initial, 'prod-1', -1)
    expect(neg).toHaveLength(0)
  })

  it('removes line directly by productId via removeLine', () => {
    const card1 = makeProductCard({ id: 'p1' })
    const card2 = makeProductCard({ id: 'p2' })
    const cart = addLine(addLine([], card1, 1), card2, 2)

    expect(cart).toHaveLength(2)
    const afterRemoval = removeLine(cart, 'p1')

    expect(afterRemoval).toHaveLength(1)
    expect(afterRemoval[0]?.productId).toBe('p2')
  })
})

describe('cart utils - cartCount and cartSubtotal', () => {
  it('computes total count as sum of quantities', () => {
    const lines: CartLine[] = [
      { productId: 'p1', slug: 's1', name: 'N1', image: null, price: 1000, qty: 2, maxQty: 5 },
      { productId: 'p2', slug: 's2', name: 'N2', image: null, price: 5000, qty: 3, maxQty: 10 },
    ]
    expect(cartCount(lines)).toBe(5)
    expect(cartCount([])).toBe(0)
  })

  it('computes subtotal in integer piastres correctly', () => {
    const lines: CartLine[] = [
      { productId: 'p1', slug: 's1', name: 'N1', image: null, price: 150000, qty: 2, maxQty: 5 }, // 300,000
      { productId: 'p2', slug: 's2', name: 'N2', image: null, price: 400000, qty: 1, maxQty: 5 }, // 400,000
    ]
    expect(cartSubtotal(lines)).toBe(700000)
    expect(cartSubtotal([])).toBe(0)
  })
})
