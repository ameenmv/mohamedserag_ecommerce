import { describe, expect, it } from 'vitest'
import { visitorIp } from '../server/utils/visitor-ip'

describe('visitorIp', () => {
  it('returns the socket address for a public direct connection, ignoring X-Forwarded-For', () => {
    expect(
      visitorIp({ forwardedFor: '6.6.6.6', remoteAddress: '203.0.113.7' }),
    ).toBe('203.0.113.7')
  })

  it('uses the last forwarded entry when the socket is the private trusted proxy', () => {
    expect(
      visitorIp({ forwardedFor: '198.51.100.20', remoteAddress: '172.18.0.5' }),
    ).toBe('198.51.100.20')
  })

  it('cannot be reset by a spoofed leading entry', () => {
    expect(
      visitorIp({ forwardedFor: '6.6.6.6, 1.2.3.4', remoteAddress: '10.0.0.9' }),
    ).toBe('1.2.3.4')
  })

  it('falls back to the socket when no forwarded header is present', () => {
    expect(visitorIp({ forwardedFor: undefined, remoteAddress: '10.0.0.9' })).toBe(
      '10.0.0.9',
    )
  })

  it('strips the port from a bracketed IPv6 forwarded entry', () => {
    expect(
      visitorIp({ forwardedFor: '[2001:db8::1]:443', remoteAddress: '172.18.0.5' }),
    ).toBe('2001:db8::1')
  })

  it('strips the port from an IPv4 forwarded entry', () => {
    expect(
      visitorIp({ forwardedFor: '1.2.3.4:5678', remoteAddress: '172.18.0.5' }),
    ).toBe('1.2.3.4')
  })

  it('decodes an IPv4-mapped IPv6 dotted address', () => {
    expect(
      visitorIp({ forwardedFor: '::ffff:10.0.0.5', remoteAddress: '172.18.0.5' }),
    ).toBe('10.0.0.5')
  })

  it('decodes an IPv4-mapped IPv6 hexadecimal address', () => {
    expect(
      visitorIp({ forwardedFor: '::ffff:a00:5', remoteAddress: '172.18.0.5' }),
    ).toBe('10.0.0.5')
  })

  it('lowercases the normalized address', () => {
    expect(
      visitorIp({ forwardedFor: '2001:DB8::ABCD', remoteAddress: '172.18.0.5' }),
    ).toBe('2001:db8::abcd')
  })

  it('falls back to a valid socket when the forwarded entry is garbage', () => {
    expect(
      visitorIp({ forwardedFor: 'not-an-ip', remoteAddress: '10.0.0.9' }),
    ).toBe('10.0.0.9')
  })

  it('skips an invalid trailing forwarded entry and uses the previous valid one', () => {
    expect(
      visitorIp({ forwardedFor: '1.2.3.4, garbage', remoteAddress: '10.0.0.9' }),
    ).toBe('1.2.3.4')
  })

  it('returns undefined when the socket is unparseable (fail closed)', () => {
    expect(visitorIp({ forwardedFor: undefined, remoteAddress: 'not-an-ip' })).toBeUndefined()
  })

  it('returns undefined when nothing can be parsed', () => {
    expect(visitorIp({ forwardedFor: '', remoteAddress: undefined })).toBeUndefined()
  })
})
