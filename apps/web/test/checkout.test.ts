import { describe, expect, it } from 'vitest'
import type { CartQuote } from '@serag/shared'
import type { CartLine } from '../app/utils/cart'
import {
  buildCreateOrderPayload,
  couponReasonKey,
  orderPlacedEvent,
  parseOrderConflict,
  placeOrderBlockReason,
} from '../app/utils/checkout'

function makeMockQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  return {
    lines: [],
    subtotal: 500000,
    discount: 0,
    deliveryFee: 10000,
    total: 510000,
    zone: { id: 'mansoura', name: 'المنصورة', fee: 10000 },
    coupon: null,
    codDeposit: { required: false, pct: 10, amount: 0, threshold: 3000000 },
    hasBlockingIssues: false,
    ...overrides,
  }
}

function makeCartLine(qty = 1, price = 500000): CartLine {
  return {
    productId: 'prod-1',
    slug: 'p1',
    name: 'منتج',
    image: null,
    price,
    qty,
    maxQty: 10,
  }
}

describe('checkout utils - placeOrderBlockReason and precedence', () => {
  it('identifies every block reason in correct order of precedence', () => {
    const validQuote = makeMockQuote()

    // 1. notReady takes precedence over everything
    expect(
      placeOrderBlockReason({
        hydrated: false,
        submitting: true,
        pending: true,
        quote: null,
      }),
    ).toBe('notReady')

    // 2. submitting takes precedence over pending and quote state
    expect(
      placeOrderBlockReason({
        hydrated: true,
        submitting: true,
        pending: true,
        quote: null,
      }),
    ).toBe('submitting')

    // 3. pending takes precedence over quote existence
    expect(
      placeOrderBlockReason({
        hydrated: true,
        submitting: false,
        pending: true,
        quote: null,
      }),
    ).toBe('pending')

    // 4. noQuote when quote is null
    expect(
      placeOrderBlockReason({
        hydrated: true,
        submitting: false,
        pending: false,
        quote: null,
      }),
    ).toBe('noQuote')

    // 5. noZone takes precedence over blocking issues
    const quoteNoZone = makeMockQuote({ zone: null, hasBlockingIssues: true })
    expect(
      placeOrderBlockReason({
        hydrated: true,
        submitting: false,
        pending: false,
        quote: quoteNoZone,
      }),
    ).toBe('noZone')

    // 6. blocking when quote has blocking issues
    const quoteBlocking = makeMockQuote({ hasBlockingIssues: true })
    expect(
      placeOrderBlockReason({
        hydrated: true,
        submitting: false,
        pending: false,
        quote: quoteBlocking,
      }),
    ).toBe('blocking')

    // 7. null when all checks pass
    expect(
      placeOrderBlockReason({
        hydrated: true,
        submitting: false,
        pending: false,
        quote: validQuote,
      }),
    ).toBeNull()
  })
})

describe('checkout utils - buildCreateOrderPayload', () => {
  it('trims fields and drops empty notes and coupon', () => {
    const lines = [makeCartLine(2, 500000)]
    const payload = buildCreateOrderPayload(
      lines,
      {
        name: '  أحمد سراج  ',
        phone: '  01012345678  ',
        governorate: '  الدقهلية  ',
        city: '  المنصورة  ',
        address: '  شارع الجيش، عمارة 5  ',
        notes: '   ', // whitespace only -> must be dropped
        paymentMethod: 'cod',
        couponCode: '', // empty -> must be dropped
      },
      'idem-uuid-1234-5678-9012',
      1000000,
    )

    expect(payload.customer.name).toBe('أحمد سراج')
    expect(payload.customer.phone).toBe('01012345678')
    expect(payload.customer.governorate).toBe('الدقهلية')
    expect(payload.customer.city).toBe('المنصورة')
    expect(payload.customer.address).toBe('شارع الجيش، عمارة 5')
    expect(payload.customer).not.toHaveProperty('notes')
    expect(payload).not.toHaveProperty('couponCode')
    expect(payload.idempotencyKey).toBe('idem-uuid-1234-5678-9012')
    expect(payload.expectedTotal).toBe(1000000)
    expect(payload.items).toEqual([{ productId: 'prod-1', qty: 2, knownPrice: 500000 }])
  })

  it('keeps and trims non-empty notes and coupon code', () => {
    const lines = [makeCartLine(1, 200000)]
    const payload = buildCreateOrderPayload(
      lines,
      {
        name: 'محمد',
        phone: '01099998888',
        governorate: 'القاهرة',
        city: 'المعادي',
        address: 'شارع النصر',
        notes: '  الاتصال قبل الوصول بساعة  ',
        paymentMethod: 'instapay',
        couponCode: '  DISCOUNT20  ',
      },
      'idem-uuid-9999-8888-7777',
      200000,
    )

    expect(payload.customer.notes).toBe('الاتصال قبل الوصول بساعة')
    expect(payload.couponCode).toBe('DISCOUNT20')
  })
})

describe('checkout utils - parseOrderConflict', () => {
  it('accepts 409 responses with CART_CHANGED, TOTAL_CHANGED, or COUPON_REJECTED and a valid quote', () => {
    const quote = makeMockQuote()

    // 1. CART_CHANGED via data
    const resCart = parseOrderConflict({
      statusCode: 409,
      data: {
        code: 'CART_CHANGED',
        message: 'تم تغيير الأسعار بالسلة',
        quote,
      },
    })
    expect(resCart).not.toBeNull()
    expect(resCart?.code).toBe('CART_CHANGED')
    expect(resCart?.message).toBe('تم تغيير الأسعار بالسلة')
    expect(resCart?.quote).toEqual(quote)

    // 2. TOTAL_CHANGED via response._data
    const resTotal = parseOrderConflict({
      response: {
        status: 409,
        _data: {
          code: 'TOTAL_CHANGED',
          message: 'تغير إجمالي الطلب',
          quote,
        },
      },
    })
    expect(resTotal).not.toBeNull()
    expect(resTotal?.code).toBe('TOTAL_CHANGED')
    expect(resTotal?.message).toBe('تغير إجمالي الطلب')

    // 3. COUPON_REJECTED via data
    const resCoupon = parseOrderConflict({
      statusCode: 409,
      data: {
        code: 'COUPON_REJECTED',
        message: 'الكود انتهى',
        quote,
      },
    })
    expect(resCoupon).not.toBeNull()
    expect(resCoupon?.code).toBe('COUPON_REJECTED')
    expect(resCoupon?.message).toBe('الكود انتهى')
    expect(resCoupon?.quote).toEqual(quote)
  })

  it('rejects other HTTP statuses even if payload shape matches', () => {
    const quote = makeMockQuote()

    expect(
      parseOrderConflict({
        statusCode: 400,
        data: { code: 'CART_CHANGED', message: 'error', quote },
      }),
    ).toBeNull()

    expect(
      parseOrderConflict({
        statusCode: 500,
        data: { code: 'TOTAL_CHANGED', message: 'error', quote },
      }),
    ).toBeNull()
  })

  it('rejects other error codes or missing quote on 409', () => {
    const quote = makeMockQuote()

    // Invalid code
    expect(
      parseOrderConflict({
        statusCode: 409,
        data: { code: 'INVALID_CODE', message: 'error', quote },
      }),
    ).toBeNull()

    // Missing quote
    expect(
      parseOrderConflict({
        statusCode: 409,
        data: { code: 'CART_CHANGED', message: 'error' },
      }),
    ).toBeNull()

    // Malformed / primitive error
    expect(parseOrderConflict(null)).toBeNull()
    expect(parseOrderConflict('error string')).toBeNull()
    expect(parseOrderConflict({})).toBeNull()
  })
})

describe('checkout utils - orderPlacedEvent analytics', () => {
  it('returns only total and itemCount, stripping all customer PII', () => {
    const lines = [makeCartLine(2), makeCartLine(3)]
    const result = {
      no: 'SR-2026-000123',
      publicToken: 'secret-token-abcdef123456',
      total: 750000,
    }

    const event = orderPlacedEvent(result, lines)

    expect(event).toEqual({
      total: 750000,
      itemCount: 5,
    })

    // Strict privacy verification: no personal data in event object
    expect(event).not.toHaveProperty('name')
    expect(event).not.toHaveProperty('phone')
    expect(event).not.toHaveProperty('governorate')
    expect(event).not.toHaveProperty('city')
    expect(event).not.toHaveProperty('address')
  })
})

describe('checkout utils - couponReasonKey', () => {
  it('maps all defined coupon reason codes to their corresponding i18n keys', () => {
    expect(couponReasonKey('not_found')).toBe('store.checkout.coupon.reasons.not_found')
    expect(couponReasonKey('expired')).toBe('store.checkout.coupon.reasons.expired')
    expect(couponReasonKey('not_started')).toBe('store.checkout.coupon.reasons.not_started')
    expect(couponReasonKey('min_order')).toBe('store.checkout.coupon.reasons.min_order')
    expect(couponReasonKey('limit')).toBe('store.checkout.coupon.reasons.limit')
    expect(couponReasonKey('phone_limit')).toBe('store.checkout.coupon.reasons.phone_limit')
    expect(couponReasonKey('no_eligible')).toBe('store.checkout.coupon.reasons.no_eligible')
    expect(couponReasonKey('too_many_attempts')).toBe('store.checkout.coupon.reasons.too_many_attempts')
  })

  it('falls back to generic reason key for null, undefined, empty, or unknown codes', () => {
    expect(couponReasonKey(null)).toBe('store.checkout.coupon.reasons.generic')
    expect(couponReasonKey(undefined)).toBe('store.checkout.coupon.reasons.generic')
    expect(couponReasonKey('')).toBe('store.checkout.coupon.reasons.generic')
    expect(couponReasonKey('unknown_code')).toBe('store.checkout.coupon.reasons.generic')
    expect(couponReasonKey('INVALID_REASON')).toBe('store.checkout.coupon.reasons.generic')
  })
})
