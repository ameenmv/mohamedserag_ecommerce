import type { SitemapEntry } from '@serag/shared'
import { absoluteUrl } from '@serag/shared'

/** Search engines cap a single sitemap at 50,000 URLs; split earlier to stay safe. */
export const SITEMAP_CHUNK_SIZE = 45000

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function chunkEntries(
  entries: SitemapEntry[],
  size: number = SITEMAP_CHUNK_SIZE,
): SitemapEntry[][] {
  const chunks: SitemapEntry[][] = []
  for (let start = 0; start < entries.length; start += size) {
    chunks.push(entries.slice(start, start + size))
  }
  return chunks
}

/** Default locale lives at `/`; English mirrors everything under `/en` (English `/` → `/en`). */
function englishPath(path: string): string {
  if (!path || path === '/') return '/en'
  return `/en${path.startsWith('/') ? path : `/${path}`}`
}

export function renderUrlset(entries: SitemapEntry[], siteUrl: string): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ]

  for (const entry of entries) {
    const ar = escapeXml(absoluteUrl(siteUrl, entry.path))
    const en = escapeXml(absoluteUrl(siteUrl, englishPath(entry.path)))
    lines.push(
      '  <url>',
      `    <loc>${ar}</loc>`,
      `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
      `    <xhtml:link rel="alternate" hreflang="ar" href="${ar}"/>`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${ar}"/>`,
      '  </url>',
    )
  }

  lines.push('</urlset>')
  return lines.join('\n')
}

export function renderSitemapIndex(chunkLocations: string[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const location of chunkLocations) {
    lines.push('  <sitemap>', `    <loc>${escapeXml(location)}</loc>`, '  </sitemap>')
  }

  lines.push('</sitemapindex>')
  return lines.join('\n')
}
