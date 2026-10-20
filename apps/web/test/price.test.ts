import { describe, expect, it } from 'vitest'
import { formatPrice } from '../app/utils/price'

describe('price utils - formatPrice', () => {
  it('formats whole EGP amounts dropping .00 and appending Arabic currency unit', () => {
    const t = (key: string) => (key === 'common.currency' ? 'ج.م' : key)
    const result = formatPrice(3500000, t)

    expect(result.digits).toBe('35,000')
    expect(result.unit).toBe('ج.م')
    expect(result.formatted).toBe('35,000 ج.م')
  })

  it('formats fractional EGP amounts preserving 2 decimal places with English currency unit', () => {
    const t = (key: string) => (key === 'common.currency' ? 'EGP' : key)
    const result = formatPrice(1250, t)

    expect(result.digits).toBe('12.50')
    expect(result.unit).toBe('EGP')
    expect(result.formatted).toBe('12.50 EGP')
  })

  it('handles 0 correctly', () => {
    const t = (key: string) => (key === 'common.currency' ? 'ج.م' : key)
    const result = formatPrice(0, t)

    expect(result.digits).toBe('0')
    expect(result.unit).toBe('ج.م')
    expect(result.formatted).toBe('0 ج.م')
  })
})
