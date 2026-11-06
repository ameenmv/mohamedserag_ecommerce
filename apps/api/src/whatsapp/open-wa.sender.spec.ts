import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  OpenWaSender,
  buildOpenWaSendPayload,
  buildOpenWaSendUrl,
  formatOpenWaRecipient,
} from './open-wa.sender.js'

describe('OpenWA sender helpers', () => {
  it('formats Egyptian numbers as WhatsApp chat ids', () => {
    expect(formatOpenWaRecipient('01017025076')).toBe('201017025076@c.us')
    expect(formatOpenWaRecipient('+20 101 702 5076')).toBe('201017025076@c.us')
    expect(formatOpenWaRecipient('٠١٠١٧٠٢٥٠٧٦')).toBe('201017025076@c.us')
  })

  it('builds the send-text url and body', () => {
    expect(buildOpenWaSendUrl('http://localhost:2785/', 'abc 1')).toBe(
      'http://localhost:2785/api/sessions/abc%201/messages/send-text',
    )
    expect(buildOpenWaSendPayload('201017025076@c.us', 'hi')).toEqual({
      chatId: '201017025076@c.us',
      text: 'hi',
    })
  })
})

describe('OpenWaSender', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('is not configured without a session id', () => {
    vi.stubEnv('OPEN_WA_URL', 'http://wa:2785')
    vi.stubEnv('OPEN_WA_KEY', 'k')
    vi.stubEnv('OPEN_WA_SESSION', '')
    expect(new OpenWaSender().isConfigured()).toBe(false)
  })

  it('posts with the X-API-Key header and throws on a failed response', async () => {
    vi.stubEnv('OPEN_WA_URL', 'http://wa:2785')
    vi.stubEnv('OPEN_WA_KEY', 'secret')
    vi.stubEnv('OPEN_WA_SESSION', 's1')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 201 }))
      .mockResolvedValueOnce(new Response('session not ready', { status: 409 }))
    vi.stubGlobal('fetch', fetchMock)

    const sender = new OpenWaSender()
    await sender.send('01017025076', 'hello')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://wa:2785/api/sessions/s1/messages/send-text')
    expect(init.headers).toMatchObject({ 'X-API-Key': 'secret' })
    expect(JSON.parse(String(init.body))).toEqual({ chatId: '201017025076@c.us', text: 'hello' })

    await expect(sender.send('01017025076', 'hello')).rejects.toThrow('HTTP 409')
  })
})
