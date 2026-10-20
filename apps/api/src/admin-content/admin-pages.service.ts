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
} satisfies Prisma.PageSelect

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
    return { ...row, updatedAt: row.updatedAt.toISOString() }
  }

  async update(id: string, input: PageInputOutput): Promise<AdminPage> {
    const existing = await this.prisma.page.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      throw new NotFoundException('الصفحة دي مش موجودة')
    }

    const row = await this.prisma.page.update({
      where: { id },
      data: {
        title: input.title,
        body: sanitizeRichText(input.body, 'page'),
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        published: input.published,
      },
      select: pageSelect,
    })

    return { ...row, updatedAt: row.updatedAt.toISOString() }
  }
}
