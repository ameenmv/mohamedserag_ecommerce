import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { reviewInputSchema, type ReviewInput, type StoreReviewsResponse } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { ReviewsService } from './reviews.service.js'

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * GET /api/reviews/latest
   * The newest approved 4–5 star reviews across the store, for the home page.
   */
  @Get('latest')
  @Public()
  async latest(): Promise<StoreReviewsResponse> {
    return this.reviewsService.listLatest(12)
  }

  /**
   * POST /api/reviews
   * Public shopper review submission.
   */
  @Post()
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async submitReview(
    @Body(new ZodValidationPipe(reviewInputSchema)) body: ReviewInput,
    @Ip() ip?: string,
  ): Promise<{ ok: true }> {
    return this.reviewsService.submitReview(body, ip)
  }
}
