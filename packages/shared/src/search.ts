import { normalizeArabic, expandSynonyms } from './arabic.js'
import type { ProductCard } from './catalog.js'

export interface BuildProductSearchTextInput {
  name: string
  brandNames: string[]
  categoryName: string
  modelCode: string
  extra?: string[]
}

/**
 * Builds the canonical search text for a product (PRD US-2.1).
 * Normalizes Arabic letters, folds digits, and appends expanded synonyms.
 *
 * Used during catalog seeding and by `SearchIndexService` for product reindexing.
 */
export function buildProductSearchText(
  input: BuildProductSearchTextInput,
  synonyms: readonly (readonly string[])[],
): string {
  const parts: string[] = [
    input.name,
    ...input.brandNames,
    input.categoryName,
    ...(input.extra ?? []),
    input.modelCode,
  ].filter((p): p is string => typeof p === 'string' && p.trim().length > 0)

  return expandSynonyms(parts.join(' '), synonyms)
}

interface MultiWordPhraseDef {
  phrase: string
  group: string[]
}

interface PhraseMatchSpan {
  start: number
  end: number
  phrase: string
  group: string[]
}

/**
 * Normalizes `query` with `normalizeArabic`, splits into tokens (dropping tokens shorter than 2 chars),
 * and for each token returns its alternatives: the token itself plus the normalized members of any
 * synonym group where a member equals or contains the token or the token contains the member.
 *
 * Multi-word synonyms (e.g. «إل جي», «no frost») are detected on the normalized query before tokenizing.
 */
export function buildSearchTerms(
  query: string,
  synonyms: readonly (readonly string[])[],
): string[][] {
  const normalizedQuery = normalizeArabic(query)
  if (!normalizedQuery) {
    return []
  }

  // Pre-normalize each synonym group: normalize Arabic letters, filter non-empty, deduplicate.
  const normalizedGroups: string[][] = []
  for (const group of synonyms) {
    const seen = new Set<string>()
    const normGroup: string[] = []
    for (const member of group) {
      const norm = normalizeArabic(member)
      if (norm.length > 0 && !seen.has(norm)) {
        seen.add(norm)
        normGroup.push(norm)
      }
    }
    if (normGroup.length > 0) {
      normalizedGroups.push(normGroup)
    }
  }

  // Collect multi-word phrases across all groups (phrases containing at least one space)
  const multiWordPhrases: MultiWordPhraseDef[] = []
  for (const group of normalizedGroups) {
    for (const member of group) {
      if (member.includes(' ')) {
        multiWordPhrases.push({ phrase: member, group })
      }
    }
  }

  // Sort multi-word phrases by length descending (greedy longest phrase matching)
  multiWordPhrases.sort((a, b) => b.phrase.length - a.phrase.length)

  // Detect non-overlapping multi-word phrase matches on the normalized query at word boundaries
  const matches: PhraseMatchSpan[] = []

  for (const { phrase, group } of multiWordPhrases) {
    let searchPos = 0
    while (searchPos < normalizedQuery.length) {
      const idx = normalizedQuery.indexOf(phrase, searchPos)
      if (idx === -1) break

      const end = idx + phrase.length

      // Verify word boundary at start and end
      const startBoundary = idx === 0 || normalizedQuery[idx - 1] === ' '
      const endBoundary = end === normalizedQuery.length || normalizedQuery[end] === ' '

      if (startBoundary && endBoundary) {
        // Check for overlap with already accepted matches
        const overlaps = matches.some((m) => Math.max(m.start, idx) < Math.min(m.end, end))
        if (!overlaps) {
          matches.push({ start: idx, end, phrase, group })
        }
      }

      searchPos = idx + 1
    }
  }

  // Sort matches by start position in the query
  matches.sort((a, b) => a.start - b.start)

  const result: string[][] = []

  let cursor = 0

  const processGap = (text: string) => {
    const tokens = text.split(' ').map((t) => t.trim()).filter((t) => t.length >= 2)
    for (const token of tokens) {
      const alternatives: string[] = [token]
      const seen = new Set<string>([token])

      for (const group of normalizedGroups) {
        const matchesGroup = group.some(
          (member) => member === token || member.includes(token) || token.includes(member),
        )
        if (matchesGroup) {
          for (const member of group) {
            if (!seen.has(member)) {
              seen.add(member)
              alternatives.push(member)
            }
          }
        }
      }

      result.push(alternatives)
    }
  }

  for (const match of matches) {
    if (match.start > cursor) {
      const gap = normalizedQuery.slice(cursor, match.start)
      processGap(gap)
    }

    // Add phrase alternatives
    const phraseAlternatives: string[] = [match.phrase]
    const seenPhrase = new Set<string>([match.phrase])

    for (const member of match.group) {
      if (!seenPhrase.has(member)) {
        seenPhrase.add(member)
        phraseAlternatives.push(member)
      }
    }

    result.push(phraseAlternatives)
    cursor = match.end
  }

  if (cursor < normalizedQuery.length) {
    const trailingGap = normalizedQuery.slice(cursor)
    processGap(trailingGap)
  }

  return result
}

/**
 * Calculates pg_trgm similarity between two strings (0.0 to 1.0).
 * Matches PostgreSQL's pg_trgm trigram formula (2 leading spaces, 1 trailing space).
 */
export function computeTrigramSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0

  const getTrigrams = (str: string): Map<string, number> => {
    const padded = `  ${str} `
    const trigrams = new Map<string, number>()
    for (let i = 0; i < padded.length - 2; i++) {
      const tri = padded.slice(i, i + 3)
      trigrams.set(tri, (trigrams.get(tri) ?? 0) + 1)
    }
    return trigrams
  }

  const triA = getTrigrams(a)
  const triB = getTrigrams(b)

  let intersection = 0
  let totalA = 0
  for (const [tri, countA] of triA) {
    totalA += countA
    const countB = triB.get(tri) ?? 0
    intersection += Math.min(countA, countB)
  }

  let totalB = 0
  for (const countB of triB.values()) {
    totalB += countB
  }

  const union = totalA + totalB - intersection
  return union === 0 ? 0 : intersection / union
}

export interface SearchCategorySuggestion {
  slug: string
  name: string
}

export interface SearchResponse {
  query: string
  items: ProductCard[]
  categories: SearchCategorySuggestion[]
}
