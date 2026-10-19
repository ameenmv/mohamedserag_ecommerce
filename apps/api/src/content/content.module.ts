import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { ContentController } from './content.controller.js'
import { ContentService } from './content.service.js'
import { PagesController } from './pages.controller.js'
import { PagesService } from './pages.service.js'

@Module({
  imports: [PrismaModule],
  controllers: [ContentController, PagesController],
  providers: [ContentService, PagesService],
  exports: [ContentService],
})
export class ContentModule {}
