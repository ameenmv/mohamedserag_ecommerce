import { describe, expect, it } from 'vitest'
import {
  adminReviewListQuerySchema,
  reviewInputSchema,
  reviewReplySchema,
} from './reviews-schema.js'

describe('reviews-schema (T002)', () => {
  describe('reviewInputSchema', () => {
    const validPayload = {
      productId: 'prod-123',
      stars: 5,
      text: 'منتج ممتاز جداً وجودة الخامات ممتازة وأنصح بالشراء',
      name: 'محمود عبد الله',
      phone: '01012345678',
    }

    it('accepts valid input and trims text and name', () => {
      const parsed = reviewInputSchema.safeParse({
        ...validPayload,
        name: '  محمود عبد الله  ',
        text: '  منتج ممتاز جداً وجودة الخامات ممتازة وأنصح بالشراء  ',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.name).toBe('محمود عبد الله')
        expect(parsed.data.text).toBe('منتج ممتاز جداً وجودة الخامات ممتازة وأنصح بالشراء')
        expect(parsed.data.stars).toBe(5)
        expect(parsed.data.phone).toBe('01012345678')
      }
    })

    it('normalizes Arabic-digit phone number', () => {
      const parsed = reviewInputSchema.safeParse({
        ...validPayload,
        phone: '٠١٠١٢٣٤٥٦٧٨',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.phone).toBe('01012345678')
      }
    })

    it('passes exactly 20-char text after trimming', () => {
      const twentyChars = '12345678901234567890'
      const parsed = reviewInputSchema.safeParse({
        ...validPayload,
        text: `   ${twentyChars}   `,
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.text).toBe(twentyChars)
      }
    })

    it('fails when text is whitespace only (even if length >= 20)', () => {
      const parsed = reviewInputSchema.safeParse({
        ...validPayload,
        text: ' '.repeat(30),
      })
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe('التقييم لازم يكون 20 حرف على الأقل')
      }
    })

    it('fails when text is less than 20 chars', () => {
      const parsed = reviewInputSchema.safeParse({
        ...validPayload,
        text: '1234567890123456789', // 19 chars
      })
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe('التقييم لازم يكون 20 حرف على الأقل')
      }
    })

    it('fails when text exceeds 1000 chars', () => {
      const parsed = reviewInputSchema.safeParse({
        ...validPayload,
        text: 'أ'.repeat(1001),
      })
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe('التقييم لا يزيد عن 1000 حرف')
      }
    })

    it('validates stars correctly (fails missing, 0, 6, 2.5)', () => {
      // missing
      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          stars: undefined,
        }).success,
      ).toBe(false)

      // 0
      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          stars: 0,
        }).success,
      ).toBe(false)

      // 6
      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          stars: 6,
        }).success,
      ).toBe(false)

      // 2.5 (non-integer)
      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          stars: 2.5,
        }).success,
      ).toBe(false)

      // 1 passes
      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          stars: 1,
        }).success,
      ).toBe(true)

      // 5 passes
      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          stars: 5,
        }).success,
      ).toBe(true)
    })

    it('fails on invalid phone or name', () => {
      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          phone: '0123456',
        }).success,
      ).toBe(false)

      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          name: '  أ  ', // 1 char after trim
        }).success,
      ).toBe(false)

      expect(
        reviewInputSchema.safeParse({
          ...validPayload,
          name: 'أ'.repeat(61),
        }).success,
      ).toBe(false)
    })

    it('allows optional honeypot field', () => {
      const parsed = reviewInputSchema.safeParse({
        ...validPayload,
        website: 'https://spam.example.com',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.website).toBe('https://spam.example.com')
      }
    })
  })

  describe('adminReviewListQuerySchema', () => {
    it('applies default query values', () => {
      const parsed = adminReviewListQuerySchema.parse({})
      expect(parsed).toEqual({
        status: 'pending',
        page: 1,
        pageSize: 20,
      })
    })

    it('coerces string numbers and trims search query', () => {
      const parsed = adminReviewListQuerySchema.parse({
        status: 'approved',
        q: '  سامسونج  ',
        stars: '4',
        page: '3',
        pageSize: '10',
      })
      expect(parsed).toEqual({
        status: 'approved',
        q: 'سامسونج',
        stars: 4,
        page: 3,
        pageSize: 10,
      })
    })

    it('rejects out of bounds stars or invalid status', () => {
      expect(
        adminReviewListQuerySchema.safeParse({
          stars: '0',
        }).success,
      ).toBe(false)

      expect(
        adminReviewListQuerySchema.safeParse({
          stars: '6',
        }).success,
      ).toBe(false)

      expect(
        adminReviewListQuerySchema.safeParse({
          status: 'unknown',
        }).success,
      ).toBe(false)
    })
  })

  describe('reviewReplySchema', () => {
    it('transforms empty string to null', () => {
      const parsed = reviewReplySchema.safeParse({ reply: '' })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.reply).toBeNull()
      }
    })

    it('transforms whitespace string to null', () => {
      const parsed = reviewReplySchema.safeParse({ reply: '    ' })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.reply).toBeNull()
      }
    })

    it('accepts explicit null', () => {
      const parsed = reviewReplySchema.safeParse({ reply: null })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.reply).toBeNull()
      }
    })

    it('accepts and trims valid reply string', () => {
      const parsed = reviewReplySchema.safeParse({ reply: '  شكراً لتقييمك ونتشرف بك دائماً  ' })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.reply).toBe('شكراً لتقييمك ونتشرف بك دائماً')
      }
    })

    it('fails when reply exceeds 500 characters', () => {
      const parsed = reviewReplySchema.safeParse({ reply: 'أ'.repeat(501) })
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe('الرد لا يتجاوز 500 حرف')
      }
    })
  })
})
