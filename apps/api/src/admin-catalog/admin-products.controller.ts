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
  patchProductImageSchema,
  type PatchProductImageOutput,
  PERMISSIONS,
  reorderProductImagesSchema,
  type ReorderProductImagesOutput,
  updateProductSchema,
  type UpdateProductOutput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminProductImagesService } from './admin-product-images.service.js'
import { AdminProductsService } from './admin-products.service.js'
import type { UploadedFile as AppUploadedFile } from './admin-catalog.util.js'

@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly service: AdminProductsService,
    private readonly imagesService: AdminProductImagesService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.products.read)
  async list(
    @Query(new ZodValidationPipe(adminProductQuerySchema)) query: AdminProductQueryOutput,
  ): Promise<AdminProductListResponse> {
    return this.service.list(query)
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
  ): Promise<AdminProductDetail> {
    return this.service.update(id, body)
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
