import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { AdminConfirmController } from './admin-confirm.controller.js'
import { AdminOrderActionsController } from './admin-order-actions.controller.js'
import { AdminOrderDetailService } from './admin-order-detail.service.js'
import { OrderPaymentsService } from './order-payments.service.js'
import { OrderStatusService } from './order-status.service.js'
import { OrderStockService } from './order-stock.service.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [AdminOrderActionsController, AdminConfirmController],
  providers: [
    OrderStockService,
    OrderStatusService,
    OrderPaymentsService,
    AdminOrderDetailService,
  ],
  exports: [
    OrderStockService,
    OrderStatusService,
    OrderPaymentsService,
    AdminOrderDetailService,
  ],
})
export class AdminOrdersModule {}
