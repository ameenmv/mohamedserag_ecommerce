import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { AdminConfirmController } from './admin-confirm.controller.js'
import { AdminOrderActionsController } from './admin-order-actions.controller.js'
import { AdminOrderDetailService } from './admin-order-detail.service.js'
import { AdminOrdersExportService } from './admin-orders-export.service.js'
import { AdminOrdersListController } from './admin-orders-list.controller.js'
import { AdminOrdersListService } from './admin-orders-list.service.js'
import { OrderPaymentsService } from './order-payments.service.js'
import { OrderStatusService } from './order-status.service.js'
import { OrderStockService } from './order-stock.service.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [
    AdminOrdersListController,
    AdminOrderActionsController,
    AdminConfirmController,
  ],
  providers: [
    OrderStockService,
    OrderStatusService,
    OrderPaymentsService,
    AdminOrderDetailService,
    AdminOrdersListService,
    AdminOrdersExportService,
  ],
  exports: [
    OrderStockService,
    OrderStatusService,
    OrderPaymentsService,
    AdminOrderDetailService,
    AdminOrdersListService,
    AdminOrdersExportService,
  ],
})
export class AdminOrdersModule {}
