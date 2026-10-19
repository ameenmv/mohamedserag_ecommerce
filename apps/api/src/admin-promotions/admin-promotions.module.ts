import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AdminCouponsController } from './admin-coupons.controller.js'
import { AdminCouponsService } from './admin-coupons.service.js'
import { AdminFlashSalesController } from './admin-flash-sales.controller.js'
import { AdminFlashSalesService } from './admin-flash-sales.service.js'

@Module({
  imports: [PrismaModule],
  controllers: [AdminFlashSalesController, AdminCouponsController],
  providers: [AdminFlashSalesService, AdminCouponsService],
  exports: [AdminFlashSalesService, AdminCouponsService],
})
export class AdminPromotionsModule {}
