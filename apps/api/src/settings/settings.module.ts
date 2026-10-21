import { Global, Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { StoreSettingsService } from './store-settings.service.js'
import { CheckoutSettingsController } from './checkout-settings.controller.js'
import { StoreInfoController } from './store-info.controller.js'

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [CheckoutSettingsController, StoreInfoController],
  providers: [StoreSettingsService],
  exports: [StoreSettingsService],
})
export class SettingsModule {}
