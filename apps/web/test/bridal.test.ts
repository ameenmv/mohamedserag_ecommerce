import { describe, expect, it } from 'vitest'
import type { BridalListView, BridalRoom } from '@serag/shared'
import {
  applyQty,
  classifyDiff,
  estimateTotals,
  parseBridalConflict,
  removeItem,
  swapItem,
  toRooms,
  waShareLink,
  type PriceIndex,
} from '../app/utils/bridal'

describe('bridal utils - applyQty', () => {
  const initialRooms: BridalRoom[] = [
    {
      key: 'kitchen',
      items: [
        { productId: 'p1', qty: 1 },
        { productId: 'p2', qty: 2 },
      ],
    },
  ]

  it('updates quantity of target product', () => {
    const updated = applyQty(initialRooms, 'kitchen', 'p1', 5)
    const kitchen = updated.find((r) => r.key === 'kitchen')
    expect(kitchen?.items.find((i) => i.productId === 'p1')?.qty).toBe(5)
    expect(kitchen?.items.find((i) => i.productId === 'p2')?.qty).toBe(2)
  })

  it('clamps quantity between 1 and 10', () => {
    const capped = applyQty(initialRooms, 'kitchen', 'p1', 99)
    expect(capped[0]?.items.find((i) => i.productId === 'p1')?.qty).toBe(10)

    const floored = applyQty(initialRooms, 'kitchen', 'p1', -5)
    expect(floored[0]?.items.find((i) => i.productId === 'p1')?.qty).toBe(1)
  })
})

describe('bridal utils - removeItem', () => {
  it('removes item from specified room', () => {
    const rooms: BridalRoom[] = [
      {
        key: 'kitchen',
        items: [
          { productId: 'p1', qty: 1 },
          { productId: 'p2', qty: 2 },
        ],
      },
    ]

    const updated = removeItem(rooms, 'kitchen', 'p1')
    expect(updated[0]?.items).toEqual([{ productId: 'p2', qty: 2 }])
  })

  it('drops room when it has no items left', () => {
    const rooms: BridalRoom[] = [
      {
        key: 'kitchen',
        items: [{ productId: 'p1', qty: 1 }],
      },
      {
        key: 'laundry',
        items: [{ productId: 'p3', qty: 1 }],
      },
    ]

    const updated = removeItem(rooms, 'kitchen', 'p1')
    expect(updated.map((r) => r.key)).toEqual(['laundry'])
  })
})

describe('bridal utils - swapItem', () => {
  it('swaps fromId to toId keeping current quantity', () => {
    const rooms: BridalRoom[] = [
      {
        key: 'kitchen',
        items: [{ productId: 'p1', qty: 3 }],
      },
    ]

    const updated = swapItem(rooms, 'kitchen', 'p1', 'p2')
    expect(updated[0]?.items).toEqual([{ productId: 'p2', qty: 3 }])
  })

  it('merges quantities when target item already exists in that room (capped at 10)', () => {
    const rooms: BridalRoom[] = [
      {
        key: 'kitchen',
        items: [
          { productId: 'p1', qty: 4 },
          { productId: 'p2', qty: 8 },
        ],
      },
    ]

    const updated = swapItem(rooms, 'kitchen', 'p1', 'p2')
    expect(updated[0]?.items).toEqual([{ productId: 'p2', qty: 10 }])
  })

  it('leaves rooms unchanged if fromId is not found', () => {
    const rooms: BridalRoom[] = [
      {
        key: 'kitchen',
        items: [{ productId: 'p1', qty: 1 }],
      },
    ]

    const updated = swapItem(rooms, 'kitchen', 'unknown-id', 'p2')
    expect(updated[0]?.items).toEqual([{ productId: 'p1', qty: 1 }])
  })
})

describe('bridal utils - toRooms', () => {
  it('extracts BridalRooms from BridalListView', () => {
    const view: BridalListView = {
      mode: 'edit',
      editToken: 'token123',
      shareToken: 'share123',
      status: 'draft',
      tier: null,
      rooms: [
        {
          key: 'kitchen',
          subtotal: 500000,
          items: [
            {
              productId: 'p1',
              slug: 'p1-slug',
              name: 'ثلاجة',
              modelCode: 'SR-1',
              imageUrl: null,
              categorySlug: 'refrigerators',
              qty: 2,
              unitPrice: 250000,
              lineTotal: 500000,
              available: true,
              availabilityMode: 'auto',
              leadTimeText: null,
            },
          ],
        },
      ],
      itemCount: 2,
      total: 500000,
      issues: { unavailable: 0 },
      reservation: null,
    }

    const rooms = toRooms(view)
    expect(rooms).toEqual([
      {
        key: 'kitchen',
        items: [{ productId: 'p1', qty: 2 }],
      },
    ])
  })
})

describe('bridal utils - estimateTotals', () => {
  const priceIndex: PriceIndex = {
    p1: { unitPrice: 100000, available: true },
    p2: { unitPrice: 200000, available: true },
    p3: { unitPrice: 300000, available: false },
  }

  it('calculates totals, counts, and room subtotals', () => {
    const rooms: BridalRoom[] = [
      {
        key: 'kitchen',
        items: [
          { productId: 'p1', qty: 2 }, // 200,000
          { productId: 'p3', qty: 1 }, // unavailable
        ],
      },
      {
        key: 'laundry',
        items: [
          { productId: 'p2', qty: 3 }, // 600,000
          { productId: 'p_unknown', qty: 1 }, // unknown counts 0
        ],
      },
    ]

    const res = estimateTotals(rooms, priceIndex)
    expect(res.total).toBe(800000)
    expect(res.itemCount).toBe(7)
    expect(res.unavailable).toBe(1)
    expect(res.roomSubtotals.kitchen).toBe(200000)
    expect(res.roomSubtotals.laundry).toBe(600000)
    expect(res.roomSubtotals.living).toBe(0)
  })
})

describe('bridal utils - waShareLink', () => {
  it('generates a valid wa.me share URL with encoded text', () => {
    const link = waShareLink('قائمة جهاز بيتي: 50,000 ج.م')
    expect(link).toBe('https://wa.me/?text=%D9%82%D8%A7%D8%A6%D9%85%D8%A9%20%D8%AC%D9%87%D8%A7%D8%B2%20%D8%A8%D9%8A%D8%AA%D9%8A%3A%2050%2C000%20%D8%AC.%D9%85')
  })
})

describe('bridal utils - classifyDiff', () => {
  it('classifies positive differences as "more"', () => {
    expect(classifyDiff(100)).toBe('more')
    expect(classifyDiff(1)).toBe('more')
    expect(classifyDiff(0.5)).toBe('more')
  })

  it('classifies negative differences as "less"', () => {
    expect(classifyDiff(-100)).toBe('less')
    expect(classifyDiff(-1)).toBe('less')
    expect(classifyDiff(-0.5)).toBe('less')
  })

  it('classifies zero difference as "same"', () => {
    expect(classifyDiff(0)).toBe('same')
    expect(classifyDiff(-0)).toBe('same')
  })
})

describe('bridal utils - parseBridalConflict', () => {
  const mockQuote = {
    subtotal: 5000000,
    deliveryFee: 15000,
    total: 5015000,
    depositPct: 10,
    depositAmount: 501500,
    lockDays: 30,
    zoneName: 'المنصورة',
  }

  it('extracts PRICE_CHANGED conflict with quote from data', () => {
    const error = {
      statusCode: 409,
      data: {
        code: 'PRICE_CHANGED',
        message: 'الأسعار اتغيرت، راجعي الإجمالي الجديد',
        quote: mockQuote,
      },
    }
    const res = parseBridalConflict(error)
    expect(res).not.toBeNull()
    expect(res?.code).toBe('PRICE_CHANGED')
    expect(res?.message).toBe('الأسعار اتغيرت، راجعي الإجمالي الجديد')
    expect(res?.quote).toEqual(mockQuote)
  })

  it('extracts UNAVAILABLE conflict from response._data', () => {
    const error = {
      response: {
        status: 409,
        _data: {
          code: 'UNAVAILABLE',
          message: 'فيه منتجات نفذت، بدّليها أو شيليها',
        },
      },
    }
    const res = parseBridalConflict(error)
    expect(res).not.toBeNull()
    expect(res?.code).toBe('UNAVAILABLE')
    expect(res?.message).toBe('فيه منتجات نفذت، بدّليها أو شيليها')
    expect(res?.quote).toBeUndefined()
  })

  it('extracts NOT_DRAFT conflict', () => {
    const error = {
      data: {
        code: 'NOT_DRAFT',
        message: 'القايمة اتحجزت قبل كده',
      },
    }
    const res = parseBridalConflict(error)
    expect(res).not.toBeNull()
    expect(res?.code).toBe('NOT_DRAFT')
    expect(res?.message).toBe('القايمة اتحجزت قبل كده')
  })

  it('returns null for non-conflict or malformed errors', () => {
    expect(parseBridalConflict(null)).toBeNull()
    expect(parseBridalConflict('error string')).toBeNull()
    expect(parseBridalConflict({})).toBeNull()
    expect(parseBridalConflict({ data: { other: 123 } })).toBeNull()
  })
})

