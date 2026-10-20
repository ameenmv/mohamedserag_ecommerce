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
  Query,
} from '@nestjs/common'
import {
  guideInputSchema,
  guidePatchSchema,
  PERMISSIONS,
  type AdminGuide,
  type AdminGuideRow,
  type GuideInputOutput,
  type GuidePatchOutput,
} from '@serag/shared'
import { z } from 'zod'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminGuidesService } from './admin-guides.service.js'

const adminGuidesListQuerySchema = z.object({
  q: z.string().trim().max(80, 'نص البحث بيزيد عن 80 حرف').optional(),
  status: z.enum(['all', 'published', 'draft']).default('all'),
  page: z.coerce.number().int().min(1, 'رقم الصفحة يبدأ من 1').default(1),
})

type AdminGuidesListQuery = z.output<typeof adminGuidesListQuerySchema>

const ADMIN_GUIDES_PAGE_SIZE = 20

@Controller('admin/guides')
@RequirePermission(PERMISSIONS.content.manage)
export class AdminGuidesController {
  constructor(private readonly adminGuidesService: AdminGuidesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.content.manage)
  async list(
    @Query(new ZodValidationPipe(adminGuidesListQuerySchema)) query: AdminGuidesListQuery,
  ): Promise<{ items: AdminGuideRow[]; total: number; page: number; pageSize: number }> {
    return this.adminGuidesService.list(query, ADMIN_GUIDES_PAGE_SIZE)
  }

  @Post()
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async create(
    @Body(new ZodValidationPipe(guideInputSchema)) body: GuideInputOutput,
  ): Promise<AdminGuide> {
    return this.adminGuidesService.create(body)
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.content.manage)
  async getOne(@Param('id') id: string): Promise<AdminGuide> {
    return this.adminGuidesService.getById(id)
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(guidePatchSchema)) body: GuidePatchOutput,
  ): Promise<AdminGuide> {
    return this.adminGuidesService.update(id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async remove(@Param('id') id: string): Promise<void> {
    return this.adminGuidesService.remove(id)
  }
}
