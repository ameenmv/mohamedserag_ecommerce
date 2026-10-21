import type { SitemapEntry } from '@serag/shared'

/**
 * Loads the public sitemap entries from the API using the server-side internal base URL.
 *
 * Deliberately does not forward the visitor IP: the result is a shared, cacheable document
 * identical for every visitor, so there is no per-visitor rate-limit bucket to preserve.
 */
export async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  const config = useRuntimeConfig()
  const response = await $fetch<{ entries: SitemapEntry[] }>('/seo/sitemap-entries', {
    baseURL: String(config.apiInternalBase),
    method: 'GET',
  })
  return Array.isArray(response.entries) ? response.entries : []
}
