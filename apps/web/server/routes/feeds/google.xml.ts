import { setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    // Deliberately does not forward the visitor IP: this feed is a shared, cacheable
    // document, not a per-visitor request that needs its own rate-limit bucket.
    const body = await $fetch<string>('/feeds/google.xml', {
      baseURL: String(config.apiInternalBase),
      method: 'GET',
      responseType: 'text',
    })
    setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
    return body
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Product feed unavailable' })
  }
})
