import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { OpenWaSender } from './open-wa.sender.js'
import { WhatsAppAlertsService } from './whatsapp-alerts.service.js'
import { WHATSAPP_SENDER } from './whatsapp-sender.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [
    OpenWaSender,
    {
      provide: WHATSAPP_SENDER,
      useClass: OpenWaSender,
    },
    WhatsAppAlertsService,
  ],
  exports: [WhatsAppAlertsService, WHATSAPP_SENDER],
})
export class WhatsAppModule {}
