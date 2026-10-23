import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  AdminGuide,
  AdminGuideRow,
  GuideInputOutput,
  GuidePatchOutput,
} from '@serag/shared'
import { sanitizeRichText } from '../common/rich-text.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const GUIDE_NOT_FOUND = 'الدليل ده مش موجود'
const SLUG_TAKEN = 'الرابط ده مستخدم'

const rowSelect = {
  id: true,
  slug: true,
  title: true,
  published: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.GuideSelect

const guideSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  cover: true,
  body: true,
  categoryIds: true,
  productIds: true,
  seoTitle: true,
  seoDescription: true,
  translations: true,
  published: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.GuideSelect

function cleanGuideTranslations(
  translations: GuideInputOutput['translations'],
): Prisma.InputJsonValue {
  if (!translations || !translations.en) return {}
  const en: Record<string, string> = {}
  if (translations.en.title && translations.en.title.trim().length > 0) {
    en.title = translations.en.title.trim()
  }
  if (translations.en.summary && translations.en.summary.trim().length > 0) {
    en.summary = translations.en.summary.trim()
  }
  if (translations.en.body) {
    const cleanBody = sanitizeRichText(translations.en.body, 'guide')
    if (cleanBody && cleanBody.trim().length > 0) {
      en.body = cleanBody
    }
  }
  if (translations.en.seoTitle && translations.en.seoTitle.trim().length > 0) {
    en.seoTitle = translations.en.seoTitle.trim()
  }
  if (translations.en.seoDescription && translations.en.seoDescription.trim().length > 0) {
    en.seoDescription = translations.en.seoDescription.trim()
  }
  return Object.keys(en).length > 0 ? { en } : {}
}

type GuideRow = Prisma.GuideGetPayload<{ select: typeof guideSelect }>
type CategorySummary = AdminGuide['categories'][number]
type ProductSummary = AdminGuide['products'][number]

interface AdminGuidesListQuery {
  q?: string
  status: 'all' | 'published' | 'draft'
  page: number
}

@Injectable()
export class AdminGuidesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: AdminGuidesListQuery,
    pageSize: number,
  ): Promise<{ items: AdminGuideRow[]; total: number; page: number; pageSize: number }> {
    const where: Prisma.GuideWhereInput = {}
    if (query.status === 'published') where.published = true
    if (query.status === 'draft') where.published = false
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ]
    }

    const [total, rows] = await Promise.all([
      this.prisma.guide.count({ where }),
      this.prisma.guide.findMany({
        where,
        select: rowSelect,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const items = rows.map((row) => ({
      ...row,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    }))

    return { items, total, page: query.page, pageSize }
  }

  async create(input: GuideInputOutput): Promise<AdminGuide> {
    await this.assertSlugFree(input.slug, null)
    await this.assertRelations(input.categoryIds, input.productIds)

    try {
      const created = await this.prisma.guide.create({
        data: {
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          cover: input.cover,
          body: sanitizeRichText(input.body, 'guide'),
          categoryIds: input.categoryIds,
          productIds: input.productIds,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          published: input.published,
          publishedAt: input.published ? new Date() : null,
          translations: cleanGuideTranslations(input.translations),
        },
        select: guideSelect,
      })

      return await this.toAdminGuide(created)
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(SLUG_TAKEN)
      }
      throw err
    }
  }

  async getById(id: string): Promise<AdminGuide> {
    const row = await this.prisma.guide.findUnique({ where: { id }, select: guideSelect })
    if (!row) {
      throw new NotFoundException(GUIDE_NOT_FOUND)
    }
    return this.toAdminGuide(row)
  }

  async update(id: string, patch: GuidePatchOutput): Promise<AdminGuide> {
    const existing = await this.prisma.guide.findUnique({ where: { id }, select: guideSelect })
    if (!existing) {
      throw new NotFoundException(GUIDE_NOT_FOUND)
    }

    if (patch.slug !== undefined && patch.slug !== existing.slug) {
      await this.assertSlugFree(patch.slug, id)
    }

    if (patch.categoryIds !== undefined || patch.productIds !== undefined) {
      await this.assertRelations(
        patch.categoryIds ?? existing.categoryIds,
        patch.productIds ?? existing.productIds,
      )
    }

    // publishedAt is stamped once, when the guide first goes live; unpublish/republish keeps it.
    const firstPublish =
      patch.published === true && !existing.published && existing.publishedAt === null

    const data: Prisma.GuideUpdateInput = {
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
      ...(patch.cover !== undefined ? { cover: patch.cover } : {}),
      ...(patch.body !== undefined ? { body: sanitizeRichText(patch.body, 'guide') } : {}),
      ...(patch.categoryIds !== undefined ? { categoryIds: patch.categoryIds } : {}),
      ...(patch.productIds !== undefined ? { productIds: patch.productIds } : {}),
      ...(patch.seoTitle !== undefined ? { seoTitle: patch.seoTitle } : {}),
      ...(patch.seoDescription !== undefined ? { seoDescription: patch.seoDescription } : {}),
      ...(patch.published !== undefined ? { published: patch.published } : {}),
      ...(firstPublish ? { publishedAt: new Date() } : {}),
      ...(patch.translations !== undefined
        ? { translations: cleanGuideTranslations(patch.translations) }
        : {}),
    }

    try {
      const updated = await this.prisma.guide.update({
        where: { id },
        data,
        select: guideSelect,
      })
      return await this.toAdminGuide(updated)
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(SLUG_TAKEN)
      }
      throw err
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.guide.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      throw new NotFoundException(GUIDE_NOT_FOUND)
    }
    await this.prisma.guide.delete({ where: { id } })
  }

  private async assertSlugFree(slug: string, currentId: string | null): Promise<void> {
    const clash = await this.prisma.guide.findFirst({
      where: { slug, ...(currentId ? { NOT: { id: currentId } } : {}) },
      select: { id: true },
    })
    if (clash) {
      throw new ConflictException(SLUG_TAKEN)
    }
  }

  private async assertRelations(
    categoryIds: readonly string[],
    productIds: readonly string[],
  ): Promise<void> {
    if (categoryIds.length > 0) {
      const found = await this.prisma.category.count({
        where: { id: { in: [...categoryIds] } },
      })
      if (found !== categoryIds.length) {
        throw new BadRequestException('في قسم مش موجود')
      }
    }

    if (productIds.length > 0) {
      const found = await this.prisma.product.count({
        where: { id: { in: [...productIds] } },
      })
      if (found !== productIds.length) {
        throw new BadRequestException('في منتج مش موجود')
      }
    }
  }

  /** Resolves stored ids into picker labels, preserving stored order and dropping deletions. */
  private async resolveSummaries(
    categoryIds: readonly string[],
    productIds: readonly string[],
  ): Promise<{ categories: CategorySummary[]; products: ProductSummary[] }> {
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({
        where: { id: { in: [...categoryIds] } },
        select: { id: true, slug: true, name: true },
      }),
      this.prisma.product.findMany({
        where: { id: { in: [...productIds] } },
        select: { id: true, slug: true, name: true },
      }),
    ])

    const categoryMap = new Map(categories.map((category) => [category.id, category]))
    const productMap = new Map(products.map((product) => [product.id, product]))

    return {
      categories: categoryIds
        .map((id) => categoryMap.get(id))
        .filter((category): category is CategorySummary => category !== undefined),
      products: productIds
        .map((id) => productMap.get(id))
        .filter((product): product is ProductSummary => product !== undefined),
    }
  }

  private async toAdminGuide(row: GuideRow): Promise<AdminGuide> {
    const { categories, products } = await this.resolveSummaries(row.categoryIds, row.productIds)

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      published: row.published,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      summary: row.summary,
      cover: row.cover,
      body: row.body,
      categoryIds: [...row.categoryIds],
      productIds: [...row.productIds],
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      translations: (row.translations as AdminGuide['translations']) ?? null,
      categories,
      products,
    }
  }
}
