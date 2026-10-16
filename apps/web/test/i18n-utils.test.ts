import { describe, expect, it } from 'vitest'
import { stripLocalePrefix } from '../app/utils/i18n'

describe('stripLocalePrefix', () => {
  it('strips leading /en locale segment to root /', () => {
    expect(stripLocalePrefix('/en')).toBe('/')
    expect(stripLocalePrefix('/en/')).toBe('/')
  })

  it('strips leading /en from nested paths', () => {
    expect(stripLocalePrefix('/en/admin')).toBe('/admin')
    expect(stripLocalePrefix('/en/admin/orders')).toBe('/admin/orders')
    expect(stripLocalePrefix('/en/shop/appliances')).toBe('/shop/appliances')
  })

  it('normalizes empty string to /', () => {
    expect(stripLocalePrefix('')).toBe('/')
  })

  it('leaves default locale (unprefixed) paths unchanged', () => {
    expect(stripLocalePrefix('/')).toBe('/')
    expect(stripLocalePrefix('/admin')).toBe('/admin')
    expect(stripLocalePrefix('/admin/orders')).toBe('/admin/orders')
    expect(stripLocalePrefix('/shop')).toBe('/shop')
  })

  it('does not strip words that only start with en (e.g. enterprise)', () => {
    expect(stripLocalePrefix('/enterprise')).toBe('/enterprise')
    expect(stripLocalePrefix('/entry/123')).toBe('/entry/123')
  })
})
