import { Injectable, NotFoundException } from '@nestjs/common'
import {
  scoreQuiz,
  type PublicQuiz,
  type QuizCandidate,
  type QuizResultsResponse,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { FlashPricingService } from '../promotions/flash-pricing.service.js'
import { ReviewRatingsService } from '../reviews/review-ratings.service.js'
import { popularityJoinSql, toProductCard } from '../catalog/product-query.js'
import { parseStoredQuiz } from './quiz-definition.js'

const NO_QUIZ_MESSAGE = 'مفيش اختبار للقسم ده'

interface CandidateRow {
  id: string
  popularity: number
  specs: Prisma.JsonValue
}

/** Keeps only plain JSON primitive spec values, mirroring the shape `scoreQuiz` expects. */
function parseSpecObject(value: Prisma.JsonValue): Record<string, string | number | boolean | null> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  const specs: Record<string, string | number | boolean | null> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (
      raw === null ||
      typeof raw === 'string' ||
      typeof raw === 'number' ||
      typeof raw === 'boolean'
    ) {
      specs[key] = raw
    }
  }
  return specs
}

/**
 * Loads and scores the «ساعدني أختار» quiz, and returns the public quiz definition (questions only).
 */
@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flashPricing: FlashPricingService,
    private readonly reviewRatings: ReviewRatingsService,
  ) {}

  async getQuiz(categorySlug: string): Promise<PublicQuiz> {
    const category = await this.prisma.category.findFirst({
      where: { slug: categorySlug, visible: true },
      select: {
        slug: true,
        name: true,
        quizRule: { select: { questions: true, rules: true } },
      },
    })

    const definition = parseStoredQuiz(category?.quizRule?.questions, category?.quizRule?.rules)
    if (!category || !definition) {
      throw new NotFoundException(NO_QUIZ_MESSAGE)
    }

    return {
      category: { slug: category.slug, name: category.name },
      questions: definition.questions,
    }
  }

  async getResults(
    categorySlug: string,
    answers: Record<string, string>,
  ): Promise<QuizResultsResponse> {
    const category = await this.prisma.category.findFirst({
      where: { slug: categorySlug, visible: true },
      select: {
        id: true,
        quizRule: { select: { questions: true, rules: true } },
      },
    })

    const definition = parseStoredQuiz(category?.quizRule?.questions, category?.quizRule?.rules)
    if (!category || !definition) {
      throw new NotFoundException(NO_QUIZ_MESSAGE)
    }

    const rows = await this.prisma.$queryRaw<CandidateRow[]>(Prisma.sql`
      SELECT p.id, COALESCE(pop.units_sold, 0)::int AS popularity, p.specs
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      ${popularityJoinSql()}
      WHERE p.category_id = ${category.id}
        AND p.visible = true
        AND p.archived_at IS NULL
        AND b.visible = true
        AND c.visible = true
        AND NOT (p.availability_mode = 'out' OR (p.availability_mode = 'auto' AND p.stock <= 0))
    `)

    const candidates: QuizCandidate[] = rows.map((row) => ({
      id: row.id,
      popularity: row.popularity,
      specs: parseSpecObject(row.specs),
    }))

    const scored = scoreQuiz(candidates, definition, answers)
    if (scored.items.length === 0) {
      return { items: [], fallback: scored.fallback }
    }

    const ids = scored.items.map((item) => item.id)
    const [products, flashes, ratings] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: ids } },
        include: {
          brand: { select: { slug: true, name: true } },
          category: { select: { slug: true, name: true } },
          images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
        },
      }),
      this.flashPricing.activeFlashFor(this.prisma, ids),
      this.reviewRatings.ratingsFor(ids),
    ])

    const productMap = new Map(products.map((product) => [product.id, product]))
    const items: QuizResultsResponse['items'] = []
    for (const item of scored.items) {
      const product = productMap.get(item.id)
      if (!product) continue
      items.push({
        product: toProductCard(product, flashes.get(item.id) ?? null, ratings.get(item.id) ?? null),
        reason: item.reason,
      })
    }

    return { items, fallback: scored.fallback }
  }
}
