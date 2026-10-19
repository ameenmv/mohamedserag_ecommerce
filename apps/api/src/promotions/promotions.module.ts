import { Global, Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { FlashPricingService } from './flash-pricing.service.js'
import { NotifyMeController } from './notify-me.controller.js'
import { NotifyMeService } from './notify-me.service.js'
import { OffersController } from './offers.controller.js'
import { OffersService } from './offers.service.js'

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [OffersController, NotifyMeController],
  providers: [FlashPricingService, OffersService, NotifyMeService],
  exports: [FlashPricingService, OffersService, NotifyMeService],
})
export class PromotionsModule {}
