import { describe, it, expect } from 'vitest'
import { EGYPT_GOVERNORATES } from './governorates.js'
import { DEFAULT_ZONES } from './zones.js'

describe('EGYPT_GOVERNORATES', () => {
  it('contains exactly 27 governorates', () => {
    expect(EGYPT_GOVERNORATES).toHaveLength(27)
  })

  it('contains unique governorate names without duplicates', () => {
    const unique = new Set(EGYPT_GOVERNORATES)
    expect(unique.size).toBe(27)
  })

  it('places Dakahlia («الدقهلية») as the first governorate', () => {
    expect(EGYPT_GOVERNORATES[0]).toBe('الدقهلية')
  })

  it('sorts the remaining 26 governorates in Arabic alphabetical order', () => {
    const remaining = EGYPT_GOVERNORATES.slice(1)
    const sorted = [...remaining].sort((a, b) => a.localeCompare(b, 'ar'))
    expect(remaining).toEqual(sorted)
  })

  it('includes every governorate referenced in DEFAULT_ZONES', () => {
    const zoneGovernorates = new Set<string>()
    for (const zone of DEFAULT_ZONES) {
      for (const place of zone.places) {
        zoneGovernorates.add(place.governorate)
      }
    }

    for (const gov of zoneGovernorates) {
      expect(EGYPT_GOVERNORATES).toContain(gov)
    }
  })
})
