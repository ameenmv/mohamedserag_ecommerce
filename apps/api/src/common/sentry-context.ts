import type { Request } from 'express'
import { getRequestId } from './request-id.middleware.js'

export interface SentryRequestContext {
  transaction: string
  tags: Record<string, string>
  request: Record<string, string | number>
  /** Opaque id of the signed-in admin; never a name or an email */
  userId?: string
}

/** Collapses ids in a path so the same endpoint groups together: `/api/orders/ab12…` → `/api/orders/:id`. */
export function normalizePath(path: string): string {
  return path
    .split('/')
    .map((part) => (/^[a-z0-9]{20,}$/i.test(part) || /^\d+$/.test(part) ? ':id' : part))
    .join('/')
}

/** What an error report needs to be found and understood: where, how, how bad, and which request. */
export function buildSentryContext(
  req: (Partial<Request> & { admin?: { userId?: string } }) | undefined,
  status: number,
): SentryRequestContext {
  const method = req?.method ?? 'UNKNOWN'
  const rawPath = req?.path ?? (req?.url ? req.url.split('?')[0] : '') ?? ''
  const route = normalizePath(rawPath)
  const area = route.startsWith('/api/admin') ? 'admin' : 'storefront'
  const requestId = req ? getRequestId(req as Request) : 'unknown'

  const context: SentryRequestContext = {
    transaction: `${method} ${route}`,
    tags: { area, method, status: String(status), route, requestId },
    request: { method, path: rawPath, route, status, requestId, area },
  }
  if (req?.admin?.userId) context.userId = req.admin.userId
  return context
}
