import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { ReviewsModule } from '../reviews/reviews.module.js'
import { AdminReviewsController } from './admin-reviews.controller.js'
import { AdminReviewsService } from './admin-reviews.service.js'

@Module({
  imports: [PrismaModule, ReviewsModule],
  controllers: [AdminReviewsController],
  providers: [AdminReviewsService],
  exports: [AdminReviewsService],
})
export class AdminReviewsModule {}
