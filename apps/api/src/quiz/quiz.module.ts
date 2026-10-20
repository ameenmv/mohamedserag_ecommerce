import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PromotionsModule } from '../promotions/promotions.module.js'
import { ReviewsModule } from '../reviews/reviews.module.js'
import { AdminQuizController } from './admin-quiz.controller.js'
import { AdminQuizService } from './admin-quiz.service.js'
import { QuizController } from './quiz.controller.js'
import { QuizService } from './quiz.service.js'

@Module({
  imports: [PrismaModule, PromotionsModule, ReviewsModule],
  controllers: [QuizController, AdminQuizController],
  providers: [QuizService, AdminQuizService],
  exports: [QuizService, AdminQuizService],
})
export class QuizModule {}
