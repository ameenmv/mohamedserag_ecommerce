import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { getRequestId, requestId } from './request-id.middleware.js'

function createMockRequest(headers: Record<string, string | string[] | undefined> = {}): Request {
  return {
    headers,
  } as unknown as Request
}

function createMockResponse(): { res: Response; headers: Record<string, string> } {
  const headers: Record<string, string> = {}
  const res = {
    setHeader: vi.fn((key: string, value: string) => {
      headers[key] = value
    }),
  } as unknown as Response
  return { res, headers }
}

describe('requestId middleware', () => {
  it('reuses a valid incoming x-request-id', () => {
    const validId = 'client-req-12345678'
    const req = createMockRequest({ 'x-request-id': validId })
    const { res, headers } = createMockResponse()
    const next = vi.fn()

    requestId(req, res, next)

    expect(req.requestId).toBe(validId)
    expect(headers['X-Request-Id']).toBe(validId)
    expect(getRequestId(req)).toBe(validId)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('replaces an invalid incoming id (spaces or invalid characters)', () => {
    const req = createMockRequest({ 'x-request-id': 'invalid id with spaces' })
    const { res, headers } = createMockResponse()
    const next = vi.fn()

    requestId(req, res, next)

    expect(req.requestId).not.toBe('invalid id with spaces')
    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(headers['X-Request-Id']).toBe(req.requestId)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('replaces an incoming id that is too short (< 8 chars)', () => {
    const req = createMockRequest({ 'x-request-id': 'abc' })
    const { res, headers } = createMockResponse()
    const next = vi.fn()

    requestId(req, res, next)

    expect(req.requestId).not.toBe('abc')
    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(headers['X-Request-Id']).toBe(req.requestId)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('replaces a too-long incoming id (> 128 chars)', () => {
    const tooLong = 'a'.repeat(129)
    const req = createMockRequest({ 'x-request-id': tooLong })
    const { res, headers } = createMockResponse()
    const next = vi.fn()

    requestId(req, res, next)

    expect(req.requestId).not.toBe(tooLong)
    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(headers['X-Request-Id']).toBe(req.requestId)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('generates a new UUID when x-request-id header is absent', () => {
    const req = createMockRequest()
    const { res, headers } = createMockResponse()
    const next = vi.fn()

    requestId(req, res, next)

    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(headers['X-Request-Id']).toBe(req.requestId)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('returns unknown when req has no requestId property', () => {
    expect(getRequestId({} as unknown as Request)).toBe('unknown')
  })
})
