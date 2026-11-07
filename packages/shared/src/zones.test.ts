import { describe, it, expect } from 'vitest'
import { DEFAULT_ZONES, findZone } from './zones.js'

describe('zones', () => {
  it('defines the 4 default zones with fees per shipping class in piastres', () => {
    expect(DEFAULT_ZONES).toHaveLength(4)
    expect(DEFAULT_ZONES.map((z) => ({ name: z.name, fees: z.fees }))).toEqual([
      {
        name: 'المنصورة',
        fees: { small: 5000, medium: 7500, large: 10000 },
      },
      {
        name: 'مراكز الدقهلية',
        fees: { small: 7500, medium: 11300, large: 15000 },
      },
      {
        name: 'باقي الدلتا',
        fees: { small: 12500, medium: 18800, large: 25000 },
      },
      {
        name: 'باقي مصر',
        fees: { small: 20000, medium: 30000, large: 40000 },
      },
    ])
  })

  it('matches المنصورة and طلخا to the 100 ج.م (10,000 piastres) large-class fee', () => {
    const mansoura = findZone(DEFAULT_ZONES, 'الدقهلية', 'المنصورة')
    expect(mansoura.name).toBe('المنصورة')
    expect(mansoura.fees.large).toBe(10000)
    expect(mansoura.fees.medium).toBe(7500)
    expect(mansoura.fees.small).toBe(5000)

    const talkha = findZone(DEFAULT_ZONES, 'الدقهلية', 'طلخا')
    expect(talkha.name).toBe('المنصورة')
    expect(talkha.fees.large).toBe(10000)

    const mansouraDirect = findZone(DEFAULT_ZONES, 'المنصورة')
    expect(mansouraDirect.fees.large).toBe(10000)
  })

  it('matches ميت غمر (الدقهلية) to the 150 ج.م (15,000 piastres) zone', () => {
    const mitGhamr = findZone(DEFAULT_ZONES, 'الدقهلية', 'ميت غمر')
    expect(mitGhamr.name).toBe('مراكز الدقهلية')
    expect(mitGhamr.fees.large).toBe(15000)
  })

  it('matches Delta governorates to the 250 ج.م (25,000 piastres) zone', () => {
    const gharbia = findZone(DEFAULT_ZONES, 'الغربية', 'طنطا')
    expect(gharbia.name).toBe('باقي الدلتا')
    expect(gharbia.fees.large).toBe(25000)
  })

  it('falls back to باقي مصر (400 ج.م = 40,000 piastres) for القاهرة and other governorates', () => {
    const cairo = findZone(DEFAULT_ZONES, 'القاهرة', 'مدينة نصر')
    expect(cairo.name).toBe('باقي مصر')
    expect(cairo.fees.large).toBe(40000)

    const cairoGovOnly = findZone(DEFAULT_ZONES, 'القاهرة')
    expect(cairoGovOnly.fees.large).toBe(40000)
  })
})
