import { describe, expect, it } from 'vitest'
import { buildSentryContext, normalizePath } from './sentry-context.js'

describe('normalizePath', () => {
  it('replaces ids but keeps readable segments', () => {
    expect(normalizePath('/api/admin/orders/cmvb4p4va001u46fjot2tp8ta')).toBe('/api/admin/orders/:id')
    expect(normalizePath('/api/products/some-slug')).toBe('/api/products/some-slug')
    expect(normalizePath('/api/orders/123/status')).toBe('/api/orders/:id/status')
  })
})

describe('buildSentryContext', () => {
  it('describes a storefront request', () => {
    const ctx = buildSentryContext({ method: 'POST', path: '/api/orders', requestId: 'req-12345678' }, 500)
    expect(ctx.transaction).toBe('POST /api/orders')
    expect(ctx.tags).toMatchObject({ area: 'storefront', method: 'POST', status: '500', requestId: 'req-12345678' })
    expect(ctx.userId).toBeUndefined()
  })

  it('marks admin requests and carries only the admin id', () => {
    const ctx = buildSentryContext(
      { method: 'PATCH', path: '/api/admin/orders/cmvb4p4va001u46fjot2tp8ta', admin: { userId: 'u1' } },
      500,
    )
    expect(ctx.tags.area).toBe('admin')
    expect(ctx.tags.route).toBe('/api/admin/orders/:id')
    expect(ctx.userId).toBe('u1')
  })

  it('copes without a request', () => {
    expect(buildSentryContext(undefined, 500).transaction).toBe('UNKNOWN ')
  })
})
