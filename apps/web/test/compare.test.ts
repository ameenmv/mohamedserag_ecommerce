import { describe, expect, it } from 'vitest'
import {
  hasCompareEntry,
  mixedCategories,
  replaceCompare,
  toggleCompare,
  type CompareEntry,
} from '../app/utils/compare'

describe('compare utils - toggleCompare', () => {
  it('adds items up to 3 and returns result: "added"', () => {
    const item1 = { productId: 'p1', categorySlug: 'fridges' }
    const item2 = { productId: 'p2', categorySlug: 'fridges' }
    const item3 = { productId: 'p3', categorySlug: 'fridges' }

    const res1 = toggleCompare([], item1)
    expect(res1.result).toBe('added')
    expect(res1.entries).toHaveLength(1)

    const res2 = toggleCompare(res1.entries, item2)
    expect(res2.result).toBe('added')
    expect(res2.entries).toHaveLength(2)

    const res3 = toggleCompare(res2.entries, item3)
    expect(res3.result).toBe('added')
    expect(res3.entries).toHaveLength(3)
  })

  it('removes an item if already present and returns result: "removed"', () => {
    const initial: CompareEntry[] = [
      { productId: 'p1', categorySlug: 'fridges' },
      { productId: 'p2', categorySlug: 'fridges' },
    ]

    const res = toggleCompare(initial, { productId: 'p1', categorySlug: 'fridges' })
    expect(res.result).toBe('removed')
    expect(res.entries).toEqual([{ productId: 'p2', categorySlug: 'fridges' }])
  })

  it('refuses the 4th item and returns result: "full" without altering entries', () => {
    const fullList: CompareEntry[] = [
      { productId: 'p1', categorySlug: 'fridges' },
      { productId: 'p2', categorySlug: 'fridges' },
      { productId: 'p3', categorySlug: 'fridges' },
    ]

    const res = toggleCompare(fullList, { productId: 'p4', categorySlug: 'fridges' })
    expect(res.result).toBe('full')
    expect(res.entries).toHaveLength(3)
    expect(hasCompareEntry(res.entries, 'p4')).toBe(false)
  })
})

describe('compare utils - replaceCompare', () => {
  it('replaces an existing entry with a new product', () => {
    const list: CompareEntry[] = [
      { productId: 'p1', categorySlug: 'fridges' },
      { productId: 'p2', categorySlug: 'fridges' },
      { productId: 'p3', categorySlug: 'fridges' },
    ]

    const replaced = replaceCompare(list, 'p2', { productId: 'p4', categorySlug: 'fridges' })

    expect(replaced).toEqual([
      { productId: 'p1', categorySlug: 'fridges' },
      { productId: 'p4', categorySlug: 'fridges' },
      { productId: 'p3', categorySlug: 'fridges' },
    ])
  })

  it('appends item if oldId is not found and list has space', () => {
    const list: CompareEntry[] = [{ productId: 'p1', categorySlug: 'fridges' }]
    const updated = replaceCompare(list, 'missing', { productId: 'p2', categorySlug: 'fridges' })

    expect(updated).toHaveLength(2)
    expect(updated[1]?.productId).toBe('p2')
  })
})

describe('compare utils - mixedCategories', () => {
  it('returns false for single or empty list', () => {
    expect(mixedCategories([])).toBe(false)
    expect(mixedCategories([{ productId: 'p1', categorySlug: 'fridges' }])).toBe(false)
  })

  it('returns false when all items belong to the same category', () => {
    const list: CompareEntry[] = [
      { productId: 'p1', categorySlug: 'fridges' },
      { productId: 'p2', categorySlug: 'fridges' },
    ]
    expect(mixedCategories(list)).toBe(false)
  })

  it('returns true when items belong to different categories', () => {
    const list: CompareEntry[] = [
      { productId: 'p1', categorySlug: 'fridges' },
      { productId: 'p2', categorySlug: 'washers' },
    ]
    expect(mixedCategories(list)).toBe(true)
  })
})
