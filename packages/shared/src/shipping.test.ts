import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DELIVERY_OFFERS,
  evaluateDeliveryOffers,
  legacyZoneFees,
  maxShippingClass,
  resolveShippingClass,
  zoneFeeFor,
  type DeliveryOffers,
  type ShippingClass,
} from './shipping.js'

describe('resolveShippingClass', () => {
  it('prefers the product override over every category class', () => {
    expect(resolveShippingClass('small', ['medium', 'large'])).toBe('small')
  })

  it('uses the nearest category class that is set, walking up the ancestors', () => {
    expect(resolveShippingClass(null, ['medium', 'small'])).toBe('medium')
    expect(resolveShippingClass(undefined, [null, 'small', 'large'])).toBe('small')
  })

  it('falls back to large when nothing is set', () => {
    expect(resolveShippingClass(null, [])).toBe('large')
    expect(resolveShippingClass(undefined, [null, undefined])).toBe('large')
  })
})

describe('maxShippingClass', () => {
  it('keeps the larger class regardless of argument order', () => {
    const cases: [ShippingClass, ShippingClass, ShippingClass][] = [
      ['small', 'medium', 'medium'],
      ['medium', 'small', 'medium'],
      ['medium', 'large', 'large'],
      ['large', 'small', 'large'],
      ['small', 'small', 'small'],
      ['large', 'large', 'large'],
    ]
    for (const [current, next, expected] of cases) {
      expect(maxShippingClass(current, next)).toBe(expected)
    }
  })
})

describe('legacyZoneFees', () => {
  it('maps a legacy fee to large, 75% medium and 50% small rounded to whole pounds', () => {
    expect(legacyZoneFees(10_000)).toEqual({ small: 5_000, medium: 7_500, large: 10_000 })
    expect(legacyZoneFees(15_000)).toEqual({ small: 7_500, medium: 11_300, large: 15_000 })
    expect(legacyZoneFees(25_000)).toEqual({ small: 12_500, medium: 18_800, large: 25_000 })
    expect(legacyZoneFees(40_000)).toEqual({ small: 20_000, medium: 30_000, large: 40_000 })
  })
})

describe('zoneFeeFor', () => {
  const fees = { small: 5_000, medium: 7_500, large: 10_000 }

  it('returns the fee of the requested class', () => {
    expect(zoneFeeFor(fees, 'small')).toBe(5_000)
    expect(zoneFeeFor(fees, 'medium')).toBe(7_500)
    expect(zoneFeeFor(fees, 'large')).toBe(10_000)
  })
})

describe('evaluateDeliveryOffers', () => {
  const enabledOffers: DeliveryOffers = {
    freeAbove: { enabled: true, amount: 100_000, classes: ['small', 'medium', 'large'] },
    firstOrderFree: { enabled: true, classes: ['small', 'medium', 'large'] },
  }

  it('does not discount when both offers are off, and reports no remaining hint', () => {
    expect(
      evaluateDeliveryOffers({
        shippingClass: 'large',
        subtotalAfterDiscount: 500_000,
        offers: DEFAULT_DELIVERY_OFFERS,
        isFirstOrder: true,
      }),
    ).toEqual({ freeReason: null, freeAboveRemaining: null })
  })

  it('applies the threshold offer at or above the amount', () => {
    expect(
      evaluateDeliveryOffers({
        shippingClass: 'large',
        subtotalAfterDiscount: 100_000,
        offers: enabledOffers,
        isFirstOrder: null,
      }),
    ).toEqual({ freeReason: 'threshold', freeAboveRemaining: null })
  })

  it('reports how much is left when below the threshold and no other offer applies', () => {
    expect(
      evaluateDeliveryOffers({
        shippingClass: 'large',
        subtotalAfterDiscount: 60_000,
        offers: enabledOffers,
        isFirstOrder: false,
      }),
    ).toEqual({ freeReason: null, freeAboveRemaining: 40_000 })
  })

  it('applies the first-order offer only when the phone is known to be new', () => {
    const offers: DeliveryOffers = {
      freeAbove: { enabled: false, amount: 100_000, classes: ['large'] },
      firstOrderFree: { enabled: true, classes: ['large'] },
    }

    expect(
      evaluateDeliveryOffers({
        shippingClass: 'large',
        subtotalAfterDiscount: 10_000,
        offers,
        isFirstOrder: true,
      }),
    ).toEqual({ freeReason: 'first_order', freeAboveRemaining: null })

    expect(
      evaluateDeliveryOffers({
        shippingClass: 'large',
        subtotalAfterDiscount: 10_000,
        offers,
        isFirstOrder: false,
      }),
    ).toEqual({ freeReason: null, freeAboveRemaining: null })

    expect(
      evaluateDeliveryOffers({
        shippingClass: 'large',
        subtotalAfterDiscount: 10_000,
        offers,
        isFirstOrder: null,
      }),
    ).toEqual({ freeReason: null, freeAboveRemaining: null })
  })

  it('lets the threshold offer win over the first-order offer', () => {
    expect(
      evaluateDeliveryOffers({
        shippingClass: 'medium',
        subtotalAfterDiscount: 200_000,
        offers: enabledOffers,
        isFirstOrder: true,
      }),
    ).toEqual({ freeReason: 'threshold', freeAboveRemaining: null })
  })

  it('ignores offers that do not include the cart class', () => {
    const offers: DeliveryOffers = {
      freeAbove: { enabled: true, amount: 100_000, classes: ['small'] },
      firstOrderFree: { enabled: true, classes: ['small'] },
    }

    expect(
      evaluateDeliveryOffers({
        shippingClass: 'large',
        subtotalAfterDiscount: 500_000,
        offers,
        isFirstOrder: true,
      }),
    ).toEqual({ freeReason: null, freeAboveRemaining: null })
  })
})
