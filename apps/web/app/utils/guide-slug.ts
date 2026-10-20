const MAX_SLUG_LENGTH = 80

/**
 * Produces a URL-safe Latin slug from a guide title.
 * Lowercases, transliterates common accented Latin letters, keeps `[a-z0-9]`
 * runs separated by single hyphens, and clamps to 80 characters.
 * Returns an empty string when the title has no Latin/digit content (e.g. Arabic),
 * so the editor leaves the hand-written slug untouched.
 */
export function slugifyGuideTitle(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '')
}

/** True when the value matches the guide slug contract (`^[a-z0-9-]{3,80}$`). */
export function isValidGuideSlug(value: string): boolean {
  return /^[a-z0-9-]{3,80}$/.test(value)
}
