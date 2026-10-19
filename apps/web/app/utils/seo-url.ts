import { absoluteUrl, canonicalPath } from '@serag/shared'
import { stripLocalePrefix } from './i18n'

/**
 * Builds the canonical URL for a page.
 *
 * The route already carries the locale prefix (`/en`) for English pages; it is stripped, run through
 * `canonicalPath` (drops every query param except `page` ≥ 2), and re-prefixed so the English
 * canonical keeps its `/en` segment.
 */
export function buildCanonicalUrl(
  siteUrl: string,
  routePath: string,
  query: Record<string, string | string[] | null | undefined>,
  localePrefix: string,
): string {
  const bare = stripLocalePrefix(routePath)
  const canonical = canonicalPath(bare, query)
  const prefix = localePrefix.replace(/\/$/, '')
  const path = canonical === '/' && prefix ? prefix : `${prefix}${canonical}`
  return absoluteUrl(siteUrl, path)
}
