import { describe, expect, it } from 'vitest'
import {
  BRIDAL_MAX_LIST_ITEMS,
  BRIDAL_MAX_QTY,
  BRIDAL_MAX_ROOM_ITEMS,
  BRIDAL_ROOM_KEYS,
  CATEGORY_ROOM,
  addItemToRooms,
  bridalDeposit,
  buildBridalReserveQuote,
  cairoToday,
  lockEndDate,
  lockState,
  normalizeRooms,
  priceRooms,
  roomForCategory,
  type BridalProductRecord,
  type BridalRoomKey,
  type BridalRoom,
} from './bridal.js'

describe('bridal domain helpers', () => {
  describe('room constants & category mapping', () => {
    it('defines fixed BRIDAL_ROOM_KEYS in canonical order', () => {
      expect(BRIDAL_ROOM_KEYS).toEqual([
        'kitchen',
        'laundry',
        'living',
        'bedrooms',
        'small_appliances',
        'kitchenware',
      ])
    })

    it('maps known categories to appropriate room keys', () => {
      expect(CATEGORY_ROOM).toEqual({
        refrigerators: 'kitchen',
        cookers: 'kitchen',
        washers: 'laundry',
        tvs: 'living',
        acs: 'bedrooms',
        cookware: 'kitchenware',
      })
      expect(roomForCategory('refrigerators')).toBe('kitchen')
      expect(roomForCategory('cookers')).toBe('kitchen')
      expect(roomForCategory('washers')).toBe('laundry')
      expect(roomForCategory('tvs')).toBe('living')
      expect(roomForCategory('acs')).toBe('bedrooms')
      expect(roomForCategory('cookware')).toBe('kitchenware')
    })

    it('falls back to small_appliances for unknown or missing category slug', () => {
      expect(roomForCategory('microwaves')).toBe('small_appliances')
      expect(roomForCategory('')).toBe('small_appliances')
      expect(roomForCategory(null)).toBe('small_appliances')
      expect(roomForCategory(undefined)).toBe('small_appliances')
    })

    it('declares defined limits', () => {
      expect(BRIDAL_MAX_QTY).toBe(10)
      expect(BRIDAL_MAX_ROOM_ITEMS).toBe(40)
      expect(BRIDAL_MAX_LIST_ITEMS).toBe(120)
    })
  })

  describe('normalizeRooms', () => {
    it('sorts rooms in canonical BRIDAL_ROOM_KEYS order', () => {
      const input: BridalRoom[] = [
        { key: 'bedrooms', items: [{ productId: 'p-bed', qty: 1 }] },
        { key: 'kitchen', items: [{ productId: 'p-fridge', qty: 1 }] },
        { key: 'laundry', items: [{ productId: 'p-wash', qty: 1 }] },
      ]

      const normalized = normalizeRooms(input)
      expect(normalized.map((r) => r.key)).toEqual(['kitchen', 'laundry', 'bedrooms'])
    })

    it('merges rooms with the same key and merges duplicate products, capping qty at 10', () => {
      const input: BridalRoom[] = [
        {
          key: 'kitchen',
          items: [
            { productId: 'p1', qty: 3 },
            { productId: 'p2', qty: 2 },
          ],
        },
        {
          key: 'kitchen',
          items: [
            { productId: 'p1', qty: 9 }, // 3 + 9 = 12 -> capped at 10
            { productId: 'p3', qty: 1 },
          ],
        },
      ]

      const normalized = normalizeRooms(input)
      expect(normalized).toHaveLength(1)
      expect(normalized[0]!.key).toBe('kitchen')
      expect(normalized[0]!.items).toEqual([
        { productId: 'p1', qty: 10 },
        { productId: 'p2', qty: 2 },
        { productId: 'p3', qty: 1 },
      ])
    })

    it('excludes empty rooms and invalid room keys', () => {
      const input: BridalRoom[] = [
        { key: 'kitchen', items: [] },
        { key: 'unknown' as unknown as BridalRoomKey, items: [{ productId: 'p1', qty: 1 }] },
        { key: 'living', items: [{ productId: 'p-tv', qty: 1 }] },
      ]

      const normalized = normalizeRooms(input)
      expect(normalized).toHaveLength(1)
      expect(normalized[0]!.key).toBe('living')
    })
  })

  describe('addItemToRooms', () => {
    it('adds item to existing room and renormalizes', () => {
      const rooms: BridalRoom[] = [
        { key: 'kitchen', items: [{ productId: 'p1', qty: 2 }] },
      ]

      const result = addItemToRooms(rooms, 'kitchen', 'p1', 3)
      expect(result).toHaveLength(1)
      expect(result[0]!.items).toEqual([{ productId: 'p1', qty: 5 }])
    })

    it('adds item to a new room and preserves canonical key order', () => {
      const rooms: BridalRoom[] = [
        { key: 'living', items: [{ productId: 'p-tv', qty: 1 }] },
      ]

      const result = addItemToRooms(rooms, 'kitchen', 'p-fridge', 1)
      expect(result.map((r) => r.key)).toEqual(['kitchen', 'living'])
    })
  })

  describe('priceRooms', () => {
    const mockProducts = new Map<string, BridalProductRecord>([
      [
        'prod-fridge',
        {
          id: 'prod-fridge',
          slug: 'fridge-18',
          name: 'ثلاجة 18 قدم',
          modelCode: 'SR-S1',
          imageUrl: '/img/fridge.jpg',
          categorySlug: 'refrigerators',
          price: 2500000, // 25,000 EGP
          stock: 5,
          availabilityMode: 'auto',
          leadTimeText: null,
          purchasable: true,
        },
      ],
      [
        'prod-out',
        {
          id: 'prod-out',
          slug: 'washer-out',
          name: 'غسالة نافذة',
          modelCode: 'SR-S2',
          imageUrl: '/img/washer.jpg',
          categorySlug: 'washers',
          price: 1500000,
          stock: 0,
          availabilityMode: 'auto',
          leadTimeText: null,
          purchasable: true,
        },
      ],
      [
        'prod-request',
        {
          id: 'prod-request',
          slug: 'cooker-request',
          name: 'بوتاجاز بالطلب',
          modelCode: 'SR-S3',
          imageUrl: null,
          categorySlug: 'cookers',
          price: 1200000,
          stock: 0,
          availabilityMode: 'on_request',
          leadTimeText: 'خلال 7 أيام',
          purchasable: true,
        },
      ],
    ])

    it('prices available items and excludes unavailable lines from total', () => {
      const rooms: BridalRoom[] = [
        {
          key: 'kitchen',
          items: [
            { productId: 'prod-fridge', qty: 2 }, // 2 * 25,000 = 50,000 EGP
            { productId: 'prod-request', qty: 1 }, // 1 * 12,000 = 12,000 EGP
          ],
        },
        {
          key: 'laundry',
          items: [
            { productId: 'prod-out', qty: 1 }, // 15,000 EGP, out of stock
            { productId: 'prod-missing', qty: 1 }, // Missing entirely, dropped
          ],
        },
      ]

      const priced = priceRooms(rooms, mockProducts)

      expect(priced.total).toBe(6200000) // 50,000 + 12,000 = 62,000 EGP in piastres
      expect(priced.unavailable).toBe(1) // prod-out is unavailable
      expect(priced.itemCount).toBe(4) // 2 fridge + 1 request + 1 out = 4 (missing is dropped)

      expect(priced.rooms).toHaveLength(2)
      const kitchen = priced.rooms.find((r) => r.key === 'kitchen')!
      expect(kitchen.subtotal).toBe(6200000)
      expect(kitchen.items).toHaveLength(2)
      expect(kitchen.items[0]!.available).toBe(true)
      expect(kitchen.items[1]!.available).toBe(true)

      const laundry = priced.rooms.find((r) => r.key === 'laundry')!
      expect(laundry.subtotal).toBe(0) // Only unavailable item, subtotal is 0
      expect(laundry.items).toHaveLength(1) // Missing item dropped
      expect(laundry.items[0]!.available).toBe(false)
      expect(laundry.items[0]!.unitPrice).toBe(1500000)
    })
  })

  describe('bridalDeposit', () => {
    it('calculates rounded deposit in piastres', () => {
      expect(bridalDeposit(1000000, 10)).toBe(100000) // 10% of 10,000 EGP = 1,000 EGP
      expect(bridalDeposit(333333, 10)).toBe(33333) // Math.round(33333.3)
      expect(bridalDeposit(0, 10)).toBe(0)
      expect(bridalDeposit(-100, 10)).toBe(0)
    })
  })

  describe('lockEndDate', () => {
    it('computes 23:59:59.999 Africa/Cairo for a winter date (standard time UTC+2)', () => {
      // 2026-01-10T12:00:00Z + 30 days = 2026-02-09
      // In winter, Cairo is UTC+2, so 23:59:59.999 Cairo is 21:59:59.999 UTC
      const from = new Date('2026-01-10T12:00:00Z')
      const end = lockEndDate(from, 30)

      expect(end.toISOString()).toBe('2026-02-09T21:59:59.999Z')

      // Verify formatted in Africa/Cairo
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      expect(formatter.format(end)).toBe('2026-02-09')
    })

    it('computes 23:59:59.999 Africa/Cairo for a summer date (DST UTC+3)', () => {
      // 2026-06-10T12:00:00Z + 30 days = 2026-07-10
      // In summer, Cairo observes DST (UTC+3), so 23:59:59.999 Cairo is 20:59:59.999 UTC
      const from = new Date('2026-06-10T12:00:00Z')
      const end = lockEndDate(from, 30)

      expect(end.toISOString()).toBe('2026-07-10T20:59:59.999Z')

      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      expect(formatter.format(end)).toBe('2026-07-10')
    })
  })

  describe('lockState', () => {
    it('returns null daysLeft when not locked', () => {
      const state = lockState(
        { bridalStatus: 'awaiting_deposit', lockedUntil: new Date('2026-11-10T21:59:59.999Z') },
        new Date('2026-10-18T10:00:00Z'),
      )
      expect(state).toEqual({ expired: false, daysLeft: null })
    })

    it('calculates daysLeft and expired status correctly', () => {
      const lockedUntil = new Date('2026-10-25T20:59:59.999Z') // 2026-10-25 end of day Cairo
      const nowActive = new Date('2026-10-20T10:00:00Z') // 5 days left

      const stateActive = lockState({ bridalStatus: 'locked', lockedUntil }, nowActive)
      expect(stateActive.expired).toBe(false)
      expect(stateActive.daysLeft).toBe(5)

      // On the last day
      const nowLastDay = new Date('2026-10-25T12:00:00Z')
      const stateLastDay = lockState({ bridalStatus: 'locked', lockedUntil }, nowLastDay)
      expect(stateLastDay.expired).toBe(false)
      expect(stateLastDay.daysLeft).toBe(0)

      // After expiration
      const nowExpired = new Date('2026-10-26T00:05:00Z')
      const stateExpired = lockState({ bridalStatus: 'locked', lockedUntil }, nowExpired)
      expect(stateExpired.expired).toBe(true)
      expect(stateExpired.daysLeft).toBe(0)
    })
  })

  describe('cairoToday', () => {
    it('returns YYYY-MM-DD formatted date in Africa/Cairo', () => {
      // 2026-10-18 22:30 UTC is 2026-10-19 01:30 Cairo (+3)
      const dateLateUtc = new Date('2026-10-18T22:30:00Z')
      expect(cairoToday(dateLateUtc)).toBe('2026-10-19')

      const dateEarlyUtc = new Date('2026-10-18T10:00:00Z')
      expect(cairoToday(dateEarlyUtc)).toBe('2026-10-18')

      expect(cairoToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('buildBridalReserveQuote', () => {
    it('correctly calculates totals, delivery fee, and deposit amount', () => {
      const priced = {
        rooms: [],
        itemCount: 5,
        total: 500_000, // 5,000 EGP
        unavailable: 0,
      }
      const zone = {
        name: 'المنصورة',
        fee: 10_000, // 100 EGP
      }
      const settings = {
        depositPct: 10,
        lockDays: 30,
      }

      const quote = buildBridalReserveQuote(priced, zone, settings)
      expect(quote).toEqual({
        subtotal: 500_000,
        deliveryFee: 10_000,
        total: 510_000,
        depositPct: 10,
        depositAmount: 51_000, // Math.round(510_000 * 0.1)
        lockDays: 30,
        zoneName: 'المنصورة',
      })
    })
  })
})
