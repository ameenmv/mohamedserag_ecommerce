import { describe, expect, it } from 'vitest'
import {
  adminCouponListQuerySchema,
  adminFlashSaleListQuerySchema,
  couponInputSchema,
  flashSaleInputSchema,
  notifyMeInputSchema,
} from './promotions-schema.js'

describe('promotions-schema', () => {
  describe('flashSaleInputSchema', () => {
    const validFlashSale = {
      name: 'عرض الصيف الكبير',
      startsAt: '2026-10-19T10:00:00.000Z',
      endsAt: '2026-10-19T14:00:00.000Z',
      items: [
        { productId: 'prod-1', salePrice: 50_000 },
        { productId: 'prod-2', salePrice: 90_000 },
      ],
    }

    it('accepts valid flash sale input', () => {
      const parsed = flashSaleInputSchema.safeParse(validFlashSale)
      expect(parsed.success).toBe(true)
    })

    it('rejects end time earlier than or equal to start time', () => {
      const invalid = {
        ...validFlashSale,
        endsAt: '2026-10-19T09:00:00.000Z',
      }
      const parsed = flashSaleInputSchema.safeParse(invalid)
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe('تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية')
      }
    })

    it('rejects duplicate products in items list', () => {
      const duplicateItems = {
        ...validFlashSale,
        items: [
          { productId: 'prod-1', salePrice: 50_000 },
          { productId: 'prod-1', salePrice: 45_000 },
        ],
      }
      const parsed = flashSaleInputSchema.safeParse(duplicateItems)
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe('لا يمكن تكرار نفس المنتج في العرض')
      }
    })

    it('rejects non-positive sale price or empty items', () => {
      expect(
        flashSaleInputSchema.safeParse({
          ...validFlashSale,
          items: [{ productId: 'prod-1', salePrice: 0 }],
        }).success,
      ).toBe(false)

      expect(
        flashSaleInputSchema.safeParse({
          ...validFlashSale,
          items: [],
        }).success,
      ).toBe(false)
    })
  })

  describe('couponInputSchema', () => {
    it('normalizes coupon code to upper-case and trims', () => {
      const parsed = couponInputSchema.safeParse({
        code: '  welcome20  ',
        type: 'percent',
        value: 20,
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.code).toBe('WELCOME20')
        expect(parsed.data.minOrder).toBe(0)
        expect(parsed.data.active).toBe(true)
      }
    })

    it('validates percent value range (1 to 90)', () => {
      expect(
        couponInputSchema.safeParse({
          code: 'TEST95',
          type: 'percent',
          value: 95,
        }).success,
      ).toBe(false)

      expect(
        couponInputSchema.safeParse({
          code: 'TEST0',
          type: 'percent',
          value: 0,
        }).success,
      ).toBe(false)

      expect(
        couponInputSchema.safeParse({
          code: 'TEST90',
          type: 'percent',
          value: 90,
        }).success,
      ).toBe(true)
    })

    it('validates fixed value > 0', () => {
      expect(
        couponInputSchema.safeParse({
          code: 'FIXED0',
          type: 'fixed',
          value: 0,
        }).success,
      ).toBe(false)

      expect(
        couponInputSchema.safeParse({
          code: 'FIXED100',
          type: 'fixed',
          value: 10_000,
        }).success,
      ).toBe(true)
    })

    it('rejects end time earlier than start time', () => {
      const parsed = couponInputSchema.safeParse({
        code: 'TIMED',
        type: 'fixed',
        value: 5_000,
        startsAt: '2026-10-25T00:00:00.000Z',
        endsAt: '2026-10-20T00:00:00.000Z',
      })
      expect(parsed.success).toBe(false)
    })

    it('rejects invalid code characters', () => {
      expect(
        couponInputSchema.safeParse({
          code: 'INVALID!',
          type: 'fixed',
          value: 1_000,
        }).success,
      ).toBe(false)
    })
  })

  describe('notifyMeInputSchema', () => {
    it('accepts valid input and normalizes Egyptian phone number with Arabic digits', () => {
      const parsed = notifyMeInputSchema.safeParse({
        productId: 'prod-abc',
        name: 'أحمد محمود',
        phone: '٠١٠١٢٣٤٥٦٧٨',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.phone).toBe('01012345678')
      }
    })

    it('rejects invalid phone or short name', () => {
      expect(
        notifyMeInputSchema.safeParse({
          productId: 'prod-abc',
          name: 'أ',
          phone: '01012345678',
        }).success,
      ).toBe(false)

      expect(
        notifyMeInputSchema.safeParse({
          productId: 'prod-abc',
          name: 'أحمد محمود',
          phone: '12345',
        }).success,
      ).toBe(false)
    })
  })

  describe('admin query schemas', () => {
    it('parses adminFlashSaleListQuerySchema with defaults and coercion', () => {
      const parsed = adminFlashSaleListQuerySchema.parse({ page: '2', pageSize: '50' })
      expect(parsed).toEqual({
        page: 2,
        pageSize: 50,
      })
    })

    it('parses adminCouponListQuerySchema with defaults and coercion', () => {
      const parsed = adminCouponListQuerySchema.parse({})
      expect(parsed).toEqual({
        page: 1,
        pageSize: 20,
      })
    })
  })
})
