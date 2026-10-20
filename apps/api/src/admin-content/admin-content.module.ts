import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AdminContentController } from './admin-content.controller.js'
import { AdminContentService } from './admin-content.service.js'
import { AdminGuidesController } from './admin-guides.controller.js'
import { AdminGuidesService } from './admin-guides.service.js'
import { AdminPagesController } from './admin-pages.controller.js'
import { AdminPagesService } from './admin-pages.service.js'

@Module({
  imports: [PrismaModule],
  controllers: [AdminContentController, AdminPagesController, AdminGuidesController],
  providers: [AdminContentService, AdminPagesService, AdminGuidesService],
  exports: [AdminContentService],
})
export class AdminContentModule {}
