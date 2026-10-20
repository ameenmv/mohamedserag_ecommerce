import { describe, expect, it } from 'vitest'
import {
  applyFlashToPrice,
  couponStatus,
  evaluateCoupon,
  flashStatus,
  isFlashActive,
  normalizeCouponCode,
  type CouponLine,
  type CouponRule,
} from './promotions.js'

describe('promotions shared pure domain', () => {
  describe('flashStatus and isFlashActive', () => {
    const startsAt = '2026-10-19T10:00:00.000Z'
    const endsAt = '2026-10-19T12:00:00.000Z'

    it('identifies scheduled flash sales before startsAt', () => {
      const now = '2026-10-19T09:59:59.999Z'
      expect(flashStatus({ startsAt, endsAt }, now)).toBe('scheduled')
      expect(isFlashActive({ startsAt, endsAt }, now)).toBe(false)
    })

    it('identifies running flash sales between startsAt (inclusive) and endsAt (exclusive)', () => {
      expect(flashStatus({ startsAt, endsAt }, '2026-10-19T10:00:00.000Z')).toBe('running')
      expect(isFlashActive({ startsAt, endsAt }, '2026-10-19T10:00:00.000Z')).toBe(true)

      expect(flashStatus({ startsAt, endsAt }, '2026-10-19T11:00:00.000Z')).toBe('running')
      expect(isFlashActive({ startsAt, endsAt }, '2026-10-19T11:00:00.000Z')).toBe(true)

      expect(flashStatus({ startsAt, endsAt }, '2026-10-19T11:59:59.999Z')).toBe('running')
      expect(isFlashActive({ startsAt, endsAt }, '2026-10-19T11:59:59.999Z')).toBe(true)
    })

    it('identifies ended flash sales at and after endsAt', () => {
      expect(flashStatus({ startsAt, endsAt }, '2026-10-19T12:00:00.000Z')).toBe('ended')
      expect(isFlashActive({ startsAt, endsAt }, '2026-10-19T12:00:00.000Z')).toBe(false)

      expect(flashStatus({ startsAt, endsAt }, '2026-10-19T13:00:00.000Z')).toBe('ended')
      expect(isFlashActive({ startsAt, endsAt }, '2026-10-19T13:00:00.000Z')).toBe(false)
    })
  })

  describe('applyFlashToPrice', () => {
    it('sets salePrice as price, regular price as oldPrice, and calculates discountPercent when flash is active', () => {
      const regularProduct = { price: 100_000, oldPrice: null }
      const flash = { salePrice: 70_000, endsAt: '2026-10-19T12:00:00.000Z' }

      const result = applyFlashToPrice(regularProduct, flash)
      expect(result).toEqual({
        price: 70_000,
        oldPrice: 100_000,
        discountPercent: 30, // ((100000 - 70000) / 100000) * 100 = 30
      })
    })

    it('ignores previous oldPrice when flash is active, using current regular price as struck-through', () => {
      const productWithOldPrice = { price: 200_000, oldPrice: 250_000 }
      const flash = { salePrice: 160_000, endsAt: '2026-10-19T12:00:00.000Z' }

      const result = applyFlashToPrice(productWithOldPrice, flash)
      expect(result).toEqual({
        price: 160_000,
        oldPrice: 200_000,
        discountPercent: 20, // ((200000 - 160000) / 200000) * 100 = 20
      })
    })

    it('falls back to standard pricing when flash is null', () => {
      const discountedProduct = { price: 80_000, oldPrice: 100_000 }
      expect(applyFlashToPrice(discountedProduct, null)).toEqual({
        price: 80_000,
        oldPrice: 100_000,
        discountPercent: 20,
      })

      const regularProduct = { price: 100_000, oldPrice: null }
      expect(applyFlashToPrice(regularProduct, null)).toEqual({
        price: 100_000,
        oldPrice: null,
        discountPercent: null,
      })

      const invalidOldPrice = { price: 100_000, oldPrice: 90_000 }
      expect(applyFlashToPrice(invalidOldPrice, null)).toEqual({
        price: 100_000,
        oldPrice: 90_000,
        discountPercent: null,
      })
    })
  })

  describe('normalizeCouponCode', () => {
    it('trims whitespace and converts to upper case', () => {
      expect(normalizeCouponCode('  serag10  ')).toBe('SERAG10')
      expect(normalizeCouponCode('summer_2026-vip')).toBe('SUMMER_2026-VIP')
    })
  })

  describe('couponStatus', () => {
    it('returns inactive if active is false', () => {
      expect(couponStatus({ active: false })).toBe('inactive')
      expect(couponStatus({ active: false, startsAt: '2020-01-01', endsAt: '2030-01-01' })).toBe('inactive')
    })

    it('returns scheduled if now is before startsAt', () => {
      expect(
        couponStatus(
          { active: true, startsAt: '2026-10-20T00:00:00Z', endsAt: '2026-10-25T00:00:00Z' },
          '2026-10-19T00:00:00Z',
        ),
      ).toBe('scheduled')
    })

    it('returns expired if now is at or after endsAt', () => {
      expect(
        couponStatus(
          { active: true, startsAt: '2026-10-10T00:00:00Z', endsAt: '2026-10-18T00:00:00Z' },
          '2026-10-19T00:00:00Z',
        ),
      ).toBe('expired')
    })

    it('returns running when active and within dates or without dates', () => {
      expect(couponStatus({ active: true })).toBe('running')
      expect(
        couponStatus(
          { active: true, startsAt: '2026-10-18T00:00:00Z', endsAt: '2026-10-20T00:00:00Z' },
          '2026-10-19T00:00:00Z',
        ),
      ).toBe('running')
    })
  })

  describe('evaluateCoupon', () => {
    const baseRule: CouponRule = {
      id: 'c1',
      code: 'SERAG10',
      type: 'percent',
      value: 10,
      minOrder: 0,
      startsAt: null,
      endsAt: null,
      maxUses: null,
      maxUsesPerPhone: null,
      categoryIds: [],
      brandIds: [],
      active: true,
    }

    const eligibleLine: CouponLine = {
      productId: 'p1',
      lineTotal: 600_000, // 6,000 EGP
      onFlash: false,
      hasOldPriceDiscount: false,
      categoryId: 'cat-fridges',
      brandId: 'brand-sharp',
    }

    const flashLine: CouponLine = {
      productId: 'p2',
      lineTotal: 400_000,
      onFlash: true,
      hasOldPriceDiscount: false,
      categoryId: 'cat-fridges',
      brandId: 'brand-sharp',
    }

    const oldPriceLine: CouponLine = {
      productId: 'p3',
      lineTotal: 300_000,
      onFlash: false,
      hasOldPriceDiscount: true,
      categoryId: 'cat-washers',
      brandId: 'brand-toshiba',
    }

    it('refuses with not_found when rule is missing', () => {
      const res = evaluateCoupon(null, [eligibleLine])
      expect(res).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'not_found',
        reason: 'الكود ده مش موجود',
      })
    })

    it('refuses with expired when coupon is deactivated', () => {
      const res = evaluateCoupon({ ...baseRule, active: false }, [eligibleLine])
      expect(res).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'expired',
        reason: 'الكود انتهى',
      })
    })

    it('refuses with not_started before startsAt', () => {
      const res = evaluateCoupon(
        { ...baseRule, startsAt: '2026-10-20T00:00:00Z' },
        [eligibleLine],
        { now: '2026-10-19T00:00:00Z' },
      )
      expect(res).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'not_started',
        reason: 'الكود لسه مبدأش',
      })
    })

    it('refuses with expired after endsAt', () => {
      const res = evaluateCoupon(
        { ...baseRule, endsAt: '2026-10-18T00:00:00Z' },
        [eligibleLine],
        { now: '2026-10-19T00:00:00Z' },
      )
      expect(res).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'expired',
        reason: 'الكود انتهى',
      })
    })

    it('refuses with no_eligible when all cart items are on flash or have old price discount', () => {
      const res = evaluateCoupon(baseRule, [flashLine, oldPriceLine])
      expect(res).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'no_eligible',
        reason: 'الكود ده مش على المنتجات اللي في السلة',
      })
    })

    it('enforces category and brand scopes and ignores ineligible lines', () => {
      const categoryScopedRule: CouponRule = {
        ...baseRule,
        categoryIds: ['cat-cookers'],
      }
      expect(evaluateCoupon(categoryScopedRule, [eligibleLine])).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'no_eligible',
        reason: 'الكود ده مش على المنتجات اللي في السلة',
      })

      const combinedScopeRule: CouponRule = {
        ...baseRule,
        categoryIds: ['cat-fridges'],
        brandIds: ['brand-toshiba'], // mismatch brand
      }
      expect(evaluateCoupon(combinedScopeRule, [eligibleLine])).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 0,
        reasonCode: 'no_eligible',
        reason: 'الكود ده مش على المنتجات اللي في السلة',
      })
    })

    it('calculates percent discount on eligible lines only and rounds to integer piastres', () => {
      const mixedCart = [eligibleLine, flashLine, oldPriceLine]
      // eligibleSubtotal = 600,000; 10% = 60,000
      const res = evaluateCoupon(baseRule, mixedCart)
      expect(res).toEqual({
        status: 'applied',
        discount: 60_000,
        eligibleSubtotal: 600_000,
        reasonCode: null,
        reason: null,
      })
    })

    it('refuses with min_order showing formatted amount when eligible subtotal is below minimum', () => {
      const minOrderRule: CouponRule = {
        ...baseRule,
        minOrder: 700_000, // 7,000 EGP (eligible is 6,000 EGP)
      }
      const res = evaluateCoupon(minOrderRule, [eligibleLine])
      expect(res).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 600_000,
        reasonCode: 'min_order',
        reason: 'الحد الأدنى للطلب 7,000 ج.م',
      })
    })

    it('refuses with limit when activeUses reaches maxUses', () => {
      const limitedRule: CouponRule = {
        ...baseRule,
        maxUses: 5,
      }
      const res = evaluateCoupon(limitedRule, [eligibleLine], { activeUses: 5 })
      expect(res).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 600_000,
        reasonCode: 'limit',
        reason: 'الكود ده خلص',
      })
    })

    it('refuses with phone_limit when phoneUses reaches maxUsesPerPhone', () => {
      const phoneLimitedRule: CouponRule = {
        ...baseRule,
        maxUsesPerPhone: 1,
      }
      // phoneUses is null (e.g. quote stage before phone is entered) -> applies
      expect(evaluateCoupon(phoneLimitedRule, [eligibleLine], { phoneUses: null }).status).toBe('applied')

      // phoneUses is 1 -> rejected
      const res = evaluateCoupon(phoneLimitedRule, [eligibleLine], { phoneUses: 1 })
      expect(res).toEqual({
        status: 'rejected',
        discount: 0,
        eligibleSubtotal: 600_000,
        reasonCode: 'phone_limit',
        reason: 'استخدمت الكود ده قبل كده',
      })
    })

    it('caps fixed discount at eligible subtotal', () => {
      const fixedRule: CouponRule = {
        ...baseRule,
        type: 'fixed',
        value: 1_000_000, // 10,000 EGP discount on 6,000 EGP item
      }
      const res = evaluateCoupon(fixedRule, [eligibleLine])
      expect(res).toEqual({
        status: 'applied',
        discount: 600_000, // capped at 600,000
        eligibleSubtotal: 600_000,
        reasonCode: null,
        reason: null,
      })
    })
  })
})
