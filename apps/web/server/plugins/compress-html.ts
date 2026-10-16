import { getRequestHeader, getResponseHeader, removeResponseHeader, setResponseHeader } from 'h3'

// Caddy compresses in production; this covers the bare node server used by Lighthouse CI and
// `node .output/server/index.mjs`. Caddy does not re-encode a response that is already encoded.
// Nuxt 4.6 hands the rendered page over as a stream with its content-type set on the event.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const contentType = String(getResponseHeader(event, 'content-type') ?? response.headers?.['content-type'] ?? '')
    if (!contentType.includes('text/html')) return
    if (!(getRequestHeader(event, 'accept-encoding') ?? '').includes('gzip')) return

    const body: unknown = response.body
    const stream =
      typeof body === 'string' ? new Blob([body]).stream()
        : body instanceof ReadableStream ? body
          : null
    if (!stream) return

    response.body = stream.pipeThrough(new CompressionStream('gzip'))
    setResponseHeader(event, 'content-encoding', 'gzip')
    setResponseHeader(event, 'vary', 'accept-encoding')
    removeResponseHeader(event, 'content-length')
  })
})
