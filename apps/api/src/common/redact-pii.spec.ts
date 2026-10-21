import { describe, expect, it } from 'vitest'
import { redactPii } from './redact-pii.js'

describe('redactPii', () => {
  it('masks Egyptian phone numbers, local and international', () => {
    expect(redactPii('no order for 01012345678 today')).toBe('no order for [REDACTED] today')
    expect(redactPii('call +201012345678')).not.toContain('201012345678')
  })

  it('keeps short numbers such as counts and order sequences', () => {
    expect(redactPii('order SR-2026-000124 has 123456 views')).toBe('order SR-2026-000124 has 123456 views')
  })

  it('hides bearer tokens, token params and secrets', () => {
    expect(redactPii('Authorization: Bearer abc.def')).not.toContain('abc.def')
    expect(redactPii('url?token=xyz&a=1')).not.toContain('xyz')
    expect(redactPii('secret: hunter2')).not.toContain('hunter2')
  })

  it('truncates to 300 characters', () => {
    expect(redactPii('x'.repeat(500))).toHaveLength(300)
  })

  it('returns an empty string for non-string input', () => {
    expect(redactPii(undefined as unknown as string)).toBe('')
  })
})
