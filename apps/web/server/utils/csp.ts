import { createHash } from 'node:crypto'

const SCRIPT_TAG_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const SRC_ATTR_RE = /(?:^|\s)src(?:\s*=|\s|$)/i
const TYPE_ATTR_RE = /(?:^|\s)type(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))|(?=\s|$))/i

const EXECUTABLE_SCRIPT_TYPES = new Set([
  '',
  'text/javascript',
  'module',
  'importmap',
])

/**
 * The one inline event handler we allow: `@nuxt/image` renders
 * `onerror="this.setAttribute('data-error', 1)"` on every server-rendered image.
 * Only this exact handler is allowed (via 'unsafe-hashes'); handlers are never hashed from
 * the page itself, since stored rich text could otherwise smuggle one in.
 */
export const NUXT_IMAGE_ONERROR = "this.setAttribute('data-error', 1)"
const NUXT_IMAGE_ONERROR_HASH = `'sha256-${createHash('sha256').update(NUXT_IMAGE_ONERROR).digest('base64')}'`

export interface BuildCspInput {
  scriptHashes: string[]
  apiBase: string
  umamiHost: string
  siteUrl: string
}

function isExecutableInlineScript(attrs: string): boolean {
  if (SRC_ATTR_RE.test(attrs)) return false
  const typeMatch = TYPE_ATTR_RE.exec(attrs)
  if (!typeMatch) return true
  const rawType = typeMatch[1] ?? typeMatch[2] ?? typeMatch[3] ?? ''
  return EXECUTABLE_SCRIPT_TYPES.has(rawType.trim().toLowerCase())
}

function parseOrigin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('/')) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

function formatHashToken(hash: string): string {
  const trimmed = hash.trim()
  if (trimmed.startsWith('\'') && trimmed.endsWith('\'')) {
    return trimmed
  }
  return `'${trimmed}'`
}

export function inlineScriptHashes(html: string): string[] {
  const seen = new Set<string>()
  const hashes: string[] = []

  for (const match of html.matchAll(SCRIPT_TAG_RE)) {
    const attrs = match[1] ?? ''
    const content = match[2] ?? ''
    if (!isExecutableInlineScript(attrs)) continue

    const digest = createHash('sha256').update(content).digest('base64')
    const hash = `sha256-${digest}`
    if (!seen.has(hash)) {
      seen.add(hash)
      hashes.push(hash)
    }
  }

  return hashes
}

export function buildCsp(input: BuildCspInput): string {
  const apiOrigin = parseOrigin(input.apiBase)
  const umamiOrigin = parseOrigin(input.umamiHost)

  const scriptTokens = ['\'self\'']
  for (const hash of input.scriptHashes) {
    const token = formatHashToken(hash)
    if (!scriptTokens.includes(token)) {
      scriptTokens.push(token)
    }
  }
  if (umamiOrigin && !scriptTokens.includes(umamiOrigin)) {
    scriptTokens.push(umamiOrigin)
  }
  scriptTokens.push('\'unsafe-hashes\'', NUXT_IMAGE_ONERROR_HASH)

  const imgTokens = ['\'self\'', 'data:', 'blob:']
  if (apiOrigin && !imgTokens.includes(apiOrigin)) {
    imgTokens.push(apiOrigin)
  }

  const connectTokens = ['\'self\'']
  if (apiOrigin && !connectTokens.includes(apiOrigin)) {
    connectTokens.push(apiOrigin)
  }
  if (umamiOrigin && !connectTokens.includes(umamiOrigin)) {
    connectTokens.push(umamiOrigin)
  }

  const formActionTokens = ['\'self\'']
  if (apiOrigin && !formActionTokens.includes(apiOrigin)) {
    formActionTokens.push(apiOrigin)
  }

  const directives = [
    'default-src \'self\'',
    `script-src ${scriptTokens.join(' ')}`,
    'style-src \'self\' \'unsafe-inline\'',
    `img-src ${imgTokens.join(' ')}`,
    'font-src \'self\' data:',
    `connect-src ${connectTokens.join(' ')}`,
    // Facebook's video player, for the trader reels popup (loaded only when a visitor opens one)
    'frame-src \'self\' https://www.facebook.com',
    'frame-ancestors \'self\'',
    'object-src \'none\'',
    'base-uri \'self\'',
    `form-action ${formActionTokens.join(' ')}`,
  ]

  if (input.siteUrl.trim().toLowerCase().startsWith('https://')) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}
