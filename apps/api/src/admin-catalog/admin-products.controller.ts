import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  type AdminProductDetail,
  type AdminProductImage,
  type AdminProductListResponse,
  adminProductQuerySchema,
  type AdminProductQueryOutput,
  createProductSchema,
  type CreateProductOutput,
  type ImportPlan,
  patchProductImageSchema,
  type PatchProductImageOutput,
  PERMISSIONS,
  productImportInputSchema,
  type ProductImportInput,
  reorderProductImagesSchema,
  type ReorderProductImagesOutput,
  updateProductSchema,
  type UpdateProductOutput,
} from '@serag/shared'
import type { Response } from 'express'
import { type AdminContext, Audit, CurrentAdmin, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminProductImagesService } from './admin-product-images.service.js'
import { AdminProductImportService, type ImportApplyResult } from './admin-product-import.service.js'
import { AdminProductsService } from './admin-products.service.js'
import type { UploadedFile as AppUploadedFile } from './admin-catalog.util.js'

@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly service: AdminProductsService,
    private readonly importService: AdminProductImportService,
    private readonly imagesService: AdminProductImagesService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.products.read)
  async list(
    @Query(new ZodValidationPipe(adminProductQuerySchema)) query: AdminProductQueryOutput,
  ): Promise<AdminProductListResponse> {
    return this.service.list(query)
  }

  @Get('import/export')
  @RequirePermission(PERMISSIONS.products.import)
  async exportCsv(@Res({ passthrough: true }) res: Response): Promise<string> {
    const { csv, filename } = await this.importService.exportProductsCsv()
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return csv
  }

  @Post('import/preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.products.import)
  async preview(
    @Body(new ZodValidationPipe(productImportInputSchema)) body: ProductImportInput,
  ): Promise<ImportPlan> {
    return this.importService.preview(body.csv)
  }

  @Post('import/apply')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.products.import)
  @Audit('product-import')
  async apply(
    @Body(new ZodValidationPipe(productImportInputSchema)) body: ProductImportInput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<ImportApplyResult> {
    return this.importService.apply(body.csv, admin?.userId)
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.products.read)
  async getById(@Param('id') id: string): Promise<AdminProductDetail> {
    return this.service.getById(id)
  }

  @Post()
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  async create(
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductOutput,
  ): Promise<AdminProductDetail> {
    return this.service.create(body)
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductOutput,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<AdminProductDetail> {
    return this.service.update(id, body, admin?.userId)
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  async archive(@Param('id') id: string): Promise<AdminProductDetail> {
    return this.service.archive(id)
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  async unarchive(@Param('id') id: string): Promise<AdminProductDetail> {
    return this.service.unarchive(id)
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id)
  }

  @Post(':id/images')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: AppUploadedFile | undefined,
  ): Promise<AdminProductImage> {
    return this.imagesService.uploadImage(id, file)
  }

  @Put(':id/images/order')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  @HttpCode(HttpStatus.OK)
  async reorderImages(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reorderProductImagesSchema)) body: ReorderProductImagesOutput,
  ): Promise<{ success: boolean }> {
    await this.imagesService.reorderImages(id, body.ids)
    return { success: true }
  }

  @Patch(':id/images/:imageId')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  async patchImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body(new ZodValidationPipe(patchProductImageSchema)) body: PatchProductImageOutput,
  ): Promise<AdminProductImage> {
    return this.imagesService.patchImage(id, imageId, body)
  }

  @Delete(':id/images/:imageId')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('product')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<void> {
    await this.imagesService.deleteImage(id, imageId)
  }
}
