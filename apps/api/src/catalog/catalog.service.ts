import { Injectable, NotFoundException } from '@nestjs/common'
import {
  localizedSpecFields,
  localizedText,
  resolveCategoryAccent,
  resolveCategoryIllustration,
  specTemplateFieldSchema,
  type BrandDetail,
  type BrandSummary,
  type CategoryDetail,
  type CategoryTreeNode,
  type SpecTemplateField,
} from '@serag/shared'
import { z } from 'zod'
import { PrismaService } from '../prisma/prisma.service.js'
import { currentLocale } from '../common/content-locale.middleware.js'

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns visible categories as a hierarchical tree (parent → children, ordered by sort then name).
   * Categories whose count of visible non-archived products (including descendants) is 0 are omitted (US-1.1).
   */
  async getCategoriesTree(): Promise<CategoryTreeNode[]> {
    const allCategories = await this.prisma.category.findMany({
      where: { visible: true },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        intro: true,
        accent: true,
        illustration: true,
        seoTitle: true,
        seoDescription: true,
        sort: true,
        translations: true,
      },
    })
    const locale = currentLocale()

    const productCounts = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { visible: true, archivedAt: null },
      _count: { _all: true },
    })

    const directCounts = new Map<string, number>()
    for (const p of productCounts) {
      directCounts.set(p.categoryId, p._count._all)
    }

    const products = await this.prisma.product.findMany({
      where: { visible: true, archivedAt: null },
      select: {
        categoryId: true,
        price: true,
        featured: true,
        images: {
          orderBy: { sort: 'asc' },
          take: 1,
          select: { url: true },
        },
      },
    })

    const directMinPrices = new Map<string, number>()
    const directProductCandidates = new Map<string, Array<{ featured: boolean; price: number; url: string }>>()

    for (const p of products) {
      const currentMin = directMinPrices.get(p.categoryId)
      if (currentMin === undefined || p.price < currentMin) {
        directMinPrices.set(p.categoryId, p.price)
      }

      const firstImage = p.images[0]
      if (firstImage?.url) {
        let list = directProductCandidates.get(p.categoryId)
        if (!list) {
          list = []
          directProductCandidates.set(p.categoryId, list)
        }
        list.push({
          featured: p.featured,
          price: p.price,
          url: firstImage.url,
        })
      }
    }

    const directCoverImages = new Map<string, string[]>()
    for (const [catId, candidates] of directProductCandidates.entries()) {
      candidates.sort((a, b) => {
        if (a.featured !== b.featured) {
          return a.featured ? -1 : 1
        }
        return b.price - a.price
      })

      const urls: string[] = []
      for (const c of candidates) {
        if (!urls.includes(c.url)) {
          urls.push(c.url)
          if (urls.length === 3) break
        }
      }
      directCoverImages.set(catId, urls)
    }

    const childrenByParentId = new Map<string, typeof allCategories>()
    for (const cat of allCategories) {
      const parentKey = cat.parentId ?? '__ROOT__'
      const list = childrenByParentId.get(parentKey) ?? []
      list.push(cat)
      childrenByParentId.set(parentKey, list)
    }

    const buildNode = (cat: (typeof allCategories)[number]): CategoryTreeNode | null => {
      const rawChildren = childrenByParentId.get(cat.id) ?? []
      const nonZeroChildren: CategoryTreeNode[] = []
      let descendantsCount = 0

      for (const child of rawChildren) {
        const childNode = buildNode(child)
        if (childNode !== null) {
          nonZeroChildren.push(childNode)
          descendantsCount += childNode.productCount
        }
      }

      const directCount = directCounts.get(cat.id) ?? 0
      const totalCount = directCount + descendantsCount

      if (totalCount === 0) {
        return null
      }

      nonZeroChildren.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, locale))

      const directMin = directMinPrices.get(cat.id)
      const candidatePrices: number[] = []
      if (directMin !== undefined) {
        candidatePrices.push(directMin)
      }
      for (const child of nonZeroChildren) {
        if (child.startingPrice !== null) {
          candidatePrices.push(child.startingPrice)
        }
      }
      const startingPrice = candidatePrices.length > 0 ? Math.min(...candidatePrices) : null

      const ownUrls = directCoverImages.get(cat.id) ?? []
      const mergedCoverImages: string[] = [...ownUrls]

      if (mergedCoverImages.length < 3) {
        for (const child of nonZeroChildren) {
          for (const url of child.coverImages) {
            if (!mergedCoverImages.includes(url)) {
              mergedCoverImages.push(url)
              if (mergedCoverImages.length === 3) {
                break
              }
            }
          }
          if (mergedCoverImages.length === 3) {
            break
          }
        }
      }

      const coverImage = mergedCoverImages[0] ?? null

      return {
        id: cat.id,
        name: localizedText(cat.name, cat.translations, 'name', locale),
        slug: cat.slug,
        intro: localizedText(cat.intro, cat.translations, 'intro', locale),
        accent: resolveCategoryAccent((cat as { accent?: string | null }).accent),
        illustration: resolveCategoryIllustration(cat.slug, (cat as { illustration?: string | null }).illustration),
        seoTitle: localizedText(cat.seoTitle, cat.translations, 'seoTitle', locale),
        seoDescription: localizedText(cat.seoDescription, cat.translations, 'seoDescription', locale),
        sort: cat.sort,
        productCount: totalCount,
        coverImage,
        coverImages: mergedCoverImages,
        startingPrice,
        children: nonZeroChildren,
      }
    }

    const rootCategories = childrenByParentId.get('__ROOT__') ?? []
    const tree: CategoryTreeNode[] = []
    for (const rootCat of rootCategories) {
      const node = buildNode(rootCat)
      if (node !== null) {
        tree.push(node)
      }
    }

    tree.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, locale))
    return tree
  }

  /**
   * Returns a single visible category by slug with breadcrumbs, visible non-empty children,
   * and validated spec template fields.
   */
  async getCategoryBySlug(slug: string): Promise<CategoryDetail> {
    const category = await this.prisma.category.findFirst({
      where: { slug, visible: true },
      include: {
        parent: {
          select: { slug: true, name: true, visible: true, translations: true },
        },
        children: {
          where: { visible: true },
          orderBy: [{ sort: 'asc' }, { name: 'asc' }],
          select: { id: true, slug: true, name: true, sort: true, translations: true },
        },
        specTemplate: true,
      },
    })

    if (!category) {
      throw new NotFoundException('القسم غير موجود')
    }
    const locale = currentLocale()

    // Compute product counts for each child category including descendants
    const allDescendantCategories = await this.prisma.category.findMany({
      where: { visible: true },
      select: { id: true, parentId: true },
    })

    const productCounts = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { visible: true, archivedAt: null },
      _count: { _all: true },
    })

    const directCounts = new Map<string, number>()
    for (const p of productCounts) {
      directCounts.set(p.categoryId, p._count._all)
    }

    const childrenMap = new Map<string, string[]>()
    for (const c of allDescendantCategories) {
      if (c.parentId) {
        const list = childrenMap.get(c.parentId) ?? []
        list.push(c.id)
        childrenMap.set(c.parentId, list)
      }
    }

    const computeRecursiveCount = (catId: string): number => {
      let count = directCounts.get(catId) ?? 0
      const childrenIds = childrenMap.get(catId) ?? []
      for (const childId of childrenIds) {
        count += computeRecursiveCount(childId)
      }
      return count
    }

    const childrenWithCounts = category.children
      .map((ch) => ({
        id: ch.id,
        slug: ch.slug,
        name: localizedText(ch.name, ch.translations, 'name', locale),
        productCount: computeRecursiveCount(ch.id),
      }))
      .filter((ch) => ch.productCount > 0)

    let fields: SpecTemplateField[] = []
    if (category.specTemplate?.fields && Array.isArray(category.specTemplate.fields)) {
      fields = localizedSpecFields(z.array(specTemplateFieldSchema).parse(category.specTemplate.fields), locale)
    }

    const parent =
      category.parent && category.parent.visible
        ? {
            slug: category.parent.slug,
            name: localizedText(category.parent.name, category.parent.translations, 'name', locale),
          }
        : null

    return {
      id: category.id,
      name: localizedText(category.name, category.translations, 'name', locale),
      slug: category.slug,
      intro: localizedText(category.intro, category.translations, 'intro', locale),
      accent: resolveCategoryAccent((category as { accent?: string | null }).accent),
      illustration: resolveCategoryIllustration(category.slug, (category as { illustration?: string | null }).illustration),
      seoTitle: localizedText(category.seoTitle, category.translations, 'seoTitle', locale),
      seoDescription: localizedText(category.seoDescription, category.translations, 'seoDescription', locale),
      parent,
      children: childrenWithCounts,
      fields,
    }
  }

  /**
   * Returns visible brands that have visible, non-archived products (productCount > 0),
   * ordered by sort then name.
   */
  async getBrands(): Promise<BrandSummary[]> {
    const brands = await this.prisma.brand.findMany({
      where: {
        visible: true,
        products: {
          some: { visible: true, archivedAt: null },
        },
      },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        translations: true,
        _count: {
          select: {
            products: {
              where: { visible: true, archivedAt: null },
            },
          },
        },
      },
    })

    const locale = currentLocale()
    return brands.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: localizedText(b.name, b.translations, 'name', locale),
      logoUrl: b.logoUrl,
      productCount: b._count.products,
    }))
  }

  /**
   * Returns one visible brand (+ intro/SEO) and its product count. 404 if missing or hidden.
   */
  async getBrandBySlug(slug: string): Promise<BrandDetail> {
    const brand = await this.prisma.brand.findFirst({
      where: { slug, visible: true },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        intro: true,
        seoTitle: true,
        seoDescription: true,
        translations: true,
        _count: {
          select: {
            products: {
              where: { visible: true, archivedAt: null },
            },
          },
        },
      },
    })

    if (!brand) {
      throw new NotFoundException('الماركة غير موجودة')
    }

    const locale = currentLocale()
    return {
      id: brand.id,
      slug: brand.slug,
      name: localizedText(brand.name, brand.translations, 'name', locale),
      logoUrl: brand.logoUrl,
      intro: localizedText(brand.intro, brand.translations, 'intro', locale),
      seoTitle: localizedText(brand.seoTitle, brand.translations, 'seoTitle', locale),
      seoDescription: localizedText(brand.seoDescription, brand.translations, 'seoDescription', locale),
      productCount: brand._count.products,
    }
  }
}
