import { Global, Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { StoreSettingsService } from './store-settings.service.js'

@Global()
@Module({
  imports: [PrismaModule],
  providers: [StoreSettingsService],
  exports: [StoreSettingsService],
})
export class SettingsModule {}
