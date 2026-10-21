import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { NUXT_IMAGE_ONERROR, buildCsp, inlineScriptHashes } from '../server/utils/csp'

function sha256(text: string): string {
  return 'sha256-' + createHash('sha256').update(text).digest('base64')
}

describe('inlineScriptHashes', () => {
  it('computes the exact sha256 hash for a plain inline script', () => {
    const expected = 'sha256-' + createHash('sha256').update('alert(1)').digest('base64')
    expect(inlineScriptHashes('<script>alert(1)</script>')).toEqual([expected])
  })

  it('hashes plain, text/javascript, module and importmap inline scripts in order', () => {
    const html = [
      '<script>window.__NUXT__={}</script>',
      '<script type="text/javascript">console.log(1)</script>',
      '<script type="module">import "./entry.js"</script>',
      '<script type="importmap">{"imports":{"#entry":"/_nuxt/entry.js"}}</script>',
    ].join('\n')

    expect(inlineScriptHashes(html)).toEqual([
      sha256('window.__NUXT__={}'),
      sha256('console.log(1)'),
      sha256('import "./entry.js"'),
      sha256('{"imports":{"#entry":"/_nuxt/entry.js"}}'),
    ])
  })

  it('ignores external scripts with src and non-executable json / ld+json scripts', () => {
    const html = [
      '<script src="/_nuxt/entry.js"></script>',
      '<script type="module" src="/_nuxt/chunk.js">ignored()</script>',
      '<script type="application/json" id="__NUXT_DATA__">["Reactive",1]</script>',
      '<script type="application/ld+json">{"@context":"https://schema.org"}</script>',
      '<script>window.__NUXT__={config:{}}</script>',
    ].join('\n')

    expect(inlineScriptHashes(html)).toEqual([
      sha256('window.__NUXT__={config:{}}'),
    ])
  })

  it('deduplicates identical inline scripts while preserving order', () => {
    const html = [
      '<script>first()</script>',
      '<script>second()</script>',
      '<script>first()</script>',
    ].join('\n')

    expect(inlineScriptHashes(html)).toEqual([
      sha256('first()'),
      sha256('second()'),
    ])
  })
})

describe('buildCsp', () => {
  it('adds nothing extra for relative /api and /stats paths and omits upgrade-insecure-requests on http', () => {
    const hash = sha256('window.__NUXT__={}')
    const csp = buildCsp({
      scriptHashes: [hash],
      apiBase: '/api',
      umamiHost: '/stats',
      siteUrl: 'http://localhost:3000',
    })

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain(`script-src 'self' '${hash}'`)
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("img-src 'self' data: blob:")
    expect(csp).toContain("font-src 'self' data:")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("frame-src 'self'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).not.toContain('upgrade-insecure-requests')
  })

  it('adds the API origin for http://localhost:4200/api across img-src, connect-src and form-action', () => {
    const hash = sha256('window.__NUXT__={}')
    const csp = buildCsp({
      scriptHashes: [hash],
      apiBase: 'http://localhost:4200/api',
      umamiHost: 'https://analytics.example.com/stats',
      siteUrl: 'http://localhost:3000',
    })

    expect(csp).toContain(`script-src 'self' '${hash}' https://analytics.example.com`)
    expect(csp).toContain("img-src 'self' data: blob: http://localhost:4200")
    expect(csp).toContain("connect-src 'self' http://localhost:4200 https://analytics.example.com")
    expect(csp).toContain("form-action 'self' http://localhost:4200")
  })

  it('adds upgrade-insecure-requests only for an https siteUrl', () => {
    const httpsCsp = buildCsp({
      scriptHashes: [],
      apiBase: '/api',
      umamiHost: '/stats',
      siteUrl: 'https://awadserag.com',
    })
    const httpCsp = buildCsp({
      scriptHashes: [],
      apiBase: '/api',
      umamiHost: '/stats',
      siteUrl: 'http://awadserag.com',
    })

    expect(httpsCsp).toContain('upgrade-insecure-requests')
    expect(httpCsp).not.toContain('upgrade-insecure-requests')
  })

  it('never contains unsafe-eval and has no unsafe-inline inside the script-src directive', () => {
    const hash = sha256('alert(1)')
    const csp = buildCsp({
      scriptHashes: [hash],
      apiBase: 'http://localhost:4200/api',
      umamiHost: '/stats',
      siteUrl: 'https://awadserag.com',
    })

    expect(csp).not.toContain('unsafe-eval')

    const directives = csp.split(';').map(d => d.trim())
    const scriptSrc = directives.find(d => d.startsWith('script-src '))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain('unsafe-inline')
  })
  it('allows only the fixed @nuxt/image onerror handler via unsafe-hashes', () => {
    const csp = buildCsp({ scriptHashes: [], apiBase: '/api', umamiHost: '', siteUrl: '' })
    const expected = createHash('sha256').update(NUXT_IMAGE_ONERROR).digest('base64')
    expect(csp).toContain(`'unsafe-hashes' 'sha256-${expected}'`)
  })
})
