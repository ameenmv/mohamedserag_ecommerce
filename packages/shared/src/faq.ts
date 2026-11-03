/**
 * FAQ topics representing the accordion sections on the storefront.
 */
export const FAQ_TOPICS = [
  'delivery-payment',
  'warranty',
  'returns',
  'products',
  'wholesale',
] as const

export type FaqTopic = (typeof FAQ_TOPICS)[number]

export interface PublicFaqEntry {
  id: string
  topic: FaqTopic
  question: string
  answer: string
  sort: number
}

export interface AdminFaqTranslationsEn {
  question?: string
  answer?: string
}

export interface AdminFaqTranslations {
  en?: AdminFaqTranslationsEn
}

export interface AdminFaqEntry {
  id: string
  topic: FaqTopic
  question: string
  answer: string
  sort: number
  visible: boolean
  translations?: AdminFaqTranslations | null
  createdAt: string
  updatedAt: string
}

/** Rank of topic in fixed order. Unknown topics are placed after known topics. */
export function faqTopicRank(topic: string): number {
  const index = FAQ_TOPICS.findIndex((known) => known === topic)
  return index === -1 ? FAQ_TOPICS.length : index
}

/**
 * Sorts FAQ entries by topic in `FAQ_TOPICS` order, then by sort integer, then by ID.
 */
export function compareFaqOrder(
  a: { topic: string; sort: number; id?: string },
  b: { topic: string; sort: number; id?: string },
): number {
  const rankDiff = faqTopicRank(a.topic) - faqTopicRank(b.topic)
  if (rankDiff !== 0) return rankDiff
  if (a.sort !== b.sort) return a.sort - b.sort
  return (a.id ?? '').localeCompare(b.id ?? '')
}
