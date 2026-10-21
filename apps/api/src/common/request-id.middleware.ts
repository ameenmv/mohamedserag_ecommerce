import { randomUUID } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/

export function getRequestId(req: Request | { requestId?: string }): string {
  if ('requestId' in req && typeof req.requestId === 'string' && req.requestId.length > 0) {
    return req.requestId
  }
  return 'unknown'
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id']
  const candidate =
    typeof incoming === 'string'
      ? incoming.trim()
      : Array.isArray(incoming)
        ? incoming[0]?.trim()
        : undefined

  const id = candidate && VALID_REQUEST_ID.test(candidate) ? candidate : randomUUID()

  req.requestId = id
  if (typeof res.setHeader === 'function') {
    res.setHeader('X-Request-Id', id)
  }
  next()
}
