import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AdminContentController } from './admin-content.controller.js'
import { AdminContentService } from './admin-content.service.js'
import { AdminPagesController } from './admin-pages.controller.js'
import { AdminPagesService } from './admin-pages.service.js'

@Module({
  imports: [PrismaModule],
  controllers: [AdminContentController, AdminPagesController],
  providers: [AdminContentService, AdminPagesService],
  exports: [AdminContentService],
})
export class AdminContentModule {}
