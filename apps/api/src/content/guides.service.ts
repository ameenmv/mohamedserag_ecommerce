import { Injectable, NotFoundException } from '@nestjs/common'
import { localizedText, type GuideCard, type ProductCard, type PublicGuide } from '@serag/shared'
import { toProductCard } from '../catalog/product-query.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { currentLocale } from '../common/content-locale.middleware.js'
import { FlashPricingService } from '../promotions/flash-pricing.service.js'
import { ReviewRatingsService } from '../reviews/review-ratings.service.js'

const cardSelect = {
  slug: true,
  title: true,
  summary: true,
  cover: true,
  publishedAt: true,
  categoryIds: true,
  translations: true,
} satisfies Prisma.GuideSelect

const guideSelect = {
  slug: true,
  title: true,
  summary: true,
  cover: true,
  body: true,
  categoryIds: true,
  productIds: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true,
  updatedAt: true,
  translations: true,
} satisfies Prisma.GuideSelect

type CategoryLabel = { slug: string; name: string }

@Injectable()
export class GuidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flashPricing: FlashPricingService,
    private readonly reviewRatings: ReviewRatingsService,
  ) {}

  async listPublished(
    page: number,
    pageSize: number,
  ): Promise<{ items: GuideCard[]; total: number; page: number; pageSize: number }> {
    const where = { published: true } satisfies Prisma.GuideWhereInput

    const [total, rows] = await Promise.all([
      this.prisma.guide.count({ where }),
      this.prisma.guide.findMany({
        where,
        select: cardSelect,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const categoriesById = await this.visibleCategoriesMap(rows.flatMap((row) => row.categoryIds))

    const locale = currentLocale()
    const items = rows.map((row) => ({
      slug: row.slug,
      title: localizedText(row.title, row.translations, 'title', locale),
      summary: localizedText(row.summary, row.translations, 'summary', locale),
      cover: row.cover,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      categories: this.orderedCategories(row.categoryIds, categoriesById),
    }))

    return { items, total, page, pageSize }
  }

  async getPublishedBySlug(slug: string): Promise<PublicGuide> {
    const row = await this.prisma.guide.findFirst({
      where: { slug, published: true },
      select: guideSelect,
    })

    if (!row) {
      throw new NotFoundException('الدليل ده مش موجود')
    }

    const categoriesById = await this.visibleCategoriesMap(row.categoryIds)
    const products = await this.resolveProductCards(row.productIds)

    const locale = currentLocale()
    const tr = row.translations
    return {
      slug: row.slug,
      title: localizedText(row.title, tr, 'title', locale),
      summary: localizedText(row.summary, tr, 'summary', locale),
      cover: row.cover,
      body: localizedText(row.body, tr, 'body', locale),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      seoTitle: localizedText(row.seoTitle, tr, 'seoTitle', locale),
      seoDescription: localizedText(row.seoDescription, tr, 'seoDescription', locale),
      categories: this.orderedCategories(row.categoryIds, categoriesById),
      products,
    }
  }

  /** One query for every category referenced by the whole page — no N+1. */
  private async visibleCategoriesMap(ids: readonly string[]): Promise<Map<string, CategoryLabel>> {
    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length === 0) return new Map()

    const rows = await this.prisma.category.findMany({
      where: { id: { in: uniqueIds }, visible: true },
      select: { id: true, slug: true, name: true, translations: true },
    })

    const locale = currentLocale()
    return new Map(
      rows.map((row) => [row.id, { slug: row.slug, name: localizedText(row.name, row.translations, 'name', locale) }]),
    )
  }

  private orderedCategories(
    ids: readonly string[],
    categoriesById: Map<string, CategoryLabel>,
  ): CategoryLabel[] {
    return ids
      .map((id) => categoriesById.get(id))
      .filter((category): category is CategoryLabel => category !== undefined)
  }

  /** Orderable-visible products, kept in the guide's stored order. */
  private async resolveProductCards(productIds: readonly string[]): Promise<ProductCard[]> {
    const idList = [...new Set(productIds)]
    if (idList.length === 0) return []

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: idList },
        visible: true,
        archivedAt: null,
        brand: { visible: true },
        category: { visible: true },
      },
      include: {
        brand: { select: { slug: true, name: true, translations: true } },
        category: { select: { slug: true, name: true, translations: true } },
        images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
      },
    })

    const productMap = new Map(products.map((product) => [product.id, product]))
    const ordered = idList
      .map((id) => productMap.get(id))
      .filter((product): product is NonNullable<typeof product> => product !== undefined)

    const orderedIds = ordered.map((product) => product.id)
    const [flashes, ratings] = await Promise.all([
      this.flashPricing.activeFlashFor(this.prisma, orderedIds),
      this.reviewRatings.ratingsFor(orderedIds),
    ])

    return ordered.map((product) =>
      toProductCard(product, flashes.get(product.id) ?? null, ratings.get(product.id) ?? null),
    )
  }
}
