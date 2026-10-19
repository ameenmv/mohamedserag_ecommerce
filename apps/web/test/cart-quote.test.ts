import { describe, expect, it } from 'vitest'
import type { CartQuote } from '@serag/shared'
import type { CartLine } from '../app/utils/cart'
import {
  applyQuoteToCartState,
  buildQuoteRequest,
  cartQuoteKey,
  dismissPriceChange,
  prunePriceChanges,
  type PriceChange,
} from '../app/utils/cart-quote'

function createMockCartLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'prod-1',
    slug: 'lg-fridge',
    name: 'ثلاجة إل جي',
    image: null,
    price: 500000,
    qty: 3,
    maxQty: 10,
    ...overrides,
  }
}

describe('cart-quote utils - applyQuoteToCartState', () => {
  it('applies capped quantity, updates unit price, and records price change once', () => {
    const lines: CartLine[] = [
      createMockCartLine({
        productId: 'prod-1',
        price: 500000,
        qty: 5,
        maxQty: 10,
      }),
    ]
    const initialPriceChanges: Record<string, PriceChange> = {}

    const mockQuote: CartQuote = {
      lines: [
        {
          productId: 'prod-1',
          slug: 'lg-fridge',
          name: 'ثلاجة إل جي',
          modelCode: 'LG-1',
          imageUrl: null,
          requestedQty: 5,
          qty: 2, // Capped to available stock
          unitPrice: 550000, // Price increased
          lineTotal: 1100000,
          availability: {
            state: 'low',
            label: 'كمية محدودة',
            orderable: true,
            maxQty: 2,
          },
          leadTimeText: null,
          issues: ['qty_capped', 'price_changed'],
          previousPrice: 500000,
        },
      ],
      subtotal: 1100000,
      discount: 0,
      deliveryFee: 10000,
      total: 1110000,
      zone: { id: 'mansoura', name: 'المنصورة', fee: 10000 },
      coupon: null,
      codDeposit: { required: false, pct: 10, amount: 0, threshold: 3000000 },
      hasBlockingIssues: true,
    }

    // First quote application
    const firstResult = applyQuoteToCartState(lines, initialPriceChanges, mockQuote)

    expect(firstResult.lines[0]?.qty).toBe(2)
    expect(firstResult.lines[0]?.price).toBe(550000)
    expect(firstResult.lines[0]?.maxQty).toBe(2)
    expect(firstResult.priceChanges['prod-1']).toEqual({
      from: 500000,
      to: 550000,
    })

    // Subsequent quote where the updated price is known and accepted (no price_changed issue)
    const subsequentQuote: CartQuote = {
      ...mockQuote,
      lines: [
        {
          ...mockQuote.lines[0]!,
          requestedQty: 2,
          qty: 2,
          unitPrice: 550000,
          previousPrice: null,
          issues: [],
        },
      ],
      hasBlockingIssues: false,
    }

    const secondResult = applyQuoteToCartState(
      firstResult.lines,
      firstResult.priceChanges,
      subsequentQuote,
    )

    // Existing recorded price change is preserved so the shopper still sees it
    expect(secondResult.priceChanges['prod-1']).toEqual({
      from: 500000,
      to: 550000,
    })
    expect(secondResult.lines[0]?.price).toBe(550000)
  })

  it('returns lines and price changes unchanged when quote is null or undefined', () => {
    const lines = [createMockCartLine()]
    const priceChanges = { 'prod-1': { from: 100, to: 120 } }

    const resNull = applyQuoteToCartState(lines, priceChanges, null)
    expect(resNull.lines).toEqual(lines)
    expect(resNull.priceChanges).toEqual(priceChanges)

    const resUndefined = applyQuoteToCartState(lines, priceChanges, undefined)
    expect(resUndefined.lines).toEqual(lines)
    expect(resUndefined.priceChanges).toEqual(priceChanges)
  })
})

describe('cart-quote utils - cartQuoteKey', () => {
  it('generates a key based solely on productId and quantity, completely ignoring price', () => {
    const linesPriceA: CartLine[] = [
      createMockCartLine({ productId: 'prod-1', qty: 2, price: 500000 }),
      createMockCartLine({ productId: 'prod-2', qty: 1, price: 300000 }),
    ]
    const linesPriceB: CartLine[] = [
      createMockCartLine({ productId: 'prod-1', qty: 2, price: 580000 }), // price changed
      createMockCartLine({ productId: 'prod-2', qty: 1, price: 300000 }),
    ]

    const keyA = cartQuoteKey(linesPriceA)
    const keyB = cartQuoteKey(linesPriceB)

    expect(keyA).toBe('prod-1:2,prod-2:1')
    expect(keyA).toBe(keyB)
  })

  it('changes key when quantity or product list changes', () => {
    const linesA: CartLine[] = [createMockCartLine({ productId: 'prod-1', qty: 2 })]
    const linesB: CartLine[] = [createMockCartLine({ productId: 'prod-1', qty: 3 })]

    expect(cartQuoteKey(linesA)).not.toBe(cartQuoteKey(linesB))
  })
})

describe('cart-quote utils - buildQuoteRequest', () => {
  it('includes governorate, city, and coupon only when provided and non-empty', () => {
    const lines = [createMockCartLine({ productId: 'prod-1', qty: 2, price: 500000 })]

    // With explicit context
    const reqWithZone = buildQuoteRequest(lines, {
      governorate: '  الدقهلية  ',
      city: '  المنصورة  ',
      paymentMethod: 'cod',
      couponCode: '  SAVE10  ',
    })

    expect(reqWithZone.governorate).toBe('الدقهلية')
    expect(reqWithZone.city).toBe('المنصورة')
    expect(reqWithZone.paymentMethod).toBe('cod')
    expect(reqWithZone.couponCode).toBe('SAVE10')
    expect(reqWithZone.items).toEqual([
      { productId: 'prod-1', qty: 2, knownPrice: 500000 },
    ])

    // Without context or with empty strings
    const reqEmpty = buildQuoteRequest(lines, {
      governorate: '   ',
      city: '',
      couponCode: '   ',
    })

    expect(reqEmpty.governorate).toBeUndefined()
    expect(reqEmpty.city).toBeUndefined()
    expect(reqEmpty.couponCode).toBeUndefined()
  })
})

describe('cart-quote utils - prunePriceChanges & dismissPriceChange', () => {
  it('prunes price changes for products removed from the cart', () => {
    const priceChanges: Record<string, PriceChange> = {
      'prod-1': { from: 100000, to: 120000 },
      'prod-2': { from: 200000, to: 250000 },
    }

    // Only prod-2 remains in cart
    const pruned = prunePriceChanges(priceChanges, ['prod-2'])

    expect(pruned['prod-1']).toBeUndefined()
    expect(pruned['prod-2']).toEqual({ from: 200000, to: 250000 })
  })

  it('dismisses a single product or all price changes', () => {
    const priceChanges: Record<string, PriceChange> = {
      'prod-1': { from: 100000, to: 120000 },
      'prod-2': { from: 200000, to: 250000 },
    }

    const singleDismissed = dismissPriceChange(priceChanges, 'prod-1')
    expect(singleDismissed['prod-1']).toBeUndefined()
    expect(singleDismissed['prod-2']).toBeDefined()

    const allDismissed = dismissPriceChange(priceChanges)
    expect(Object.keys(allDismissed)).toHaveLength(0)
  })
})
