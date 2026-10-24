import type { NuxtApp } from '#app'

/**
 * `getCachedData` for site-wide data (store info, footer pages, categories) read by components
 * that hydrate lazily (`hydrate-on-visible`). Nuxt's default only reuses the server payload while
 * the whole app hydrates, so a section hydrating later would refetch and first render without the
 * data, mismatching the server HTML. This reuses the payload for the rest of the page view.
 */
export function payloadCache<T>(key: string, nuxtApp: NuxtApp): T | undefined {
  return (nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]) as T | undefined
}
