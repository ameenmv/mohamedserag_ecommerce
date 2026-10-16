import { describe, it, expect } from 'vitest'
import { DEFAULT_ZONES, findZone } from './zones.js'

describe('zones', () => {
  it('defines the 4 default zones with fees in piastres', () => {
    expect(DEFAULT_ZONES).toHaveLength(4)
    expect(DEFAULT_ZONES.map((z) => ({ name: z.name, fee: z.fee }))).toEqual([
      { name: 'المنصورة', fee: 10000 },
      { name: 'مراكز الدقهلية', fee: 15000 },
      { name: 'باقي الدلتا', fee: 25000 },
      { name: 'باقي مصر', fee: 40000 },
    ])
  })

  it('matches المنصورة and طلخا to the 100 ج.م (10,000 piastres) zone', () => {
    const mansoura = findZone(DEFAULT_ZONES, 'الدقهلية', 'المنصورة')
    expect(mansoura.name).toBe('المنصورة')
    expect(mansoura.fee).toBe(10000)

    const talkha = findZone(DEFAULT_ZONES, 'الدقهلية', 'طلخا')
    expect(talkha.name).toBe('المنصورة')
    expect(talkha.fee).toBe(10000)

    const mansouraDirect = findZone(DEFAULT_ZONES, 'المنصورة')
    expect(mansouraDirect.fee).toBe(10000)
  })

  it('matches ميت غمر (الدقهلية) to the 150 ج.م (15,000 piastres) zone', () => {
    const mitGhamr = findZone(DEFAULT_ZONES, 'الدقهلية', 'ميت غمر')
    expect(mitGhamr.name).toBe('مراكز الدقهلية')
    expect(mitGhamr.fee).toBe(15000)
  })

  it('matches Delta governorates to the 250 ج.م (25,000 piastres) zone', () => {
    const gharbia = findZone(DEFAULT_ZONES, 'الغربية', 'طنطا')
    expect(gharbia.name).toBe('باقي الدلتا')
    expect(gharbia.fee).toBe(25000)
  })

  it('falls back to باقي مصر (400 ج.م = 40,000 piastres) for القاهرة and other governorates', () => {
    const cairo = findZone(DEFAULT_ZONES, 'القاهرة', 'مدينة نصر')
    expect(cairo.name).toBe('باقي مصر')
    expect(cairo.fee).toBe(40000)

    const cairoGovOnly = findZone(DEFAULT_ZONES, 'القاهرة')
    expect(cairoGovOnly.fee).toBe(40000)
  })
})
