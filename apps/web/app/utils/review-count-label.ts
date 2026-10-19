/**
 * Pure internationalization utility to select the correct plural rule key
 * for review count labels according to Unicode CLDR / Intl.PluralRules.
 *
 * Plural categories:
 * - Arabic (ar): zero (0), one (1), two (2), few (3-10), many (11-99), other (100+)
 * - English (en): zero (0), one (1), other (2+)
 */
export function reviewCountKey(count: number, locale = 'ar'): string {
  if (count === 0) {
    return 'store.reviews.count.zero'
  }
  const rule = new Intl.PluralRules(locale).select(count)
  return `store.reviews.count.${rule}`
}
