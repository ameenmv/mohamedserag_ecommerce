import { createError, getRequestHeader, getRouterParam, setResponseHeaders } from 'h3'
import { isFontRequestAllowed } from '../../../utils/font-guard'

/**
 * Serves the Thmanyah font files. They live in server/assets (bundled into the server build, not
 * in public/), so no static handler can hand them out: every request passes the guard below.
 */
export default defineEventHandler(async (event) => {
  const allowed = isFontRequestAllowed({
    secFetchDest: getRequestHeader(event, 'sec-fetch-dest'),
    secFetchSite: getRequestHeader(event, 'sec-fetch-site'),
    referer: getRequestHeader(event, 'referer'),
    host: getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host'),
  })
  if (!allowed) {
    setResponseHeaders(event, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' })
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const file = getRouterParam(event, 'file') ?? ''
  if (!/^[A-Za-z0-9-]+\.woff2$/.test(file)) throw createError({ statusCode: 404 })
  const data = await useStorage('assets:server').getItemRaw<Uint8Array>(`fonts/thmanyah/${file}`)
  if (!data) throw createError({ statusCode: 404 })

  // `private`: a shared cache or CDN in front must not keep a copy another request could fetch
  setResponseHeaders(event, {
    'content-type': 'font/woff2',
    'cross-origin-resource-policy': 'same-origin',
    'cache-control': 'private, max-age=31536000, immutable',
    'x-robots-tag': 'noindex',
    vary: 'Sec-Fetch-Dest, Sec-Fetch-Site, Referer',
  })
  return data
})
