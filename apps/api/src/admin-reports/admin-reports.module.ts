import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { AdminReportsController } from './admin-reports.controller.js'
import { AdminReportsService } from './admin-reports.service.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
})
export class AdminReportsModule {}
