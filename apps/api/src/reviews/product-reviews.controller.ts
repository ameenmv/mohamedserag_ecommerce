import { Controller, Get, Param, Query } from '@nestjs/common'
import type { PublicReviewListResponse } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import {
  publicReviewsQuerySchema,
  type PublicReviewsQueryInput,
} from './reviews.dto.js'
import { ReviewsService } from './reviews.service.js'

@Controller('products')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * GET /api/products/:slug/reviews
   * Public approved reviews list and summary for a product.
   */
  @Get(':slug/reviews')
  @Public()
  async listReviews(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(publicReviewsQuerySchema)) query: PublicReviewsQueryInput,
  ): Promise<PublicReviewListResponse> {
    return this.reviewsService.listPublic(slug, query.page, query.pageSize)
  }
}
