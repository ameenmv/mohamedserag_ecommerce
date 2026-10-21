import { Module } from '@nestjs/common'
import { AdminOrdersModule } from '../admin-orders/admin-orders.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import {
  AdminBridalActionsController,
  AdminBridalExpiringController,
} from './admin-bridal-actions.controller.js'
import { AdminBridalTiersController } from './admin-bridal-tiers.controller.js'
import { AdminBridalTiersService } from './admin-bridal-tiers.service.js'
import { BridalReservationService } from './bridal-reservation.service.js'

@Module({
  imports: [PrismaModule, SettingsModule, AdminOrdersModule],
  controllers: [
    AdminBridalActionsController,
    AdminBridalExpiringController,
    AdminBridalTiersController,
  ],
  providers: [BridalReservationService, AdminBridalTiersService],
  exports: [BridalReservationService, AdminBridalTiersService],
})
export class AdminBridalModule {}
