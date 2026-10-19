/**
 * Pure helpers that turn catalog rows into a Google Merchant Center RSS 2.0 feed.
 * No Nest/Prisma dependencies so the XML shape can be unit-tested in isolation.
 */

/** Whether a code point is legal in an XML 1.0 document (tab, LF, CR and everything from U+0020, minus U+FFFE/U+FFFF). */
function isXmlChar(codePoint: number): boolean {
  if (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) return true
  return codePoint >= 0x20 && codePoint !== 0xfffe && codePoint !== 0xffff
}

function stripInvalidXmlChars(text: string): string {
  let out = ''
  for (const char of text) {
    if (isXmlChar(char.codePointAt(0) ?? 0)) out += char
  }
  return out
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

/** Formats integer piastres as the feed's EGP price string, e.g. 123400 -> "1234.00 EGP". */
export function formatFeedPrice(piastres: number): string {
  return `${(piastres / 100).toFixed(2)} EGP`
}

/** Strips XML 1.0 illegal characters, then escapes `& < > " '`. */
export function escapeXml(text: string): string {
  return stripInvalidXmlChars(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Removes markup, decodes common entities, collapses whitespace, and truncates to `max` chars. */
export function plainText(html: string, max: number): string {
  const withoutTags = html.replace(/<[^>]*>/g, ' ')
  const decoded = withoutTags.replace(
    /&(amp|lt|gt|quot|#39|apos|nbsp);/g,
    (match) => HTML_ENTITIES[match] ?? match,
  )
  const collapsed = decoded.replace(/\s+/g, ' ').trim()
  return collapsed.slice(0, max)
}

export interface GoogleFeedChannel {
  title: string
  link: string
  description: string
}

export interface GoogleFeedItem {
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  price: string
  availability: string
  brand: string
  condition: string
  salePrice?: string
  salePriceEffectiveDate?: string
}

/** Builds the full Google Merchant RSS 2.0 document from already-resolved channel + items. */
export function buildGoogleFeed(channel: GoogleFeedChannel, items: readonly GoogleFeedItem[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.link)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
  ]

  for (const item of items) {
    lines.push('    <item>')
    lines.push(`      <g:id>${escapeXml(item.id)}</g:id>`)
    lines.push(`      <g:title>${escapeXml(item.title)}</g:title>`)
    lines.push(`      <g:description>${escapeXml(item.description)}</g:description>`)
    lines.push(`      <g:link>${escapeXml(item.link)}</g:link>`)
    lines.push(`      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>`)
    lines.push(`      <g:price>${escapeXml(item.price)}</g:price>`)
    if (item.salePrice) {
      lines.push(`      <g:sale_price>${escapeXml(item.salePrice)}</g:sale_price>`)
    }
    if (item.salePriceEffectiveDate) {
      lines.push(
        `      <g:sale_price_effective_date>${escapeXml(item.salePriceEffectiveDate)}</g:sale_price_effective_date>`,
      )
    }
    lines.push(`      <g:availability>${escapeXml(item.availability)}</g:availability>`)
    lines.push(`      <g:brand>${escapeXml(item.brand)}</g:brand>`)
    lines.push(`      <g:condition>${escapeXml(item.condition)}</g:condition>`)
    lines.push('    </item>')
  }

  lines.push('  </channel>')
  lines.push('</rss>')
  return lines.join('\n')
}
