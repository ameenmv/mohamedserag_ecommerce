import { Injectable, NotFoundException } from '@nestjs/common'
import {
  specTemplateFieldSchema,
  type BrandDetail,
  type BrandSummary,
  type CategoryDetail,
  type CategoryTreeNode,
  type SpecTemplateField,
} from '@serag/shared'
import { z } from 'zod'
import { PrismaService } from '../prisma/prisma.service.js'

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
        seoTitle: true,
        seoDescription: true,
        sort: true,
      },
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

      nonZeroChildren.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'ar'))

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        intro: cat.intro,
        seoTitle: cat.seoTitle,
        seoDescription: cat.seoDescription,
        sort: cat.sort,
        productCount: totalCount,
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

    tree.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'ar'))
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
          select: { slug: true, name: true, visible: true },
        },
        children: {
          where: { visible: true },
          orderBy: [{ sort: 'asc' }, { name: 'asc' }],
          select: { id: true, slug: true, name: true, sort: true },
        },
        specTemplate: true,
      },
    })

    if (!category) {
      throw new NotFoundException('القسم غير موجود')
    }

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
        name: ch.name,
        productCount: computeRecursiveCount(ch.id),
      }))
      .filter((ch) => ch.productCount > 0)

    let fields: SpecTemplateField[] = []
    if (category.specTemplate?.fields && Array.isArray(category.specTemplate.fields)) {
      fields = z.array(specTemplateFieldSchema).parse(category.specTemplate.fields)
    }

    const parent =
      category.parent && category.parent.visible
        ? { slug: category.parent.slug, name: category.parent.name }
        : null

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      intro: category.intro,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
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
        _count: {
          select: {
            products: {
              where: { visible: true, archivedAt: null },
            },
          },
        },
      },
    })

    return brands.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
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

    return {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      logoUrl: brand.logoUrl,
      intro: brand.intro,
      seoTitle: brand.seoTitle,
      seoDescription: brand.seoDescription,
      productCount: brand._count.products,
    }
  }
}
