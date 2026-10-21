import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common'
import {
  adminOrderListQuerySchema,
  PERMISSIONS,
  type AdminOrderListQueryOutput,
  type AdminOrderListResponse,
} from '@serag/shared'
import type { Response } from 'express'
import { RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminOrdersExportService } from './admin-orders-export.service.js'
import { AdminOrdersListService } from './admin-orders-list.service.js'

@Controller('admin/orders')
export class AdminOrdersListController {
  constructor(
    private readonly listService: AdminOrdersListService,
    private readonly exportService: AdminOrdersExportService,
  ) {}

  /**
   * Export orders as CSV matching list filters.
   * Route is explicitly declared before the root GET and :id routes to prevent route collisions.
   */
  @Get('export.csv')
  @RequirePermission(PERMISSIONS.orders.read)
  async exportCsv(
    @Query(new ZodValidationPipe(adminOrderListQuerySchema)) query: AdminOrderListQueryOutput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { csv, filename } = await this.exportService.exportOrdersCsv(query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return csv
  }

  /**
   * Paginated orders list with status counts and filters.
   */
  @Get()
  @RequirePermission(PERMISSIONS.orders.read)
  async list(
    @Query(new ZodValidationPipe(adminOrderListQuerySchema)) query: AdminOrderListQueryOutput,
  ): Promise<AdminOrderListResponse> {
    return this.listService.list(query)
  }
}
