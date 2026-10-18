import { describe, expect, it } from 'vitest'
import {
  bridalAlternativesQuerySchema,
  bridalReserveQuoteQuerySchema,
  bridalReserveSchema,
  bridalRoomsSchema,
  bridalSettingsSchema,
  bridalTierUpdateSchema,
  bridalTokenSchema,
  createBridalListSchema,
  parseStoredRooms,
  saveBridalListSchema,
} from './bridal-schema.js'

describe('bridal-schema validation', () => {
  describe('bridalRoomsSchema', () => {
    it('validates and normalizes valid rooms input', () => {
      const input = [
        {
          key: 'living',
          items: [{ productId: 'p-tv', qty: 1 }],
        },
        {
          key: 'kitchen',
          items: [{ productId: 'p-fridge', qty: 2 }],
        },
      ]

      const parsed = bridalRoomsSchema.safeParse(input)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.map((r) => r.key)).toEqual(['kitchen', 'living'])
      }
    })

    it('rejects invalid room key', () => {
      const input = [
        {
          key: 'garage',
          items: [{ productId: 'p-car', qty: 1 }],
        },
      ]
      const parsed = bridalRoomsSchema.safeParse(input)
      expect(parsed.success).toBe(false)
    })

    it('rejects qty outside 1..10', () => {
      expect(
        bridalRoomsSchema.safeParse([
          { key: 'kitchen', items: [{ productId: 'p1', qty: 0 }] },
        ]).success,
      ).toBe(false)

      expect(
        bridalRoomsSchema.safeParse([
          { key: 'kitchen', items: [{ productId: 'p1', qty: 11 }] },
        ]).success,
      ).toBe(false)
    })

    it('rejects more than 40 items in one room', () => {
      const items = Array.from({ length: 41 }, (_, i) => ({
        productId: `p-${i}`,
        qty: 1,
      }))
      const parsed = bridalRoomsSchema.safeParse([{ key: 'kitchen', items }])
      expect(parsed.success).toBe(false)
    })

    it('rejects more than 120 total items across rooms', () => {
      const room1Items = Array.from({ length: 40 }, (_, i) => ({
        productId: `p1-${i}`,
        qty: 1,
      }))
      const room2Items = Array.from({ length: 40 }, (_, i) => ({
        productId: `p2-${i}`,
        qty: 1,
      }))
      const room3Items = Array.from({ length: 40 }, (_, i) => ({
        productId: `p3-${i}`,
        qty: 1,
      }))
      const room4Items = [{ productId: 'extra', qty: 1 }] // Total = 121

      const parsed = bridalRoomsSchema.safeParse([
        { key: 'kitchen', items: room1Items },
        { key: 'laundry', items: room2Items },
        { key: 'living', items: room3Items },
        { key: 'bedrooms', items: room4Items },
      ])
      expect(parsed.success).toBe(false)
    })
  })

  describe('parseStoredRooms', () => {
    it('parses valid stored rooms and tolerates legacy label field', () => {
      const stored = [
        {
          key: 'kitchen',
          label: 'المطبخ',
          items: [{ productId: 'p1', qty: 1 }],
        },
      ]
      const result = parseStoredRooms(stored)
      expect(result).toHaveLength(1)
      expect(result[0]!.key).toBe('kitchen')
      expect(result[0]!.items).toEqual([{ productId: 'p1', qty: 1 }])
    })

    it('returns empty array on invalid stored data', () => {
      expect(parseStoredRooms(null)).toEqual([])
      expect(parseStoredRooms('invalid')).toEqual([])
      expect(parseStoredRooms({ foo: 'bar' })).toEqual([])
    })
  })

  describe('createBridalListSchema', () => {
    it('accepts empty object, tierId only, or productId only', () => {
      expect(createBridalListSchema.safeParse({}).success).toBe(true)
      expect(createBridalListSchema.safeParse({ tierId: 'basic' }).success).toBe(true)
      expect(createBridalListSchema.safeParse({ productId: 'prod-1' }).success).toBe(true)
    })

    it('rejects having both tierId and productId', () => {
      const parsed = createBridalListSchema.safeParse({
        tierId: 'basic',
        productId: 'prod-1',
      })
      expect(parsed.success).toBe(false)
    })
  })

  describe('saveBridalListSchema', () => {
    it('validates { rooms: [...] } structure', () => {
      const valid = saveBridalListSchema.safeParse({
        rooms: [
          {
            key: 'kitchen',
            items: [{ productId: 'p1', qty: 2 }],
          },
        ],
      })
      expect(valid.success).toBe(true)
    })
  })

  describe('bridalSettingsSchema', () => {
    it('validates depositPct 1..50 and lockDays 7..180', () => {
      expect(bridalSettingsSchema.safeParse({ depositPct: 10, lockDays: 30 }).success).toBe(true)
      expect(bridalSettingsSchema.safeParse({ depositPct: 1, lockDays: 7 }).success).toBe(true)
      expect(bridalSettingsSchema.safeParse({ depositPct: 50, lockDays: 180 }).success).toBe(true)

      expect(bridalSettingsSchema.safeParse({ depositPct: 0, lockDays: 30 }).success).toBe(false)
      expect(bridalSettingsSchema.safeParse({ depositPct: 51, lockDays: 30 }).success).toBe(false)
      expect(bridalSettingsSchema.safeParse({ depositPct: 10, lockDays: 6 }).success).toBe(false)
      expect(bridalSettingsSchema.safeParse({ depositPct: 10, lockDays: 181 }).success).toBe(false)
    })
  })

  describe('bridalTierUpdateSchema', () => {
    it('validates tier update payload', () => {
      const valid = bridalTierUpdateSchema.safeParse({
        name: 'الباقة الذهبية',
        highlights: ['ميزة 1', 'ميزة 2'],
        rooms: [{ key: 'kitchen', items: [{ productId: 'p1', qty: 1 }] }],
      })
      expect(valid.success).toBe(true)

      const tooManyHighlights = bridalTierUpdateSchema.safeParse({
        name: 'باقة',
        highlights: ['1', '2', '3', '4', '5'],
        rooms: [],
      })
      expect(tooManyHighlights.success).toBe(false)
    })
  })

  describe('bridalTokenSchema', () => {
    it('validates base64url tokens of length 20..64', () => {
      const validToken = 'a'.repeat(32)
      expect(bridalTokenSchema.safeParse(validToken).success).toBe(true)

      const base64urlToken = 'ABC-_1234567890abcdefghijklmnopqrst'
      expect(bridalTokenSchema.safeParse(base64urlToken).success).toBe(true)

      expect(bridalTokenSchema.safeParse('short').success).toBe(false)
      expect(bridalTokenSchema.safeParse('a'.repeat(65)).success).toBe(false)
      expect(bridalTokenSchema.safeParse('invalid+token/with=special').success).toBe(false)
    })
  })

  describe('bridalAlternativesQuerySchema', () => {
    it('requires productId string', () => {
      expect(bridalAlternativesQuerySchema.safeParse({ productId: 'p1' }).success).toBe(true)
      expect(bridalAlternativesQuerySchema.safeParse({ productId: '' }).success).toBe(false)
      expect(bridalAlternativesQuerySchema.safeParse({}).success).toBe(false)
    })
  })

  describe('bridalReserveSchema', () => {
    const validCustomer = {
      name: 'فاطمة سراج',
      phone: '01012345678',
      governorate: 'الدقهلية',
      city: 'المنصورة',
      address: 'شارع الجمهورية',
    }

    it('accepts valid reserve input with transfer payment methods', () => {
      const valid = {
        customer: validCustomer,
        paymentMethod: 'instapay',
        idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
        expectedTotal: 500000,
      }
      expect(bridalReserveSchema.safeParse(valid).success).toBe(true)

      const withVodafone = { ...valid, paymentMethod: 'vodafone_cash' }
      expect(bridalReserveSchema.safeParse(withVodafone).success).toBe(true)

      const withFawry = { ...valid, paymentMethod: 'fawry' }
      expect(bridalReserveSchema.safeParse(withFawry).success).toBe(true)
    })

    it('rejects cod as payment method', () => {
      const invalid = {
        customer: validCustomer,
        paymentMethod: 'cod',
        idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
        expectedTotal: 500000,
      }
      expect(bridalReserveSchema.safeParse(invalid).success).toBe(false)
    })

    it('rejects invalid uuid idempotencyKey', () => {
      const invalid = {
        customer: validCustomer,
        paymentMethod: 'instapay',
        idempotencyKey: 'not-a-uuid',
        expectedTotal: 500000,
      }
      expect(bridalReserveSchema.safeParse(invalid).success).toBe(false)
    })

    it('validates preferredDate: allows future or today date, rejects past date', () => {
      const validFuture = {
        customer: validCustomer,
        preferredDate: '2099-12-31',
        paymentMethod: 'instapay',
        idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
        expectedTotal: 500000,
      }
      expect(bridalReserveSchema.safeParse(validFuture).success).toBe(true)

      const invalidPast = {
        ...validFuture,
        preferredDate: '2020-01-01',
      }
      expect(bridalReserveSchema.safeParse(invalidPast).success).toBe(false)

      const invalidFormat = {
        ...validFuture,
        preferredDate: '31/12/2099',
      }
      expect(bridalReserveSchema.safeParse(invalidFormat).success).toBe(false)
    })
  })

  describe('bridalReserveQuoteQuerySchema', () => {
    it('requires valid governorate and city', () => {
      expect(
        bridalReserveQuoteQuerySchema.safeParse({
          governorate: 'الدقهلية',
          city: 'المنصورة',
        }).success,
      ).toBe(true)

      expect(
        bridalReserveQuoteQuerySchema.safeParse({
          governorate: '',
          city: 'المنصورة',
        }).success,
      ).toBe(false)

      expect(
        bridalReserveQuoteQuerySchema.safeParse({
          governorate: 'الدقهلية',
          city: '',
        }).success,
      ).toBe(false)
    })
  })
})
