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
} from '@nestjs/common'
import {
  type AdminCategory,
  createCategorySchema,
  type CreateCategoryOutput,
  PERMISSIONS,
  reorderCategoriesSchema,
  type ReorderCategoriesInput,
  updateCategorySchema,
  type UpdateCategoryOutput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminCategoriesService } from './admin-categories.service.js'

@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly service: AdminCategoriesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.products.read)
  async list(): Promise<AdminCategory[]> {
    return this.service.list()
  }

  @Put('order')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('category')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @Body(new ZodValidationPipe(reorderCategoriesSchema)) body: ReorderCategoriesInput,
  ): Promise<{ success: boolean }> {
    await this.service.reorder(body)
    return { success: true }
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.products.read)
  async getById(@Param('id') id: string): Promise<AdminCategory> {
    return this.service.getById(id)
  }

  @Post()
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('category')
  async create(
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryOutput,
  ): Promise<AdminCategory> {
    return this.service.create(body)
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('category')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryOutput,
  ): Promise<AdminCategory> {
    return this.service.update(id, body)
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('category')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id)
  }
}
