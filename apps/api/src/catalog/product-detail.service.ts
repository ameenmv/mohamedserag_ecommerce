import { Injectable, NotFoundException } from '@nestjs/common'
import {
  specTemplateFieldSchema,
  type ProductCard,
  type ProductDetail,
  type ProductDetailImage,
  type ProductDetailMergedSpec,
  type SpecFieldType,
  type SpecTemplateField,
} from '@serag/shared'
import { z } from 'zod'
import { PrismaService } from '../prisma/prisma.service.js'
import { popularityJoinSql, toProductCard } from './product-query.js'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSpecValue(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
}

function inferSpecType(v: string | number | boolean): SpecFieldType {
  if (typeof v === 'number') return 'number'
  if (typeof v === 'boolean') return 'boolean'
  return 'text'
}

@Injectable()
export class ProductDetailService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns complete product detail with images, merged specs in template order,
   * brand, category breadcrumb, and up to 8 related products by popularity.
   */
  async getProductBySlug(slug: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        visible: true,
        archivedAt: null,
        brand: { visible: true },
        category: { visible: true },
      },
      include: {
        brand: { select: { slug: true, name: true, logoUrl: true } },
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            parent: { select: { slug: true, name: true, visible: true } },
            specTemplate: true,
          },
        },
        images: {
          orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!product) {
      throw new NotFoundException('المنتج غير موجود')
    }

    const card = toProductCard(product)

    // Merge specs in template order
    let templateFields: SpecTemplateField[] = []
    if (product.category.specTemplate?.fields && Array.isArray(product.category.specTemplate.fields)) {
      templateFields = z.array(specTemplateFieldSchema).catch([]).parse(product.category.specTemplate.fields)
    }

    const rawSpecs = isPlainObject(product.specs) ? product.specs : {}
    const mergedSpecs: ProductDetailMergedSpec[] = []
    const seenSpecKeys = new Set<string>()

    for (const field of templateFields) {
      const val = rawSpecs[field.key]
      if (isSpecValue(val) && val !== '') {
        seenSpecKeys.add(field.key)
        mergedSpecs.push({
          key: field.key,
          label: field.label,
          value: val,
          unit: field.unit ?? null,
          type: field.type,
        })
      }
    }

    for (const [key, val] of Object.entries(rawSpecs)) {
      if (!seenSpecKeys.has(key) && isSpecValue(val) && val !== '') {
        mergedSpecs.push({
          key,
          label: key,
          value: val,
          unit: null,
          type: inferSpecType(val),
        })
      }
    }

    // Related products: up to 8 visible products from same category, excluding itself, by popularity
    const relatedRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      ${popularityJoinSql()}
      WHERE p.category_id = ${product.category.id}
        AND p.id != ${product.id}
        AND p.visible = true
        AND p.archived_at IS NULL
        AND b.visible = true
        AND c.visible = true
      ORDER BY COALESCE(pop.units_sold, 0) DESC, p.created_at DESC
      LIMIT 8
    `

    const relatedIds = relatedRows.map((r) => r.id)
    let related: ProductCard[] = []

    if (relatedIds.length > 0) {
      const relatedProducts = await this.prisma.product.findMany({
        where: { id: { in: relatedIds } },
        include: {
          brand: { select: { slug: true, name: true } },
          category: { select: { slug: true, name: true } },
          images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
        },
      })
      const relMap = new Map(relatedProducts.map((p) => [p.id, p]))
      related = relatedIds
        .map((id) => relMap.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map(toProductCard)
    }

    const detailImages: ProductDetailImage[] = product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      isReal: img.isReal,
      sort: img.sort,
    }))

    const parentBreadcrumb =
      product.category.parent && product.category.parent.visible
        ? { slug: product.category.parent.slug, name: product.category.parent.name }
        : null

    const setContents = Array.isArray(product.setContents) ? (product.setContents as unknown[]) : null

    return {
      id: card.id,
      slug: card.slug,
      name: card.name,
      modelCode: card.modelCode,
      price: card.price,
      oldPrice: card.oldPrice,
      discountPercent: card.discountPercent,
      image: card.image,
      availability: card.availability,
      images: detailImages,
      specs: mergedSpecs,
      setContents,
      warranty: product.warranty,
      warrantyActivation: product.warrantyActivation,
      origin: product.origin,
      leadTimeText: product.leadTimeText,
      taxRate: product.taxRate,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      category: {
        slug: product.category.slug,
        name: product.category.name,
        parent: parentBreadcrumb,
      },
      brand: {
        slug: product.brand.slug,
        name: product.brand.name,
        logoUrl: product.brand.logoUrl,
      },
      related,
    }
  }
}
