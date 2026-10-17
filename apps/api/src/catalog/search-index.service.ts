import { Injectable, NotFoundException } from '@nestjs/common'
import { buildProductSearchText } from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { SearchService } from './search.service.js'

// Note: T025 will call reindexProduct on create/update and reindexAll when synonyms change.
@Injectable()
export class SearchIndexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Rebuilds and updates `searchText` for a single product.
   */
  async reindexProduct(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    })

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`)
    }

    const synonyms = await this.searchService.getSynonyms()
    const searchText = buildProductSearchText(
      {
        name: product.name,
        brandNames: [product.brand.name],
        categoryName: product.category.name,
        modelCode: product.modelCode,
      },
      synonyms,
    )

    await this.prisma.product.update({
      where: { id },
      data: { searchText },
    })
  }

  /**
   * Rebuilds and updates `searchText` for all products across the catalog.
   */
  async reindexAll(): Promise<number> {
    this.searchService.invalidateSynonymsCache()
    const synonyms = await this.searchService.getSynonyms()

    const products = await this.prisma.product.findMany({
      select: {
        id: true,
        name: true,
        modelCode: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    })

    for (const p of products) {
      const searchText = buildProductSearchText(
        {
          name: p.name,
          brandNames: [p.brand.name],
          categoryName: p.category.name,
          modelCode: p.modelCode,
        },
        synonyms,
      )

      await this.prisma.product.update({
        where: { id: p.id },
        data: { searchText },
      })
    }

    return products.length
  }
}
