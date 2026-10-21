import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  AdminProductImage,
  PatchProductImageOutput,
} from '@serag/shared'
import { nanoid } from 'nanoid'
import { SearchIndexService } from '../catalog/search-index.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  detectImageMime,
  MAX_IMAGE_SIZE_BYTES,
  resolveUploadsDir,
  type UploadedFile,
} from './admin-catalog.util.js'

@Injectable()
export class AdminProductImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexService: SearchIndexService,
  ) {}

  async uploadImage(productId: string, file: UploadedFile | undefined): Promise<AdminProductImage> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      throw new NotFoundException('المنتج غير موجود')
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('ملف الصورة مطلوب')
    }

    if (file.buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('حجم الصورة يجب ألا يتجاوز 5 ميجابايت')
    }

    const detected = detectImageMime(file.buffer)
    if (!detected) {
      throw new BadRequestException(
        'نوع الملف غير مدعوم، يرجى رفع صورة بصيغة JPEG أو PNG أو WebP أو AVIF',
      )
    }

    const uploadsDir = resolveUploadsDir()
    const productDir = path.join(uploadsDir, 'products', productId)
    await fs.promises.mkdir(productDir, { recursive: true })

    const fileName = `${nanoid()}.${detected.ext}`
    const destPath = path.join(productDir, fileName)
    await fs.promises.writeFile(destPath, file.buffer)

    const url = `/uploads/products/${productId}/${fileName}`

    const maxSortRow = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    })
    const sort = (maxSortRow?.sort ?? -1) + 1

    const created = await this.prisma.productImage.create({
      data: {
        productId,
        url,
        alt: '',
        isReal: false,
        sort,
      },
    })

    await this.searchIndexService.reindexProduct(productId)

    return {
      id: created.id,
      url: created.url,
      alt: created.alt,
      isReal: created.isReal,
      sort: created.sort,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    }
  }

  async patchImage(
    productId: string,
    imageId: string,
    data: PatchProductImageOutput,
  ): Promise<AdminProductImage> {
    const img = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    })
    if (!img) {
      throw new NotFoundException('الصورة غير موجودة')
    }

    const updated = await this.prisma.productImage.update({
      where: { id: imageId },
      data: {
        alt: data.alt !== undefined ? data.alt : img.alt,
        isReal: data.isReal !== undefined ? data.isReal : img.isReal,
      },
    })

    return {
      id: updated.id,
      url: updated.url,
      alt: updated.alt,
      isReal: updated.isReal,
      sort: updated.sort,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }
  }

  async reorderImages(productId: string, ids: string[]): Promise<void> {
    const existing = await this.prisma.productImage.findMany({
      where: { productId },
      select: { id: true },
    })

    const existingIds = new Set(existing.map((e) => e.id))
    if (
      ids.length !== existing.length ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => existingIds.has(id))
    ) {
      throw new BadRequestException('قائمة المعرفات يجب أن تطابق تماماً صور المنتج')
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.productImage.update({
          where: { id },
          data: { sort: index },
        }),
      ),
    )

    await this.searchIndexService.reindexProduct(productId)
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const img = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    })
    if (!img) {
      throw new NotFoundException('الصورة غير موجودة')
    }

    await this.prisma.productImage.delete({ where: { id: imageId } })

    const uploadsDir = resolveUploadsDir()
    const filePath = path.join(uploadsDir, img.url.replace(/^\/?uploads\//, ''))
    await fs.promises.unlink(filePath).catch(() => undefined)

    await this.searchIndexService.reindexProduct(productId)
  }
}
