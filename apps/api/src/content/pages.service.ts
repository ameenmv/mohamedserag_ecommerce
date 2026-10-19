import { Injectable, NotFoundException } from '@nestjs/common'
import { comparePageOrder, type PublicPage, type PublicPageLink } from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const linkSelect = { slug: true, title: true } satisfies Prisma.PageSelect

const pageSelect = {
  slug: true,
  title: true,
  body: true,
  seoTitle: true,
  seoDescription: true,
  updatedAt: true,
} satisfies Prisma.PageSelect

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<{ items: PublicPageLink[] }> {
    const rows = await this.prisma.page.findMany({
      where: { published: true },
      select: linkSelect,
    })

    const items = [...rows].sort(comparePageOrder).map((row) => ({ slug: row.slug, title: row.title }))
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

    return {
      slug: row.slug,
      title: row.title,
      body: row.body,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
