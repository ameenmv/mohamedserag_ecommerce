import { Controller, Get, Param, Query } from '@nestjs/common'
import type { GuideCard, PublicGuide } from '@serag/shared'
import { z } from 'zod'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { GuidesService } from './guides.service.js'

const guidesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'رقم الصفحة يبدأ من 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'الحد الأدنى لحجم الصفحة 1')
    .max(24, 'الحد الأقصى لحجم الصفحة 24')
    .default(12),
})

type GuidesListQuery = z.output<typeof guidesListQuerySchema>

@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  /** GET /api/guides — published buying guides, newest first. */
  @Get()
  @Public()
  async list(
    @Query(new ZodValidationPipe(guidesListQuerySchema)) query: GuidesListQuery,
  ): Promise<{ items: GuideCard[]; total: number; page: number; pageSize: number }> {
    return this.guidesService.listPublished(query.page, query.pageSize)
  }

  /** GET /api/guides/:slug — a single published guide or 404. */
  @Get(':slug')
  @Public()
  async getOne(@Param('slug') slug: string): Promise<PublicGuide> {
    return this.guidesService.getPublishedBySlug(slug)
  }
}
