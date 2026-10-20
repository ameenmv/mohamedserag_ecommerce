import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { BridalController } from './bridal.controller.js'
import { BridalListsService } from './bridal-lists.service.js'
import { BridalReserveService } from './bridal-reserve.service.js'
import { BridalTiersService } from './bridal-tiers.service.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [BridalController],
  providers: [BridalTiersService, BridalListsService, BridalReserveService],
  exports: [BridalTiersService, BridalListsService, BridalReserveService],
})
export class BridalModule {}
