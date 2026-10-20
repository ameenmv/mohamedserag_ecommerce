import { describe, expect, it } from 'vitest'
import { parseSetContents } from '../app/utils/set-contents'

describe('set-contents: parseSetContents', () => {
  it('parses valid set content pieces', () => {
    const raw = [
      { item: 'حلة طهي', size: '24 سم', qty: 1 },
      { item: 'طاسة قلي', size: '28 سم', qty: 2 },
    ]
    const parsed = parseSetContents(raw)

    expect(parsed).toEqual([
      { item: 'حلة طهي', size: '24 سم', qty: 1 },
      { item: 'طاسة قلي', size: '28 سم', qty: 2 },
    ])
  })

  it('defaults qty to 1 when omitted or invalid', () => {
    const raw = [
      { item: 'كسرولة', size: '16 سم' },
      { item: 'طاجن فرن', size: '30 سم', qty: 0 },
      { item: 'صينية بسبوسة', size: '32 سم', qty: -5 },
    ]
    const parsed = parseSetContents(raw)

    expect(parsed).toEqual([
      { item: 'كسرولة', size: '16 سم', qty: 1 },
      { item: 'طاجن فرن', size: '30 سم', qty: 1 },
      { item: 'صينية بسبوسة', size: '32 سم', qty: 1 },
    ])
  })

  it('normalizes string qty and numeric size', () => {
    const raw = [
      { item: 'حلة ضغط', size: 8, qty: '3' },
    ]
    const parsed = parseSetContents(raw)

    expect(parsed).toEqual([
      { item: 'حلة ضغط', size: '8', qty: 3 },
    ])
  })

  it('drops entries that are not valid objects or lack a non-empty item string', () => {
    const raw = [
      null,
      undefined,
      'just a string',
      42,
      [],
      {},
      { item: '' },
      { item: '   ' },
      { size: '20 سم', qty: 1 },
      { item: 'مقلاة كريب', size: '26 سم', qty: 1 },
    ]
    const parsed = parseSetContents(raw)

    expect(parsed).toEqual([
      { item: 'مقلاة كريب', size: '26 سم', qty: 1 },
    ])
  })

  it('returns empty array when input is null, undefined, or not an array', () => {
    expect(parseSetContents(null)).toEqual([])
    expect(parseSetContents(undefined)).toEqual([])
    expect(parseSetContents('not an array')).toEqual([])
    expect(parseSetContents({})).toEqual([])
  })
})
