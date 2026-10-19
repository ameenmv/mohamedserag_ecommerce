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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  type AdminBrand,
  createBrandSchema,
  type CreateBrandOutput,
  PERMISSIONS,
  updateBrandSchema,
  type UpdateBrandOutput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminBrandsService } from './admin-brands.service.js'
import type { UploadedFile as AppUploadedFile } from './admin-catalog.util.js'

@Controller('admin/brands')
export class AdminBrandsController {
  constructor(private readonly service: AdminBrandsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.products.read)
  async list(): Promise<AdminBrand[]> {
    return this.service.list()
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.products.read)
  async getById(@Param('id') id: string): Promise<AdminBrand> {
    return this.service.getById(id)
  }

  @Post()
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('brand')
  async create(
    @Body(new ZodValidationPipe(createBrandSchema)) body: CreateBrandOutput,
  ): Promise<AdminBrand> {
    return this.service.create(body)
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('brand')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBrandSchema)) body: UpdateBrandOutput,
  ): Promise<AdminBrand> {
    return this.service.update(id, body)
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('brand')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id)
  }

  @Post(':id/logo')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('brand')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: AppUploadedFile | undefined,
  ): Promise<AdminBrand> {
    return this.service.uploadLogo(id, file)
  }
}
