import { describe, expect, it } from 'vitest'
import { isExternalHref, isInternalHref } from '../app/utils/home-links'

describe('isExternalHref', () => {
  it('treats https URLs as external', () => {
    expect(isExternalHref('https://wa.me/20100000000')).toBe(true)
    expect(isExternalHref('https://facebook.com/mohamedserag')).toBe(true)
  })

  it('treats site paths as internal', () => {
    expect(isExternalHref('/shop')).toBe(false)
    expect(isExternalHref('/c/refrigerators')).toBe(false)
  })

  it('treats other schemes as internal (never opened in a new tab)', () => {
    expect(isExternalHref('http://example.com')).toBe(false)
    expect(isExternalHref('mailto:x@y.com')).toBe(false)
  })
})

describe('isInternalHref', () => {
  it('treats site paths as internal', () => {
    expect(isInternalHref('/shop')).toBe(true)
    expect(isInternalHref('/guides/fridge')).toBe(true)
  })

  it('treats protocol-relative and absolute URLs as external', () => {
    expect(isInternalHref('//example.com')).toBe(false)
    expect(isInternalHref('https://example.com')).toBe(false)
    expect(isInternalHref('mailto:x@y.com')).toBe(false)
  })
})
