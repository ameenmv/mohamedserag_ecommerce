import { describe, expect, it } from 'vitest'
import {
  buildRequestHeaders,
  ssrForwardingHeaders,
} from '../app/utils/api'

describe('ssrForwardingHeaders on the client', () => {
  it('returns no forwarding headers in the browser', () => {
    expect(ssrForwardingHeaders()).toEqual({})
  })
})

describe('buildRequestHeaders on the client', () => {
  it('preserves caller-provided headers', () => {
    const headers = buildRequestHeaders({ 'x-custom': 'value' }, 'GET', null)
    expect(headers.get('x-custom')).toBe('value')
  })

  it('does not attach a CSRF token for GET', () => {
    const headers = buildRequestHeaders(undefined, 'GET', 'token-123')
    expect(headers.has('x-csrf-token')).toBe(false)
  })

  it('attaches a CSRF token for POST when one is available', () => {
    const headers = buildRequestHeaders(undefined, 'POST', 'token-123')
    expect(headers.get('x-csrf-token')).toBe('token-123')
  })

  it('omits the CSRF token for POST when none is available', () => {
    const headers = buildRequestHeaders(undefined, 'POST', null)
    expect(headers.has('x-csrf-token')).toBe(false)
  })

  it('never adds an X-Forwarded-For header on the client', () => {
    const headers = buildRequestHeaders(undefined, 'POST', 'token-123')
    expect(headers.has('x-forwarded-for')).toBe(false)
  })
})
