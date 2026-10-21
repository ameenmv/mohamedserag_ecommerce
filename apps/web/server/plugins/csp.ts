import { setResponseHeader } from 'h3'
import { buildCsp, inlineScriptHashes } from '../utils/csp'

export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) return

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const renderedParts = [
      ...html.head,
      ...html.bodyPrepend,
      ...html.body,
      ...html.bodyAppend,
    ].join('\n')

    const scriptHashes = inlineScriptHashes(renderedParts)
    const config = useRuntimeConfig(event)

    const policy = buildCsp({
      scriptHashes,
      apiBase: String(config.public.apiBase ?? ''),
      umamiHost: String(config.public.umamiHost ?? ''),
      siteUrl: String(config.public.siteUrl ?? ''),
    })

    setResponseHeader(event, 'content-security-policy', policy)
  })
})
