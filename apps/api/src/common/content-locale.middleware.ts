import { AsyncLocalStorage } from 'node:async_hooks'
import type { Request, Response, NextFunction } from 'express'
import { parseContentLocale, type ContentLocale } from '@serag/shared'

const storage = new AsyncLocalStorage<ContentLocale>()

/**
 * The storefront asks for English with `?lang=en` (a query parameter rather than a header, so the
 * two languages never share a cached response). Mappers read it with `currentLocale()` instead of
 * every service passing it down. Admin requests never send it and always get Arabic.
 */
export function contentLocale(req: Request, _res: Response, next: NextFunction): void {
  storage.run(parseContentLocale(req.query?.lang), next)
}

/** The language of the request being handled; Arabic outside a request (seed, jobs, tests). */
export function currentLocale(): ContentLocale {
  return storage.getStore() ?? 'ar'
}

/** Runs `fn` as if handling a request in `locale` (tests). */
export function runWithLocale<T>(locale: ContentLocale, fn: () => T): T {
  return storage.run(locale, fn)
}
