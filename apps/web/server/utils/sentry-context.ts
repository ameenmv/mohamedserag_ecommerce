export interface SentryServerContext {
  transaction: string
  tags: Record<string, string>
  request: Record<string, string | number>
}

/** Collapses ids so the same page groups together: `/p/…` stays, long ids and numbers become `:id`. */
export function normalizePath(path: string): string {
  return path
    .split('/')
    .map((part) => (/^[a-z0-9]{20,}$/i.test(part) || /^\d+$/.test(part) ? ':id' : part))
    .join('/')
}

/** Where a server-side render or route error happened, and how. */
export function buildSentryContext(method: string | undefined, rawPath: string | undefined, status: number): SentryServerContext {
  const verb = method ?? 'GET'
  const path = (rawPath ?? '').split('?')[0] ?? ''
  const route = normalizePath(path)
  const area = /^\/(?:en\/)?admin(?:\/|$)/.test(path) ? 'admin' : 'storefront'
  const locale = path === '/en' || path.startsWith('/en/') ? 'en' : 'ar'
  return {
    transaction: `${verb} ${route}`,
    tags: { area, locale, method: verb, status: String(status), route },
    request: { method: verb, path, route, status, area, locale },
  }
}
