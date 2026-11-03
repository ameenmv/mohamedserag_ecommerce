import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AdminContentController } from './admin-content.controller.js'
import { AdminContentService } from './admin-content.service.js'
import { AdminFaqController } from './admin-faq.controller.js'
import { AdminFaqService } from './admin-faq.service.js'
import { AdminGuidesController } from './admin-guides.controller.js'
import { AdminGuidesService } from './admin-guides.service.js'
import { AdminPagesController } from './admin-pages.controller.js'
import { AdminPagesService } from './admin-pages.service.js'

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminContentController,
    AdminPagesController,
    AdminGuidesController,
    AdminFaqController,
  ],
  providers: [
    AdminContentService,
    AdminPagesService,
    AdminGuidesService,
    AdminFaqService,
  ],
  exports: [AdminContentService, AdminFaqService],
})
export class AdminContentModule {}
