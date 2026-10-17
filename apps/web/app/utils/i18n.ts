/**
 * Pure i18n utility helpers.
 */

/**
 * Removes a leading `/en` locale prefix segment from a pathname.
 * If the resulting path is empty (''), normalizes to '/'.
 */
export function stripLocalePrefix(path: string): string {
  const stripped = path.replace(/^\/en(?=\/|$)/, '')
  return stripped === '' ? '/' : stripped
}
