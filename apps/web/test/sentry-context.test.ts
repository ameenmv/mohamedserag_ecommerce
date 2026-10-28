import { describe, expect, it } from 'vitest'
import { buildSentryContext, normalizePath } from '../server/utils/sentry-context'

describe('normalizePath', () => {
  it('replaces ids but keeps readable segments', () => {
    expect(normalizePath('/admin/products/cmvb4p4va001u46fjot2tp8ta')).toBe('/admin/products/:id')
    expect(normalizePath('/p/some-slug')).toBe('/p/some-slug')
  })
})

describe('buildSentryContext', () => {
  it('describes an Arabic storefront page', () => {
    const ctx = buildSentryContext('GET', '/c/cookware?minPrice=5', 500)
    expect(ctx.transaction).toBe('GET /c/cookware')
    expect(ctx.tags).toMatchObject({ area: 'storefront', locale: 'ar', status: '500' })
  })

  it('tells English and admin pages apart', () => {
    expect(buildSentryContext('GET', '/en/cart', 500).tags.locale).toBe('en')
    expect(buildSentryContext('GET', '/admin/orders', 500).tags.area).toBe('admin')
  })
})
