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
} from '@nestjs/common'
import {
  type AdminSpecTemplate,
  createSpecTemplateSchema,
  type CreateSpecTemplateOutput,
  PERMISSIONS,
  updateSpecTemplateSchema,
  type UpdateSpecTemplateOutput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminSpecTemplatesService } from './admin-spec-templates.service.js'

@Controller('admin/spec-templates')
export class AdminSpecTemplatesController {
  constructor(private readonly service: AdminSpecTemplatesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.products.read)
  async list(): Promise<AdminSpecTemplate[]> {
    return this.service.list()
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.products.read)
  async getById(@Param('id') id: string): Promise<AdminSpecTemplate> {
    return this.service.getById(id)
  }

  @Post()
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('spec_template')
  async create(
    @Body(new ZodValidationPipe(createSpecTemplateSchema)) body: CreateSpecTemplateOutput,
  ): Promise<AdminSpecTemplate> {
    return this.service.create(body)
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('spec_template')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSpecTemplateSchema)) body: UpdateSpecTemplateOutput,
  ): Promise<AdminSpecTemplate> {
    return this.service.update(id, body)
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.products.write)
  @Audit('spec_template')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id)
  }
}
