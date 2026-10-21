import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { AdminNotifyController } from './admin-notify.controller.js'
import { AdminNotifyService } from './admin-notify.service.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [AdminNotifyController],
  providers: [AdminNotifyService],
  exports: [AdminNotifyService],
})
export class AdminNotifyModule {}
