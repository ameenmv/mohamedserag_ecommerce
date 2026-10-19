import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AdminContentController } from './admin-content.controller.js'
import { AdminContentService } from './admin-content.service.js'

@Module({
  imports: [PrismaModule],
  controllers: [AdminContentController],
  providers: [AdminContentService],
  exports: [AdminContentService],
})
export class AdminContentModule {}
