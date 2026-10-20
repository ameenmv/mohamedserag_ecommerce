const STORE_TIME_ZONE = 'Africa/Cairo'

function intlLocale(locale: string): string {
  // Arabic UI keeps Latin digits for numbers and dates (constitution §II).
  return locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB'
}

/**
 * Formats a date for the admin/storefront UI with Latin digits and the store's time zone,
 * so server and client render the same text (no hydration mismatch).
 */
export function formatDate(value: Date | string, locale: string): string {
  return new Date(value).toLocaleDateString(intlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: STORE_TIME_ZONE,
  })
}

/** Day and short month only, for tight spots such as chart axes. */
export function formatDayMonth(value: Date | string, locale: string): string {
  return new Date(value).toLocaleDateString(intlLocale(locale), {
    month: 'short',
    day: 'numeric',
    timeZone: STORE_TIME_ZONE,
  })
}

export function formatDateTime(value: Date | string, locale: string): string {
  return new Date(value).toLocaleString(intlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: STORE_TIME_ZONE,
  })
}
