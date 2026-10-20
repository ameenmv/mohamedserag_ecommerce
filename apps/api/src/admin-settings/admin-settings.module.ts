import { Module } from '@nestjs/common'
import { CatalogModule } from '../catalog/catalog.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { AdminSettingsController } from './admin-settings.controller.js'
import { AdminSettingsService } from './admin-settings.service.js'

@Module({
  imports: [PrismaModule, SettingsModule, CatalogModule],
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService],
})
export class AdminSettingsModule {}
