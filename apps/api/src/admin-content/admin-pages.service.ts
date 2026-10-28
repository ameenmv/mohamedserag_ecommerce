import { Injectable, NotFoundException } from '@nestjs/common'
import { comparePageOrder, type AdminPage, type AdminPageRow, type PageInputOutput } from '@serag/shared'
import { sanitizeRichText } from '../common/rich-text.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const rowSelect = {
  id: true,
  slug: true,
  title: true,
  published: true,
  updatedAt: true,
} satisfies Prisma.PageSelect

const pageSelect = {
  id: true,
  slug: true,
  title: true,
  published: true,
  updatedAt: true,
  body: true,
  seoTitle: true,
  seoDescription: true,
  translations: true,
} satisfies Prisma.PageSelect

type PageRecord = Prisma.PageGetPayload<{ select: typeof pageSelect }>

function cleanPageTranslations(
  translations: PageInputOutput['translations'],
): Prisma.InputJsonValue | undefined {
  if (translations === undefined) return undefined
  if (!translations || !translations.en) return {}
  const en: Record<string, string> = {}
  if (translations.en.title && translations.en.title.trim().length > 0) {
    en.title = translations.en.title.trim()
  }
  if (translations.en.body) {
    const cleanBody = sanitizeRichText(translations.en.body, 'page')
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

function toAdminPage(row: PageRecord): AdminPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    published: row.published,
    body: row.body,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    translations: (row.translations as AdminPage['translations']) ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class AdminPagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<{ items: AdminPageRow[] }> {
    const rows = await this.prisma.page.findMany({ select: rowSelect })
    const items = rows
      .map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }))
      .sort(comparePageOrder)
    return { items }
  }

  async getById(id: string): Promise<AdminPage> {
    const row = await this.prisma.page.findUnique({ where: { id }, select: pageSelect })
    if (!row) {
      throw new NotFoundException('الصفحة دي مش موجودة')
    }
    return toAdminPage(row)
  }

  async update(id: string, input: PageInputOutput): Promise<AdminPage> {
    const existing = await this.prisma.page.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      throw new NotFoundException('الصفحة دي مش موجودة')
    }

    const translationsUpdate = cleanPageTranslations(input.translations)

    const row = await this.prisma.page.update({
      where: { id },
      data: {
        title: input.title,
        body: sanitizeRichText(input.body, 'page'),
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        published: input.published,
        ...(translationsUpdate !== undefined ? { translations: translationsUpdate } : {}),
      },
      select: pageSelect,
    })

    return toAdminPage(row)
  }
}
