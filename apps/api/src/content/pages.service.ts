import { Injectable, NotFoundException } from '@nestjs/common'
import { comparePageOrder, localizedText, type PublicPage, type PublicPageLink } from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { currentLocale } from '../common/content-locale.middleware.js'

const linkSelect = { slug: true, title: true, translations: true } satisfies Prisma.PageSelect

const pageSelect = {
  slug: true,
  title: true,
  body: true,
  seoTitle: true,
  seoDescription: true,
  updatedAt: true,
  translations: true,
} satisfies Prisma.PageSelect

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<{ items: PublicPageLink[] }> {
    const rows = await this.prisma.page.findMany({
      where: { published: true },
      select: linkSelect,
    })

    const locale = currentLocale()
    const items = [...rows]
      .sort(comparePageOrder)
      .map((row) => ({ slug: row.slug, title: localizedText(row.title, row.translations, 'title', locale) }))
    return { items }
  }

  async getPublishedBySlug(slug: string): Promise<PublicPage> {
    const row = await this.prisma.page.findFirst({
      where: { slug, published: true },
      select: pageSelect,
    })

    if (!row) {
      throw new NotFoundException('الصفحة دي مش موجودة')
    }

    const locale = currentLocale()
    const tr = row.translations
    return {
      slug: row.slug,
      title: localizedText(row.title, tr, 'title', locale),
      body: localizedText(row.body, tr, 'body', locale),
      seoTitle: localizedText(row.seoTitle, tr, 'seoTitle', locale),
      seoDescription: localizedText(row.seoDescription, tr, 'seoDescription', locale),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
