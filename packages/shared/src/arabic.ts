/**
 * Normalizes Arabic and mixed Arabic/Latin text for search indexing and querying.
 *
 * Rules applied in order:
 * 1. Lowercase Latin characters
 * 2. Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII 0-9
 * 3. Remove tashkeel (U+064B–U+0652, U+0670) and tatweel (U+0640)
 * 4. Fold hamza forms (أ إ آ ٱ → ا)
 * 5. Fold taa marbuta (ة → ه)
 * 6. Fold alef maqsura (ى → ي)
 * 7. Fold waw with hamza (ؤ → و) and yaa with hamza (ئ → ي)
 * 8. Fold Egyptian colloquial consonants (ث → ت, ذ → د, ظ → ض)
 * 9. Collapse whitespace and trim
 */
export function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ث/g, 'ت')
    .replace(/ذ/g, 'د')
    .replace(/ظ/g, 'ض')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalizes `text` and appends the normalized other members of any synonym group
 * that matches within the normalized text.
 */
export function expandSynonyms(text: string, synonyms: readonly (readonly string[])[]): string {
  const normalizedText = normalizeArabic(text)
  if (!normalizedText) return ''

  const extras: string[] = []
  const seen = new Set<string>()

  for (const group of synonyms) {
    const normalizedMembers = group.map((term) => normalizeArabic(term)).filter((term) => term.length > 0)

    const matched = normalizedMembers.some((term) => normalizedText.includes(term))
    if (!matched) continue

    for (const term of normalizedMembers) {
      if (!normalizedText.includes(term) && !seen.has(term)) {
        seen.add(term)
        extras.push(term)
      }
    }
  }

  return extras.length > 0 ? `${normalizedText} ${extras.join(' ')}` : normalizedText
}
