const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
}

/**
 * Produces a plain-text excerpt from sanitized page HTML without a DOM:
 * strips tags with a regex, decodes the small set of entities the sanitizer emits,
 * collapses whitespace, and clamps to `max` characters.
 */
export function plainTextExcerpt(html: string, max: number): string {
  if (!html || max <= 0) return ''

  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_match, entity: string) => ENTITY_MAP[entity] ?? '')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length <= max) return text
  return text.slice(0, max).trimEnd()
}
