import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  AdminBrand,
  CreateBrandOutput,
  UpdateBrandOutput,
} from '@serag/shared'
import { nanoid } from 'nanoid'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  detectImageMime,
  MAX_IMAGE_SIZE_BYTES,
  resolveUploadsDir,
  type UploadedFile,
} from './admin-catalog.util.js'

const brandInclude = {
  _count: { select: { products: true } },
} satisfies Prisma.BrandInclude

type BrandWithCount = Prisma.BrandGetPayload<{ include: typeof brandInclude }>

@Injectable()
export class AdminBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminBrand[]> {
    const brands = await this.prisma.brand.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      include: brandInclude,
    })

    return brands.map((b) => this.toAdminBrand(b))
  }

  async getById(id: string): Promise<AdminBrand> {
    const b = await this.prisma.brand.findUnique({
      where: { id },
      include: brandInclude,
    })

    if (!b) {
      throw new NotFoundException('الماركة غير موجودة')
    }

    return this.toAdminBrand(b)
  }

  async create(data: CreateBrandOutput): Promise<AdminBrand> {
    const existingSlug = await this.prisma.brand.findUnique({
      where: { slug: data.slug },
    })
    if (existingSlug) {
      throw new ConflictException({
        message: 'الرابط التعريفي مستخدم بالفعل',
        field: 'slug',
      })
    }

    const created = await this.prisma.brand.create({
      data: {
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl ?? null,
        intro: data.intro ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        sort: data.sort,
        visible: data.visible,
      },
      include: brandInclude,
    })

    return this.toAdminBrand(created)
  }

  async update(id: string, data: UpdateBrandOutput): Promise<AdminBrand> {
    const existing = await this.prisma.brand.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('الماركة غير موجودة')
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await this.prisma.brand.findUnique({
        where: { slug: data.slug },
      })
      if (slugConflict) {
        throw new ConflictException({
          message: 'الرابط التعريفي مستخدم بالفعل',
          field: 'slug',
        })
      }
    }

    const updateData: Prisma.BrandUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl
    if (data.intro !== undefined) updateData.intro = data.intro
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription
    if (data.sort !== undefined) updateData.sort = data.sort
    if (data.visible !== undefined) updateData.visible = data.visible

    const updated = await this.prisma.brand.update({
      where: { id },
      data: updateData,
      include: brandInclude,
    })

    return this.toAdminBrand(updated)
  }

  async delete(id: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    })

    if (!brand) {
      throw new NotFoundException('الماركة غير موجودة')
    }

    if (brand._count.products > 0) {
      throw new ConflictException({
        message: 'لا يمكن حذف الماركة لأنها مرتبطة بمنتجات',
        code: 'HAS_PRODUCTS',
      })
    }

    await this.prisma.brand.delete({ where: { id } })
  }

  async uploadLogo(id: string, file: UploadedFile | undefined): Promise<AdminBrand> {
    const brand = await this.prisma.brand.findUnique({ where: { id } })
    if (!brand) {
      throw new NotFoundException('الماركة غير موجودة')
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('ملف الشعار مطلوب')
    }

    if (file.buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('حجم الشعار يجب ألا يتجاوز 5 ميجابايت')
    }

    const detected = detectImageMime(file.buffer)
    if (!detected) {
      throw new BadRequestException(
        'نوع الملف غير مدعوم، يرجى رفع صورة بصيغة JPEG أو PNG أو WebP أو AVIF',
      )
    }

    const uploadsDir = resolveUploadsDir()
    const brandsDir = path.join(uploadsDir, 'brands')
    await fs.promises.mkdir(brandsDir, { recursive: true })

    const fileName = `${nanoid()}.${detected.ext}`
    const destPath = path.join(brandsDir, fileName)
    await fs.promises.writeFile(destPath, file.buffer)

    const logoUrl = `/uploads/brands/${fileName}`

    const updated = await this.prisma.brand.update({
      where: { id },
      data: { logoUrl },
      include: brandInclude,
    })

    return this.toAdminBrand(updated)
  }

  private toAdminBrand(b: BrandWithCount): AdminBrand {
    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      intro: b.intro,
      seoTitle: b.seoTitle,
      seoDescription: b.seoDescription,
      sort: b.sort,
      visible: b.visible,
      productCount: b._count.products,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }
  }
}
