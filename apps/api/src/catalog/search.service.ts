import { Injectable } from '@nestjs/common'
import {
  buildSearchTerms,
  computeTrigramSimilarity,
  normalizeArabic,
  type ProductCard,
  type SearchCategorySuggestion,
  type SearchResponse,
} from '@serag/shared'
import { z } from 'zod'
import { PrismaService } from '../prisma/prisma.service.js'
import { FlashPricingService } from '../promotions/flash-pricing.service.js'
import { ReviewRatingsService } from '../reviews/review-ratings.service.js'
import {
  popularityJoinSql,
  searchMatchSql,
  searchRankSql,
  toProductCard,
} from './product-query.js'

const synonymsSettingSchema = z.array(z.array(z.string()))

function categoryMatchesTerms(
  categoryName: string,
  terms: readonly (readonly string[])[],
  normalizedQuery: string,
): boolean {
  const normCat = normalizeArabic(categoryName)
  const catWords = normCat.split(' ').filter((w) => w.length >= 2)

  for (const group of terms) {
    for (const alt of group) {
      if (alt.length < 2) continue

      // Direct substring match either way
      if (normCat.includes(alt) || alt.includes(normCat)) {
        return true
      }

      // Check each word in category name
      for (const word of catWords) {
        if (word.includes(alt) || alt.includes(word)) {
          return true
        }
        // Stem / common prefix of 3+ letters for Arabic plurals (e.g. تلاجه ↔ تلاجات, غساله ↔ غسالات)
        if (alt.length >= 3 && word.length >= 3) {
          const stemLength = Math.min(alt.length - 1, word.length - 1, 4)
          if (stemLength >= 3 && alt.slice(0, stemLength) === word.slice(0, stemLength)) {
            return true
          }
        }
        // Trigram similarity >= 0.35
        if (computeTrigramSimilarity(alt, word) >= 0.35) {
          return true
        }
      }
    }
  }

  // Also check normalizedQuery directly for typo tolerance
  if (normalizedQuery.length >= 3) {
    for (const word of catWords) {
      if (computeTrigramSimilarity(normalizedQuery, word) >= 0.35) {
        return true
      }
    }
  }

  return false
}

@Injectable()
export class SearchService {
  private cachedSynonyms: string[][] = []
  private synonymsFetchedAt = 0

  constructor(
    private readonly prisma: PrismaService,
    private readonly flashPricing: FlashPricingService,
    private readonly reviewRatings: ReviewRatingsService,
  ) {}

  /**
   * Returns search synonyms from the `searchSynonyms` Setting (cached in-memory for 60s).
   * Validates with Zod and falls back to [] if missing or invalid.
   */
  async getSynonyms(): Promise<string[][]> {
    const now = Date.now()
    if (now - this.synonymsFetchedAt < 60_000 && this.synonymsFetchedAt > 0) {
      return this.cachedSynonyms
    }

    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'searchSynonyms' },
      })

      const parsed = synonymsSettingSchema.safeParse(setting?.value)
      this.cachedSynonyms = parsed.success ? parsed.data : []
    } catch {
      this.cachedSynonyms = []
    }

    this.synonymsFetchedAt = now
    return this.cachedSynonyms
  }

  /**
   * Invalidates the in-memory synonyms cache (called during reindexing or test setup).
   */
  invalidateSynonymsCache(): void {
    this.synonymsFetchedAt = 0
    this.cachedSynonyms = []
  }

  /**
   * Executes live dropdown search for products and categories (PRD US-2.1).
   */
  async search(query: string, limit = 8): Promise<SearchResponse> {
    const trimmed = query.trim()
    if (!trimmed) {
      return { query: trimmed, items: [], categories: [] }
    }

    const normalizedQuery = normalizeArabic(trimmed)
    if (!normalizedQuery) {
      return { query: trimmed, items: [], categories: [] }
    }

    const synonyms = await this.getSynonyms()
    const terms = buildSearchTerms(trimmed, synonyms)

    let items: ProductCard[] = []

    if (terms.length > 0 || normalizedQuery.length >= 2) {
      const matchSql = searchMatchSql(terms, normalizedQuery)
      const rankSql = searchRankSql(normalizedQuery)
      const popJoin = popularityJoinSql()

      const rawRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT p.id
        FROM products p
        JOIN brands b ON p.brand_id = b.id
        JOIN categories c ON p.category_id = c.id
        ${popJoin}
        WHERE p.visible = true
          AND p.archived_at IS NULL
          AND b.visible = true
          AND c.visible = true
          AND ${matchSql}
        ORDER BY ${rankSql}
        LIMIT ${limit}
      `

      const ids = rawRows.map((r) => r.id)
      if (ids.length > 0) {
        const records = await this.prisma.product.findMany({
          where: { id: { in: ids } },
          include: {
            brand: { select: { slug: true, name: true } },
            category: { select: { slug: true, name: true } },
            images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
          },
        })

        const map = new Map(records.map((p) => [p.id, p]))
        const [flashes, ratings] = await Promise.all([
          this.flashPricing.activeFlashFor(this.prisma, ids),
          this.reviewRatings.ratingsFor(ids),
        ])
        items = ids
          .map((id) => map.get(id))
          .filter((p): p is NonNullable<typeof p> => p !== undefined)
          .map((p) =>
            toProductCard(p, flashes.get(p.id) ?? null, ratings.get(p.id) ?? null),
          )
      }
    }

    // Up to 4 visible, non-empty categories whose normalized name matches a term
    const candidateCategories = await this.prisma.category.findMany({
      where: {
        visible: true,
        products: {
          some: { visible: true, archivedAt: null },
        },
      },
      select: { slug: true, name: true },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    })

    const categories: SearchCategorySuggestion[] = []
    if (terms.length > 0 || normalizedQuery.length >= 2) {
      for (const cat of candidateCategories) {
        if (categoryMatchesTerms(cat.name, terms, normalizedQuery)) {
          categories.push({ slug: cat.slug, name: cat.name })
          if (categories.length >= 4) break
        }
      }
    }

    return {
      query: trimmed,
      items,
      categories,
    }
  }
}
