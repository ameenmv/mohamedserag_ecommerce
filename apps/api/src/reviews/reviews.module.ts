import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { ProductReviewsController } from './product-reviews.controller.js'
import { ReviewRatingsService } from './review-ratings.service.js'
import { ReviewsController } from './reviews.controller.js'
import { ReviewsService } from './reviews.service.js'

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController, ProductReviewsController],
  providers: [ReviewsService, ReviewRatingsService],
  exports: [ReviewsService, ReviewRatingsService],
})
export class ReviewsModule {}

