import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { CartController } from './cart.controller.js'
import { CartQuoteService } from './cart-quote.service.js'
import { CouponAttemptLimiter } from './coupon-attempt-limiter.js'
import { CouponService } from './coupon.service.js'
import { OrderThanksService } from './order-thanks.service.js'
import { OrdersController } from './orders.controller.js'
import { OrdersService } from './orders.service.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [CartController, OrdersController],
  providers: [
    OrdersService,
    CartQuoteService,
    OrderThanksService,
    CouponService,
    CouponAttemptLimiter,
  ],
  exports: [
    OrdersService,
    CartQuoteService,
    OrderThanksService,
    CouponService,
    CouponAttemptLimiter,
  ],
})
export class OrdersModule {}
