import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  quizResultsInputSchema,
  type PublicQuiz,
  type QuizResultsOutput,
  type QuizResultsResponse,
} from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { QuizService } from './quiz.service.js'

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * GET /api/quiz/:categorySlug
   * Public quiz questions for a category (rules are never exposed).
   */
  @Get(':categorySlug')
  @Public()
  async getQuiz(@Param('categorySlug') categorySlug: string): Promise<PublicQuiz> {
    return this.quizService.getQuiz(categorySlug)
  }

  /**
   * POST /api/quiz/:categorySlug/results
   * Scores the chosen answers and returns up to three recommended products with reasons.
   */
  @Post(':categorySlug/results')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async getResults(
    @Param('categorySlug') categorySlug: string,
    @Body(new ZodValidationPipe(quizResultsInputSchema)) body: QuizResultsOutput,
  ): Promise<QuizResultsResponse> {
    return this.quizService.getResults(categorySlug, body.answers)
  }
}
