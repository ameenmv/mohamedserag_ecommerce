import { describe, it, expect } from 'vitest'
import { egpToPiastres, piastresToEgp, formatEgp, formatEgpWithUnit } from './money.js'
import { moneySchema } from './money-schema.js'

describe('money helpers', () => {
  it('converts EGP to integer piastres rounded to nearest piastre', () => {
    expect(egpToPiastres(28900)).toBe(2890000)
    expect(egpToPiastres(12.5)).toBe(1250)
    expect(egpToPiastres(12.556)).toBe(1256)
    expect(egpToPiastres(0)).toBe(0)
  })

  it('converts piastres back to EGP', () => {
    expect(piastresToEgp(2890000)).toBe(28900)
    expect(piastresToEgp(1250)).toBe(12.5)
    expect(piastresToEgp(0)).toBe(0)
  })

  it('formats piastres as EGP with en-US grouping, dropping .00 and keeping 2 decimals otherwise', () => {
    expect(formatEgp(2890000)).toBe('28,900')
    expect(formatEgp(1250)).toBe('12.50')
    expect(formatEgp(100005)).toBe('1,000.05')
    expect(formatEgp(0)).toBe('0')
  })

  it('formats piastres with the ج.م unit', () => {
    expect(formatEgpWithUnit(2890000)).toBe('28,900 ج.م')
    expect(formatEgpWithUnit(1250)).toBe('12.50 ج.م')
  })

  it('validates non-negative integer piastre amounts with moneySchema', () => {
    expect(moneySchema.safeParse(0).success).toBe(true)
    expect(moneySchema.safeParse(2890000).success).toBe(true)
    expect(moneySchema.safeParse(-100).success).toBe(false)
    expect(moneySchema.safeParse(12.5).success).toBe(false)
  })
})
