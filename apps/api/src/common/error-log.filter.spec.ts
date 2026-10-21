import { type ArgumentsHost, HttpException, Logger, NotFoundException } from '@nestjs/common'
import type { HttpServer } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorLogFilter } from './error-log.filter.js'

function fakeAdapter() {
  return {
    reply: vi.fn(),
    end: vi.fn(),
    isHeadersSent: vi.fn(() => false),
  }
}

function fakeHost(): ArgumentsHost {
  const req = {
    method: 'GET',
    path: '/api/orders/SR-1',
    url: '/api/orders/SR-1?phone=01012345678',
    requestId: 'req-12345678',
  }
  const res = {}
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res, getNext: () => undefined }),
    getArgByIndex: (index: number) => [req, res][index],
    getArgs: () => [req, res],
    getType: () => 'http',
    switchToRpc: () => { throw new Error('not rpc') },
    switchToWs: () => { throw new Error('not ws') },
  } as unknown as ArgumentsHost
}

describe('ErrorLogFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs one redacted entry for an unknown error and replies 500 without the raw message', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    const adapter = fakeAdapter()
    new ErrorLogFilter(adapter as unknown as HttpServer).catch(new Error('db down for 01012345678'), fakeHost())

    expect(errorLog).toHaveBeenCalledTimes(1)
    const entry = errorLog.mock.calls[0]![0] as Record<string, unknown>
    expect(entry).toMatchObject({
      requestId: 'req-12345678',
      method: 'GET',
      path: '/api/orders/SR-1',
      status: 500,
      error: 'Error',
    })
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('01012345678')
    expect(String(entry.path)).not.toContain('?')
    expect(adapter.reply).toHaveBeenCalledWith({}, { statusCode: 500, message: 'Internal server error' }, 500)
  })

  it('does not log expected 4xx errors', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    const adapter = fakeAdapter()
    new ErrorLogFilter(adapter as unknown as HttpServer).catch(new NotFoundException(), fakeHost())

    expect(errorLog).not.toHaveBeenCalled()
    expect(adapter.reply).toHaveBeenCalledWith({}, expect.objectContaining({ statusCode: 404 }), 404)
  })

  it('logs HTTP 5xx exceptions with their status', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    new ErrorLogFilter(fakeAdapter() as unknown as HttpServer).catch(new HttpException('upstream', 503), fakeHost())

    expect(errorLog).toHaveBeenCalledTimes(1)
    expect(errorLog.mock.calls[0]![0]).toMatchObject({ status: 503, error: 'HttpException' })
  })
})
