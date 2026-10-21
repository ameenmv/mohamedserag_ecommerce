import { Injectable } from '@nestjs/common'
import type { SitemapEntry } from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const STATIC_PATHS = ['/', '/shop', '/offers', '/bridal', '/traders', '/guides'] as const

const slugSelect = { slug: true, updatedAt: true } satisfies Prisma.CategorySelect

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async sitemapEntries(): Promise<SitemapEntry[]> {
    const now = new Date().toISOString()

    const [categories, brands, products, pages, guides] = await Promise.all([
      this.prisma.category.findMany({ where: { visible: true }, select: slugSelect }),
      this.prisma.brand.findMany({ where: { visible: true }, select: slugSelect }),
      this.prisma.product.findMany({
        where: {
          visible: true,
          archivedAt: null,
          brand: { visible: true },
          category: { visible: true },
        },
        select: slugSelect,
      }),
      this.prisma.page.findMany({ where: { published: true }, select: slugSelect }),
      this.prisma.guide.findMany({ where: { published: true }, select: slugSelect }),
    ])

    const dynamic: SitemapEntry[] = [
      ...categories.map((row) => ({ path: `/c/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
      ...brands.map((row) => ({ path: `/b/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
      ...products.map((row) => ({ path: `/p/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
      ...pages.map((row) => ({ path: `/pages/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
      ...guides.map((row) => ({ path: `/guides/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
    ]

    dynamic.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

    const staticEntries: SitemapEntry[] = STATIC_PATHS.map((path) => ({ path, lastmod: now }))

    return [...staticEntries, ...dynamic]
  }
}
