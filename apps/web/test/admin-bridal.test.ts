import { describe, expect, it } from 'vitest'
import type { AdminBridalTier } from '@serag/shared'
import {
  addHighlight,
  addProductToRoom,
  cloneTier,
  computeTierTotal,
  isTierDirty,
  removeHighlight,
  removeProductFromRoom,
  toTierUpdateInput,
  updateHighlight,
  updateItemQty,
} from '../app/utils/admin-bridal'

function makeMockTier(): AdminBridalTier {
  return {
    id: 'tier-1',
    slug: 'silver',
    name: 'باقة الفضة',
    highlights: ['أجهزة أساسية بضمان معتمد', 'توصيل مجاني بالدقهلية'],
    total: 5000000,
    rooms: [
      {
        key: 'kitchen',
        items: [
          {
            productId: 'prod-1',
            name: 'ثلاجة شارب',
            modelCode: 'SH-REF',
            price: 2000000,
            qty: 1,
            flagged: false,
          },
          {
            productId: 'prod-2',
            name: 'بوتاجاز فريش',
            modelCode: 'FR-CKR',
            price: 1000000,
            qty: 1,
            flagged: false,
          },
        ],
      },
      {
        key: 'laundry',
        items: [
          {
            productId: 'prod-3',
            name: 'غسالة إل جي',
            modelCode: 'LG-WSH',
            price: 2000000,
            qty: 1,
            flagged: false,
          },
        ],
      },
    ],
  }
}

describe('admin-bridal utils - tier operations', () => {
  it('clones a tier deeply', () => {
    const orig = makeMockTier()
    const cloned = cloneTier(orig)
    expect(cloned).toEqual(orig)
    expect(cloned).not.toBe(orig)
    expect(cloned.highlights).not.toBe(orig.highlights)
    expect(cloned.rooms[0]).not.toBe(orig.rooms[0])
  })

  it('adds a new product to an existing room', () => {
    const tier = makeMockTier()
    const updated = addProductToRoom(tier.rooms, 'kitchen', {
      id: 'prod-99',
      name: 'ميكروويف',
      modelCode: 'MC-1',
      price: 500000,
    })
    const kitchen = updated.find((r) => r.key === 'kitchen')
    expect(kitchen?.items.length).toBe(3)
    expect(kitchen?.items.find((i) => i.productId === 'prod-99')?.qty).toBe(1)
  })

  it('increments quantity if adding an existing product to room, capped at 10', () => {
    const tier = makeMockTier()
    let updated = addProductToRoom(tier.rooms, 'kitchen', {
      id: 'prod-1',
      name: 'ثلاجة شارب',
      modelCode: 'SH-REF',
      price: 2000000,
    })
    expect(updated[0]?.items[0]?.qty).toBe(2)

    // Bump to 10
    for (let i = 0; i < 15; i++) {
      updated = addProductToRoom(updated, 'kitchen', {
        id: 'prod-1',
        name: 'ثلاجة شارب',
        modelCode: 'SH-REF',
        price: 2000000,
      })
    }
    expect(updated[0]?.items[0]?.qty).toBe(10)
  })

  it('removes a product from a room', () => {
    const tier = makeMockTier()
    const updated = removeProductFromRoom(tier.rooms, 'kitchen', 'prod-1')
    const kitchen = updated.find((r) => r.key === 'kitchen')
    expect(kitchen?.items.some((i) => i.productId === 'prod-1')).toBe(false)
    expect(kitchen?.items.length).toBe(1)
  })

  it('updates item quantity clamped between 1 and 10', () => {
    const tier = makeMockTier()
    const updated = updateItemQty(tier.rooms, 'kitchen', 'prod-1', 5)
    expect(updated[0]?.items[0]?.qty).toBe(5)

    const clampedUnder = updateItemQty(tier.rooms, 'kitchen', 'prod-1', 0)
    expect(clampedUnder[0]?.items[0]?.qty).toBe(1)

    const clampedOver = updateItemQty(tier.rooms, 'kitchen', 'prod-1', 25)
    expect(clampedOver[0]?.items[0]?.qty).toBe(10)
  })

  it('computes tier total ignoring flagged products', () => {
    const tier = makeMockTier()
    tier.rooms[0]!.items[1]!.flagged = true // prod-2 flagged (1,000,000 piastres ignored)
    const total = computeTierTotal(tier.rooms)
    // 2000000 (prod-1) + 2000000 (prod-3) = 4000000
    expect(total).toBe(4000000)
  })

  it('manages highlights safely up to 4 items', () => {
    let hl = ['ميزة 1', 'ميزة 2']
    hl = addHighlight(hl, 'ميزة 3')
    hl = addHighlight(hl, 'ميزة 4')
    expect(hl.length).toBe(4)
    // 5th highlight rejected
    hl = addHighlight(hl, 'ميزة 5')
    expect(hl.length).toBe(4)

    hl = updateHighlight(hl, 1, 'ميزة 2 معدلة')
    expect(hl[1]).toBe('ميزة 2 معدلة')

    hl = removeHighlight(hl, 0)
    expect(hl.length).toBe(3)
    expect(hl[0]).toBe('ميزة 2 معدلة')
  })

  it('detects dirty state properly', () => {
    const orig = makeMockTier()
    const current = cloneTier(orig)
    expect(isTierDirty(orig, current)).toBe(false)

    current.name = 'اسم جديد'
    expect(isTierDirty(orig, current)).toBe(true)

    current.name = orig.name
    current.highlights[0] = 'ميزة مختلفة'
    expect(isTierDirty(orig, current)).toBe(true)

    const current2 = cloneTier(orig)
    current2.rooms = updateItemQty(current2.rooms, 'kitchen', 'prod-1', 3)
    expect(isTierDirty(orig, current2)).toBe(true)
  })

  it('converts tier into valid API update input', () => {
    const tier = makeMockTier()
    const input = toTierUpdateInput(tier)
    expect(input.name).toBe('باقة الفضة')
    expect(input.highlights).toEqual(tier.highlights)
    expect(input.rooms.length).toBe(2)
    expect(input.rooms[0]?.items).toEqual([
      { productId: 'prod-1', qty: 1 },
      { productId: 'prod-2', qty: 1 },
    ])
  })
})
