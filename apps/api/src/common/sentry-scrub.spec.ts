import type { ErrorEvent } from '@sentry/nestjs'
import { describe, expect, it } from 'vitest'
import { scrubSentryEvent } from './sentry-scrub.js'

describe('scrubSentryEvent', () => {
  it('drops request data, cookies, headers and query string, and keeps only the user id', () => {
    const event = {
      type: undefined,
      request: { url: 'https://x/api/orders', data: { phone: '01012345678' }, cookies: { sid: 'a' }, headers: { cookie: 'sid=a' }, query_string: 'q=1' },
      user: { id: '1', email: 'a@b.c' },
    } as ErrorEvent
    const out = scrubSentryEvent(event)
    expect(out.request?.url).toBe('https://x/api/orders')
    expect(out.request).not.toHaveProperty('data')
    expect(out.request).not.toHaveProperty('cookies')
    expect(out.request).not.toHaveProperty('headers')
    expect(out.request).not.toHaveProperty('query_string')
    expect(out.user).toEqual({ id: '1' })
  })

  it('masks phone numbers and tokens in messages', () => {
    const event = {
      type: undefined,
      message: 'call 01012345678',
      exception: { values: [{ type: 'Error', value: 'bad Bearer abc123 for 01012345678' }] },
    } as ErrorEvent
    const out = scrubSentryEvent(event)
    expect(out.message).not.toContain('01012345678')
    expect(out.exception?.values?.[0]?.value).not.toContain('abc123')
    expect(out.exception?.values?.[0]?.value).not.toContain('01012345678')
  })
})
