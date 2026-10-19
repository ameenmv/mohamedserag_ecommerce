import { Injectable } from '@nestjs/common'
import {
  buildSearchTerms,
  egpToPiastres,
  normalizeArabic,
  piastresToEgp,
  resolveCatalogSort,
  specTemplateFieldSchema,
  type ProductCard,
  type ProductListResponse,
  type ProductQueryOutput,
  type SpecTemplateField,
} from '@serag/shared'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { FlashPricingService } from '../promotions/flash-pricing.service.js'
import {
  buildAvailabilitySqlCondition,
  buildSpecFilterSqlConditions,
  mapSortToOrderBy,
  parseAvailabilityFilter,
  parseSpecFilters,
  popularityJoinSql,
  searchMatchSql,
  toProductCard,
} from './product-query.js'
import { SearchService } from './search.service.js'

interface IdTotalRow {
  id: string
  total_count: number
}

interface BrandFacetRow {
  slug: string
  name: string
  count: number
}

interface PriceFacetRow {
  min_price: number | null
  max_price: number | null
}

@Injectable()
export class ProductListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly flashPricing: FlashPricingService,
  ) {}

  /**
   * Returns a filtered, sorted, paginated list of products or exact products by IDs (US-2.2, US-2.4).
   */
  async getProducts(
    query: ProductQueryOutput,
    rawQuery: Record<string, unknown>,
  ): Promise<ProductListResponse> {
    // ------------------------------------------------------------------------
    // Branch 1: `ids` parameter is present (Wishlist and Compare, US-2.4)
    // ------------------------------------------------------------------------
    if (query.ids) {
      const idList = query.ids
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      if (idList.length === 0) {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: 0,
          facets: { brands: [], price: { min: null, max: null } },
        }
      }

      const products = await this.prisma.product.findMany({
        where: {
          id: { in: idList },
          visible: true,
          archivedAt: null,
          brand: { visible: true },
          category: { visible: true },
        },
        include: {
          brand: { select: { slug: true, name: true } },
          category: { select: { slug: true, name: true } },
          images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
        },
      })

      const productMap = new Map(products.map((p) => [p.id, p]))
      const ordered = idList
        .map((id) => productMap.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)

      const flashes = await this.flashPricing.activeFlashFor(
        this.prisma,
        ordered.map((p) => p.id),
      )
      const items = ordered.map((p) => toProductCard(p, flashes.get(p.id) ?? null))

      // IDs mode is used for wishlist/compare (US-2.4) and requires no live facet computation.
      return {
        items,
        total: items.length,
        page: 1,
        pageSize: idList.length,
        facets: { brands: [], price: { min: null, max: null } },
      }
    }

    // ------------------------------------------------------------------------
    // Branch 2: Standard catalog listing with category, brand, price, spec filters
    // ------------------------------------------------------------------------
    let templateFields: SpecTemplateField[] = []
    let categoryIds: string[] | undefined

    if (query.category) {
      const category = await this.prisma.category.findFirst({
        where: { slug: query.category, visible: true },
        include: { specTemplate: true },
      })

      if (!category) {
        return {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
          facets: { brands: [], price: { min: null, max: null } },
        }
      }

      // Collect descendant category IDs
      const allCategories = await this.prisma.category.findMany({
        where: { visible: true },
        select: { id: true, parentId: true },
      })

      const childrenMap = new Map<string, string[]>()
      for (const cat of allCategories) {
        if (cat.parentId) {
          const list = childrenMap.get(cat.parentId) ?? []
          list.push(cat.id)
          childrenMap.set(cat.parentId, list)
        }
      }

      const collected: string[] = [category.id]
      const queue = [category.id]
      while (queue.length > 0) {
        const currentId = queue.shift()!
        const children = childrenMap.get(currentId) ?? []
        for (const childId of children) {
          collected.push(childId)
          queue.push(childId)
        }
      }
      categoryIds = collected

      if (category.specTemplate?.fields && Array.isArray(category.specTemplate.fields)) {
        templateFields = z.array(specTemplateFieldSchema).catch([]).parse(category.specTemplate.fields)
      }
    }

    let brandIds: string[] | undefined
    if (query.brand) {
      const brandSlugs = query.brand
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      if (brandSlugs.length > 0) {
        const matchingBrands = await this.prisma.brand.findMany({
          where: { slug: { in: brandSlugs }, visible: true },
          select: { id: true },
        })

        if (matchingBrands.length === 0) {
          return {
            items: [],
            total: 0,
            page: query.page,
            pageSize: query.pageSize,
            facets: { brands: [], price: { min: null, max: null } },
          }
        }
        brandIds = matchingBrands.map((b) => b.id)
      }
    }

    // Build parameterized WHERE conditions
    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`p.visible = true`,
      Prisma.sql`p.archived_at IS NULL`,
      Prisma.sql`b.visible = true`,
      Prisma.sql`c.visible = true`,
    ]

    if (categoryIds && categoryIds.length > 0) {
      const catParams = categoryIds.map((id) => Prisma.sql`${id}`)
      whereConditions.push(Prisma.sql`p.category_id IN (${Prisma.join(catParams, ', ')})`)
    }

    // Brand and price conditions are kept apart so each facet ignores its own filter:
    // ticking one brand must still list the other brands to add.
    const brandConditions: Prisma.Sql[] = []
    if (brandIds && brandIds.length > 0) {
      const brandParams = brandIds.map((id) => Prisma.sql`${id}`)
      brandConditions.push(Prisma.sql`p.brand_id IN (${Prisma.join(brandParams, ', ')})`)
    }

    const priceConditions: Prisma.Sql[] = []
    if (query.minPrice !== undefined) {
      priceConditions.push(Prisma.sql`p.price >= ${egpToPiastres(query.minPrice)}`)
    }
    if (query.maxPrice !== undefined) {
      priceConditions.push(Prisma.sql`p.price <= ${egpToPiastres(query.maxPrice)}`)
    }

    if (query.discounted) {
      whereConditions.push(Prisma.sql`p.old_price IS NOT NULL AND p.old_price > p.price`)
    }

    if (query.availability) {
      const states = parseAvailabilityFilter(query.availability)
      const availCondition = buildAvailabilitySqlCondition(states)
      if (availCondition) {
        whereConditions.push(availCondition)
      }
    }

    if (templateFields.length > 0) {
      const parsedSpecFilters = parseSpecFilters(rawQuery, templateFields)
      const specConditions = buildSpecFilterSqlConditions(parsedSpecFilters)
      for (const cond of specConditions) {
        whereConditions.push(cond)
      }
    }

    let normalizedQuery: string | undefined
    if (query.q && query.q.trim().length > 0) {
      normalizedQuery = normalizeArabic(query.q)
      const synonyms = await this.searchService.getSynonyms()
      const terms = normalizedQuery.length > 0 ? buildSearchTerms(query.q, synonyms) : []
      whereConditions.push(searchMatchSql(terms, normalizedQuery))
    }

    const toWhere = (conditions: Prisma.Sql[]): Prisma.Sql =>
      Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    const whereClause = toWhere([...whereConditions, ...brandConditions, ...priceConditions])
    const sort = resolveCatalogSort(query)
    const orderBy = mapSortToOrderBy(sort, normalizedQuery)

    const popularityJoin =
      sort === 'popular' || sort === 'relevance' ? popularityJoinSql() : Prisma.empty

    const offset = (query.page - 1) * query.pageSize

    const mainSql = Prisma.sql`
      SELECT
        p.id,
        COUNT(*) OVER()::int AS total_count
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      ${popularityJoin}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${query.pageSize} OFFSET ${offset}
    `

    const rows = await this.prisma.$queryRaw<IdTotalRow[]>(mainSql)

    let total = 0
    let ids: string[] = []

    if (rows.length > 0) {
      total = rows[0]?.total_count ?? 0
      ids = rows.map((r) => r.id)
    } else if (offset > 0) {
      const countSql = Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM products p
        JOIN brands b ON p.brand_id = b.id
        JOIN categories c ON p.category_id = c.id
        ${whereClause}
      `
      const countRows = await this.prisma.$queryRaw<Array<{ count: number }>>(countSql)
      total = countRows[0]?.count ?? 0
    }

    let items: ProductCard[] = []
    if (ids.length > 0) {
      const productRecords = await this.prisma.product.findMany({
        where: { id: { in: ids } },
        include: {
          brand: { select: { slug: true, name: true } },
          category: { select: { slug: true, name: true } },
          images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
        },
      })
      const map = new Map(productRecords.map((p) => [p.id, p]))
      const flashes = await this.flashPricing.activeFlashFor(this.prisma, ids)
      items = ids
        .map((id) => map.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map((p) => toProductCard(p, flashes.get(p.id) ?? null))
    }

    // Compute live facets (also when total is 0, so the shopper can widen the filters) for the filtered set
    const brandFacetSql = Prisma.sql`
      SELECT b.slug, b.name, COUNT(*)::int AS count
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      ${toWhere([...whereConditions, ...priceConditions])}
      GROUP BY b.slug, b.name
      ORDER BY count DESC, b.name ASC
    `

    const priceFacetSql = Prisma.sql`
      SELECT
        MIN(p.price)::int AS min_price,
        MAX(p.price)::int AS max_price
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      ${toWhere([...whereConditions, ...brandConditions])}
    `

    const [brandFacetRows, priceFacetRows] = await Promise.all([
      this.prisma.$queryRaw<BrandFacetRow[]>(brandFacetSql),
      this.prisma.$queryRaw<PriceFacetRow[]>(priceFacetSql),
    ])

    const priceRow = priceFacetRows[0]
    const minPriceEgp =
      priceRow?.min_price !== null && priceRow?.min_price !== undefined
        ? piastresToEgp(priceRow.min_price)
        : null
    const maxPriceEgp =
      priceRow?.max_price !== null && priceRow?.max_price !== undefined
        ? piastresToEgp(priceRow.max_price)
        : null

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      facets: {
        brands: brandFacetRows.map((b) => ({ slug: b.slug, name: b.name, count: b.count })),
        price: { min: minPriceEgp, max: maxPriceEgp },
      },
    }
  }
}
