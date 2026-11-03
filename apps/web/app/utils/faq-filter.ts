import { normalizeArabic, type PublicFaqEntry } from '@serag/shared'

export interface FaqFilterOptions {
  topic?: string | null
  query?: string | null
}

/**
 * Pure search and topic filter utility for storefront FAQ entries.
 * Normalizes Arabic letters (hamzas, ta marbuta, alef maqsura, tatweel, digits)
 * and folds English case so shoppers can easily find answers.
 */
export function filterFaqEntries(
  entries: readonly PublicFaqEntry[],
  options: FaqFilterOptions = {},
): PublicFaqEntry[] {
  let result = [...entries]

  // Filter by topic if a specific topic is selected and not 'all'
  if (options.topic && options.topic !== 'all') {
    result = result.filter((entry) => entry.topic === options.topic)
  }

  // Filter by search query if non-empty
  const rawQuery = options.query?.trim()
  if (rawQuery && rawQuery.length > 0) {
    const normalizedQuery = normalizeArabic(rawQuery)
    const tokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 0)

    if (tokens.length > 0) {
      result = result.filter((entry) => {
        // Strip basic HTML tags from answer so markup does not pollute text search
        const cleanAnswer = entry.answer.replace(/<[^>]+>/g, ' ')
        const searchable = normalizeArabic(`${entry.question} ${cleanAnswer}`)
        return tokens.every((token) => searchable.includes(token))
      })
    }
  }

  return result
}
