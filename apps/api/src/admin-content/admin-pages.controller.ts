import { Body, Controller, Get, Param, Patch } from '@nestjs/common'
import {
  pageInputSchema,
  PERMISSIONS,
  type AdminPage,
  type AdminPageRow,
  type PageInputOutput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminPagesService } from './admin-pages.service.js'

@Controller('admin/pages')
@RequirePermission(PERMISSIONS.content.manage)
export class AdminPagesController {
  constructor(private readonly adminPagesService: AdminPagesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.content.manage)
  async list(): Promise<{ items: AdminPageRow[] }> {
    return this.adminPagesService.list()
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.content.manage)
  async getOne(@Param('id') id: string): Promise<AdminPage> {
    return this.adminPagesService.getById(id)
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(pageInputSchema)) body: PageInputOutput,
  ): Promise<AdminPage> {
    return this.adminPagesService.update(id, body)
  }
}
