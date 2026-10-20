import type { SitemapEntry } from '@serag/shared'

/**
 * Loads the public sitemap entries from the API using the server-side internal base URL.
 */
export async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  const config = useRuntimeConfig()
  const response = await $fetch<{ entries: SitemapEntry[] }>('/seo/sitemap-entries', {
    baseURL: String(config.apiInternalBase),
    method: 'GET',
  })
  return Array.isArray(response.entries) ? response.entries : []
}
