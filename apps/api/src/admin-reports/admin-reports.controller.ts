import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Res,
} from '@nestjs/common'
import {
  PERMISSIONS,
  reportQuerySchema,
  REPORT_KINDS,
  resolveReportRange,
  type ReportKind,
  type ReportQueryOutput,
} from '@serag/shared'
import type { Response } from 'express'
import { z } from 'zod'
import { RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminReportsService } from './admin-reports.service.js'

const reportQueryPipe = new ZodValidationPipe(reportQuerySchema)

const reportKindPipe = new ZodValidationPipe(
  z.enum(REPORT_KINDS, { message: 'التقرير مش موجود' }),
)

@Controller('admin/reports')
@RequirePermission(PERMISSIONS.reports.read)
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get('revenue')
  revenue(@Query(reportQueryPipe) query: ReportQueryOutput) {
    return this.reports.revenue(resolveReportRange(query, new Date()), query.groupBy)
  }

  @Get('splits')
  splits(@Query(reportQueryPipe) query: ReportQueryOutput) {
    return this.reports.splits(resolveReportRange(query, new Date()))
  }

  @Get('best-sellers')
  bestSellers(@Query(reportQueryPipe) query: ReportQueryOutput) {
    return this.reports.bestSellers(resolveReportRange(query, new Date()))
  }

  @Get('coupons')
  coupons(@Query(reportQueryPipe) query: ReportQueryOutput) {
    return this.reports.coupons(resolveReportRange(query, new Date()))
  }

  @Get('flash-sales')
  flashSales(@Query(reportQueryPipe) query: ReportQueryOutput) {
    return this.reports.flashSales(resolveReportRange(query, new Date()))
  }

  @Get('bridal-funnel')
  bridalFunnel(@Query(reportQueryPipe) query: ReportQueryOutput) {
    return this.reports.bridalFunnel(resolveReportRange(query, new Date()))
  }

  @Get('repeat-customers')
  repeatCustomers(@Query(reportQueryPipe) query: ReportQueryOutput) {
    return this.reports.repeatCustomers(resolveReportRange(query, new Date()))
  }

  @Get(':report/export')
  @Header('Cache-Control', 'no-store')
  async exportCsv(
    @Param('report', reportKindPipe) report: ReportKind,
    @Query(reportQueryPipe) query: ReportQueryOutput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { csv, filename } = await this.reports.exportCsv(
      report,
      resolveReportRange(query, new Date()),
      query.groupBy,
    )
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return csv
  }
}
