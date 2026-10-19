import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PromotionsModule } from '../promotions/promotions.module.js'
import { ReviewsModule } from '../reviews/reviews.module.js'
import { ContentController } from './content.controller.js'
import { ContentService } from './content.service.js'
import { GuidesController } from './guides.controller.js'
import { GuidesService } from './guides.service.js'
import { PagesController } from './pages.controller.js'
import { PagesService } from './pages.service.js'

@Module({
  imports: [PrismaModule, PromotionsModule, ReviewsModule],
  controllers: [ContentController, PagesController, GuidesController],
  providers: [ContentService, PagesService, GuidesService],
  exports: [ContentService],
})
export class ContentModule {}
