import { Controller, Get, Query } from '@nestjs/common'
import { type DashboardRange, type DashboardSummary, type Permission } from '@serag/shared'
import { z } from 'zod'
import { AnyAdmin, CurrentAdmin, type AdminContext } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminDashboardService } from './admin-dashboard.service.js'

const dashboardRangeSchema = z
  .object({
    range: z.preprocess(
      (value) => (value === undefined || value === '' ? 30 : Number(value)),
      z.union([z.literal(7), z.literal(30), z.literal(90)], {
        message: 'المدة المسموح بها 7 أو 30 أو 90 يوم',
      }),
    ),
  })
  .transform((value) => value.range)

@Controller('admin/dashboard')
@AnyAdmin()
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('summary')
  async getSummary(
    @Query(new ZodValidationPipe(dashboardRangeSchema)) range: DashboardRange,
    @CurrentAdmin() admin?: AdminContext,
  ): Promise<DashboardSummary> {
    return this.adminDashboardService.summary(range, admin?.permissions ?? new Set<Permission>())
  }
}
