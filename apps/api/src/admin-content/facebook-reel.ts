const PAGE_HOSTS = new Set(['www.facebook.com', 'facebook.com', 'm.facebook.com', 'web.facebook.com'])

/** Facebook pages the admin may paste: https, a Facebook host (any path, short /share/ links too). */
export function isAllowedFacebookPage(raw: string): boolean {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && PAGE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

/** Where Facebook serves preview pictures from: https on its CDN or its own hosts. */
export function isAllowedFacebookImage(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    const host = url.hostname
    return host === 'fbcdn.net' || host.endsWith('.fbcdn.net') || PAGE_HOSTS.has(host)
  } catch {
    return false
  }
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
    }
    if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
    return NAMED_ENTITIES[body.toLowerCase()] ?? match
  })
}

/** The `content` of `<meta property="og:…">`, whichever order its attributes come in. */
export function readOpenGraph(html: string, property: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const prop = /\b(?:property|name)\s*=\s*"([^"]*)"/i.exec(tag)?.[1]
    if (prop !== `og:${property}`) continue
    const content = /\bcontent\s*=\s*"([^"]*)"/i.exec(tag)?.[1]
    if (content !== undefined) return decodeHtmlEntities(content)
  }
  return null
}

/**
 * The plain, embeddable address of a reel or video: `/reel/<id>/` or `/<page>/videos/<id>/`,
 * without the tracking query or the long title slug Facebook adds. Null for anything else.
 */
export function normalizeFacebookVideoUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || !PAGE_HOSTS.has(url.hostname)) return null
  const path = decodeURIComponent(url.pathname)
  const reel = /^\/reel\/(\d+)/.exec(path)
  if (reel) return `https://www.facebook.com/reel/${reel[1]}/`
  const video = /^\/([^/]+)\/videos\/(?:[^/]+\/)?(\d+)/.exec(path)
  if (video && video[1] !== 'share') {
    return `https://www.facebook.com/${encodeURIComponent(video[1] ?? '')}/videos/${video[2]}/`
  }
  return null
}
