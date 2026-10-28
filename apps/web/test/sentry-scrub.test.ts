import type { ErrorEvent } from '@sentry/node'
import { describe, expect, it } from 'vitest'
import { scrubSentryEvent } from '../server/utils/sentry-scrub'

describe('scrubSentryEvent', () => {
  it('drops request data, cookies, headers, query string and the user', () => {
    const event = {
      type: undefined,
      request: { url: 'https://x/', data: 'a', cookies: { s: '1' }, headers: { cookie: 's=1' }, query_string: 'q=1' },
      user: { id: '1' },
    } as ErrorEvent
    const out = scrubSentryEvent(event)
    expect(out.request?.url).toBe('https://x/')
    expect(out.request).not.toHaveProperty('headers')
    expect(out.request).not.toHaveProperty('cookies')
    expect(out.request).not.toHaveProperty('data')
    expect(out.request).not.toHaveProperty('query_string')
    expect(out).not.toHaveProperty('user')
  })

  it('masks phone numbers and tokens in exception messages', () => {
    const event = {
      type: undefined,
      exception: { values: [{ type: 'Error', value: 'failed for 01012345678 with token=abc' }] },
    } as ErrorEvent
    const value = scrubSentryEvent(event).exception?.values?.[0]?.value ?? ''
    expect(value).not.toContain('01012345678')
    expect(value).not.toContain('abc')
  })
})
