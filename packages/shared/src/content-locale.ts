/**
 * Storefront content language. Catalog, pages and guides are written in Arabic; English text lives
 * in each record's `translations.en` object and falls back to the Arabic field when missing.
 */
export const CONTENT_LOCALES = ['ar', 'en'] as const
export type ContentLocale = (typeof CONTENT_LOCALES)[number]

/** Anything other than "en" (absent, unknown, an array from a repeated query param) is Arabic. */
export function parseContentLocale(value: unknown): ContentLocale {
  return value === 'en' ? 'en' : 'ar'
}

/** The English object of a `translations` JSON column, or null when there is none. */
export function englishTranslations(translations: unknown): Record<string, unknown> | null {
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) return null
  const en = (translations as Record<string, unknown>).en
  return en && typeof en === 'object' && !Array.isArray(en) ? (en as Record<string, unknown>) : null
}

/**
 * The field's text in `locale`: the English translation when the locale is English and a non-empty
 * one exists, otherwise the Arabic original.
 */
export function localizedText<T extends string | null | undefined>(
  original: T,
  translations: unknown,
  field: string,
  locale: ContentLocale,
): T | string {
  if (locale !== 'en') return original
  const value = englishTranslations(translations)?.[field]
  return typeof value === 'string' && value.trim() !== '' ? value : original
}

/** English array (any items, e.g. a cookware set's `{ item, size, qty }` rows) when present. */
export function localizedArray(
  original: unknown[] | null,
  translations: unknown,
  field: string,
  locale: ContentLocale,
): unknown[] | null {
  if (locale !== 'en') return original
  const value = englishTranslations(translations)?.[field]
  return Array.isArray(value) && value.length > 0 ? value : original
}

/** Same as `localizedText` for string lists (e.g. a cookware set's contents). */
export function localizedList(
  original: string[] | null,
  translations: unknown,
  field: string,
  locale: ContentLocale,
): string[] | null {
  if (locale !== 'en') return original
  const value = englishTranslations(translations)?.[field]
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')
    ? (value as string[])
    : original
}

interface SpecFieldText {
  label: string
  unit?: string | null
  options?: string[] | null
  labelEn?: string | null
  unitEn?: string | null
  optionsEn?: string[] | null
}

/** A spec field's label, unit and (for choices) value in `locale`, with Arabic fallbacks. */
export function localizedSpec(
  field: SpecFieldText,
  value: string | number | boolean,
  locale: ContentLocale,
): { label: string; unit: string | null; value: string | number | boolean } {
  const unit = field.unit ?? null
  if (locale !== 'en') return { label: field.label, unit, value }
  const index = typeof value === 'string' && field.options ? field.options.indexOf(value) : -1
  const optionEn = index >= 0 ? field.optionsEn?.[index]?.trim() : undefined
  return {
    label: field.labelEn?.trim() || field.label,
    unit: field.unitEn?.trim() || unit,
    value: optionEn || value,
  }
}

/**
 * A category's spec fields as the storefront shows them: label and unit in `locale`, and
 * `optionLabels` naming each option, while `options` keep their Arabic values (filters send
 * those back). The English source fields are dropped from the public response.
 */
export function localizedSpecFields<F extends SpecFieldText & { options?: string[] | null }>(
  fields: F[],
  locale: ContentLocale,
): Array<Omit<F, 'labelEn' | 'unitEn' | 'optionsEn'> & { optionLabels?: string[] | null }> {
  return fields.map(({ labelEn, unitEn, optionsEn, ...field }) => {
    if (locale !== 'en') return field
    return {
      ...field,
      label: labelEn?.trim() || field.label,
      unit: unitEn?.trim() || field.unit,
      optionLabels: field.options ? field.options.map((opt, i) => optionsEn?.[i]?.trim() || opt) : null,
    }
  })
}
