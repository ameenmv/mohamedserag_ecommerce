import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { BridalController } from './bridal.controller.js'
import { BridalListsService } from './bridal-lists.service.js'
import { BridalTiersService } from './bridal-tiers.service.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [BridalController],
  providers: [BridalTiersService, BridalListsService],
  exports: [BridalTiersService, BridalListsService],
})
export class BridalModule {}
