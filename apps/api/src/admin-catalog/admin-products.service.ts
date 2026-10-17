import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  type AdminProductDetail,
  type AdminProductListItem,
  type AdminProductListResponse,
  type AdminProductQueryOutput,
  type CreateProductOutput,
  deriveAvailability,
  type UpdateProductOutput,
  validateProductSpecs,
} from '@serag/shared'
import { nanoid } from 'nanoid'
import { escapeLikePattern } from '../catalog/product-query.js'
import { SearchIndexService } from '../catalog/search-index.service.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  parseProductSetContents,
  parseProductSpecs,
  parseTemplateFields,
  resolveUploadsDir,
  slugifyModelCode,
} from './admin-catalog.util.js'

interface IdTotalRow {
  id: string
  total_count: number
}

const productDetailInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.ProductInclude

type ProductDetailRecord = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexService: SearchIndexService,
  ) {}

  async list(query: AdminProductQueryOutput): Promise<AdminProductListResponse> {
    const whereConditions: Prisma.Sql[] = []

    if (query.status === 'active') {
      whereConditions.push(Prisma.sql`p.visible = true AND p.archived_at IS NULL`)
    } else if (query.status === 'hidden') {
      whereConditions.push(Prisma.sql`p.visible = false AND p.archived_at IS NULL`)
    } else if (query.status === 'archived') {
      whereConditions.push(Prisma.sql`p.archived_at IS NOT NULL`)
    } else if (query.status === 'all') {
      // No condition on visibility or archived_at
    } else {
      // Default: active + hidden (i.e. not archived)
      whereConditions.push(Prisma.sql`p.archived_at IS NULL`)
    }

    if (query.categoryId) {
      whereConditions.push(Prisma.sql`p.category_id = ${query.categoryId}`)
    }

    if (query.brandId) {
      whereConditions.push(Prisma.sql`p.brand_id = ${query.brandId}`)
    }

    if (query.q && query.q.trim().length > 0) {
      const pattern = `%${escapeLikePattern(query.q.trim())}%`
      whereConditions.push(Prisma.sql`(p.name ILIKE ${pattern} OR p.model_code ILIKE ${pattern})`)
    }

    if (query.stock === 'low') {
      whereConditions.push(Prisma.sql`p.stock > 0 AND p.stock <= p.low_stock_threshold`)
    } else if (query.stock === 'out') {
      whereConditions.push(Prisma.sql`p.stock <= 0`)
    }

    let orderBy: Prisma.Sql
    switch (query.sort) {
      case 'name':
        orderBy = Prisma.sql`p.name ASC`
        break
      case 'price':
        orderBy = Prisma.sql`p.price ASC`
        break
      case 'stock':
        orderBy = Prisma.sql`p.stock ASC`
        break
      case 'updated':
      default:
        orderBy = Prisma.sql`p.updated_at DESC`
        break
    }

    const whereClause =
      whereConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
        : Prisma.empty

    const offset = (query.page - 1) * query.pageSize

    const mainSql = Prisma.sql`
      SELECT
        p.id,
        COUNT(*) OVER()::int AS total_count
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
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

    let items: AdminProductListItem[] = []
    if (ids.length > 0) {
      const records = await this.prisma.product.findMany({
        where: { id: { in: ids } },
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], take: 1 },
        },
      })

      const map = new Map(records.map((r) => [r.id, r]))
      const ordered = ids
        .map((id) => map.get(id))
        .filter((r): r is NonNullable<typeof r> => r !== undefined)

      items = ordered.map((p) => {
        const avail = deriveAvailability({
          mode: p.availabilityMode,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
        })

        return {
          id: p.id,
          slug: p.slug,
          modelCode: p.modelCode,
          name: p.name,
          thumbnail: p.images[0]?.url ?? null,
          brand: p.brand,
          category: p.category,
          price: p.price,
          oldPrice: p.oldPrice,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
          visible: p.visible,
          archived: p.archivedAt !== null,
          archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
          availability: {
            mode: p.availabilityMode,
            state: avail.state,
            orderable: avail.orderable,
            leadTimeText: p.leadTimeText,
          },
          updatedAt: p.updatedAt.toISOString(),
        }
      })
    }

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  async getById(id: string): Promise<AdminProductDetail> {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    })

    if (!p) {
      throw new NotFoundException('المنتج غير موجود')
    }

    const orderItemsCount = await this.prisma.orderItem.count({
      where: { productId: id },
    })

    return this.toAdminProductDetail(p, orderItemsCount > 0)
  }

  async create(data: CreateProductOutput): Promise<AdminProductDetail> {
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
      include: { specTemplate: true },
    })
    if (!category) {
      throw new BadRequestException({ message: 'القسم غير موجود', field: 'categoryId' })
    }

    const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } })
    if (!brand) {
      throw new BadRequestException({ message: 'الماركة غير موجودة', field: 'brandId' })
    }

    const templateFields = parseTemplateFields(category.specTemplate?.fields)
    const specValidation = validateProductSpecs(data.specs ?? {}, templateFields)
    if (!specValidation.valid) {
      throw new BadRequestException({
        message: 'بيانات غير صحيحة',
        errors: specValidation.errors,
      })
    }

    const existingModelCode = await this.prisma.product.findUnique({
      where: { modelCode: data.modelCode },
    })
    if (existingModelCode) {
      throw new ConflictException({
        message: 'كود الموديل مستخدم بالفعل',
        field: 'modelCode',
      })
    }

    let slug = ''
    if (data.slug && data.slug.trim().length > 0) {
      const customSlug = data.slug.trim()
      const existingSlug = await this.prisma.product.findUnique({
        where: { slug: customSlug },
      })
      if (existingSlug) {
        throw new ConflictException({
          message: 'الرابط التعريفي مستخدم بالفعل',
          field: 'slug',
        })
      }
      slug = customSlug
    } else {
      const base = slugifyModelCode(data.modelCode)
      let candidate = base
      while (await this.prisma.product.findUnique({ where: { slug: candidate } })) {
        candidate = `${base}-${nanoid(4).toLowerCase()}`
      }
      slug = candidate
    }

    const created = await this.prisma.product.create({
      data: {
        name: data.name,
        slug,
        modelCode: data.modelCode,
        brandId: data.brandId,
        categoryId: data.categoryId,
        specs: (data.specs ?? {}) as Prisma.InputJsonValue,
        price: data.price,
        oldPrice: data.oldPrice ?? null,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        availabilityMode: data.availabilityMode,
        leadTimeText: data.leadTimeText ?? null,
        warranty: data.warranty ?? null,
        warrantyActivation: data.warrantyActivation ?? null,
        origin: data.origin ?? null,
        setContents:
          data.setContents && data.setContents.length > 0
            ? (data.setContents as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        visible: data.visible,
        featured: data.featured,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        taxRate: data.taxRate,
      },
    })

    await this.searchIndexService.reindexProduct(created.id)

    return this.getById(created.id)
  }

  async update(
    id: string,
    data: UpdateProductOutput,
    adminUserId?: string,
  ): Promise<AdminProductDetail> {
    const existing = await this.prisma.product.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('المنتج غير موجود')
    }

    const categoryId = data.categoryId ?? existing.categoryId
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { specTemplate: true },
    })
    if (!category) {
      throw new BadRequestException({ message: 'القسم غير موجود', field: 'categoryId' })
    }

    if (data.brandId && data.brandId !== existing.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } })
      if (!brand) {
        throw new BadRequestException({ message: 'الماركة غير موجودة', field: 'brandId' })
      }
    }

    if (data.specs !== undefined) {
      const templateFields = parseTemplateFields(category.specTemplate?.fields)
      const specValidation = validateProductSpecs(data.specs, templateFields)
      if (!specValidation.valid) {
        throw new BadRequestException({
          message: 'بيانات غير صحيحة',
          errors: specValidation.errors,
        })
      }
    }

    const effectivePrice = data.price ?? existing.price
    const effectiveOldPrice = data.oldPrice !== undefined ? data.oldPrice : existing.oldPrice
    if (effectiveOldPrice !== null && effectiveOldPrice !== undefined) {
      if (effectiveOldPrice <= effectivePrice) {
        throw new BadRequestException({
          message: 'السعر القديم يجب أن يكون أكبر من السعر الحالي',
          field: 'oldPrice',
        })
      }
    }

    if (data.modelCode && data.modelCode !== existing.modelCode) {
      const modelConflict = await this.prisma.product.findUnique({
        where: { modelCode: data.modelCode },
      })
      if (modelConflict) {
        throw new ConflictException({
          message: 'كود الموديل مستخدم بالفعل',
          field: 'modelCode',
        })
      }
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await this.prisma.product.findUnique({
        where: { slug: data.slug },
      })
      if (slugConflict) {
        throw new ConflictException({
          message: 'الرابط التعريفي مستخدم بالفعل',
          field: 'slug',
        })
      }
    }

    const updateData: Prisma.ProductUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.modelCode !== undefined) updateData.modelCode = data.modelCode
    if (data.brandId !== undefined) updateData.brand = { connect: { id: data.brandId } }
    if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } }
    if (data.specs !== undefined) updateData.specs = data.specs as Prisma.InputJsonValue
    if (data.price !== undefined) updateData.price = data.price
    if (data.oldPrice !== undefined) updateData.oldPrice = data.oldPrice
    if (data.stock !== undefined) updateData.stock = data.stock
    if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold
    if (data.availabilityMode !== undefined) updateData.availabilityMode = data.availabilityMode
    if (data.leadTimeText !== undefined) updateData.leadTimeText = data.leadTimeText
    if (data.warranty !== undefined) updateData.warranty = data.warranty
    if (data.warrantyActivation !== undefined) updateData.warrantyActivation = data.warrantyActivation
    if (data.origin !== undefined) updateData.origin = data.origin
    if (data.setContents !== undefined) {
      updateData.setContents =
        data.setContents && data.setContents.length > 0
          ? (data.setContents as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull
    }
    if (data.visible !== undefined) updateData.visible = data.visible
    if (data.featured !== undefined) updateData.featured = data.featured
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate

    const stockChanged = data.stock !== undefined && data.stock !== existing.stock
    const stockDiff = stockChanged ? data.stock! - existing.stock : 0

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: updateData,
      })

      if (stockChanged) {
        await tx.stockMovement.create({
          data: {
            productId: id,
            qty: stockDiff,
            reason: 'manual',
            userId: adminUserId ?? null,
          },
        })
      }
    })

    await this.searchIndexService.reindexProduct(id)

    return this.getById(id)
  }

  async archive(id: string): Promise<AdminProductDetail> {
    const existing = await this.prisma.product.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('المنتج غير موجود')
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        visible: false,
      },
    })

    await this.searchIndexService.reindexProduct(id)

    return this.getById(id)
  }

  async unarchive(id: string): Promise<AdminProductDetail> {
    const existing = await this.prisma.product.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('المنتج غير موجود')
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        archivedAt: null,
      },
    })

    await this.searchIndexService.reindexProduct(id)

    return this.getById(id)
  }

  async delete(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } })
    if (!product) {
      throw new NotFoundException('المنتج غير موجود')
    }

    const inOrders = await this.prisma.orderItem.count({ where: { productId: id } })
    if (inOrders > 0) {
      throw new ConflictException({
        message: 'لا يمكن حذف المنتج لأنه موجود في طلبات سابقة، يرجى أرشفته بدلاً من ذلك',
        code: 'IN_ORDERS',
      })
    }

    const uploadsDir = resolveUploadsDir()
    const productDir = path.join(uploadsDir, 'products', id)
    await fs.promises.rm(productDir, { recursive: true, force: true }).catch(() => undefined)

    await this.prisma.product.delete({ where: { id } })
  }

  private toAdminProductDetail(p: ProductDetailRecord, inOrders: boolean): AdminProductDetail {
    return {
      id: p.id,
      slug: p.slug,
      modelCode: p.modelCode,
      name: p.name,
      brandId: p.brandId,
      categoryId: p.categoryId,
      specs: parseProductSpecs(p.specs),
      price: p.price,
      oldPrice: p.oldPrice,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      availabilityMode: p.availabilityMode,
      leadTimeText: p.leadTimeText,
      warranty: p.warranty,
      warrantyActivation: p.warrantyActivation,
      origin: p.origin,
      setContents: parseProductSetContents(p.setContents),
      visible: p.visible,
      featured: p.featured,
      archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
      taxRate: p.taxRate,
      etaItemCode: p.etaItemCode,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      images: p.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        isReal: img.isReal,
        sort: img.sort,
        createdAt: img.createdAt.toISOString(),
        updatedAt: img.updatedAt.toISOString(),
      })),
      inOrders,
      brand: p.brand,
      category: p.category,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }
  }
}
