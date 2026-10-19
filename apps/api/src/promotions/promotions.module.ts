import { Global, Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { FlashPricingService } from './flash-pricing.service.js'
import { OffersController } from './offers.controller.js'
import { OffersService } from './offers.service.js'

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [OffersController],
  providers: [FlashPricingService, OffersService],
  exports: [FlashPricingService, OffersService],
})
export class PromotionsModule {}
