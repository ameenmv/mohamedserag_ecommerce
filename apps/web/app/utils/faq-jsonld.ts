import type { PublicFaqEntry } from '@serag/shared'

/**
 * Builds Schema.org `FAQPage` structured data from visible FAQ entries.
 * Strips HTML formatting from answers for clean schema markup.
 * Returns null if the entries list is empty.
 */
export function buildFaqJsonLd(entries: readonly PublicFaqEntry[]): Record<string, unknown> | null {
  if (!entries || entries.length === 0) {
    return null
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer
          .replace(/<\/(?:p|li|div|h[1-6]|ul|ol)>|<br\s*\/?>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim(),
      },
    })),
  }
}
