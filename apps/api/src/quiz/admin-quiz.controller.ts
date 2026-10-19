import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common'
import {
  PERMISSIONS,
  quizDefinitionSchema,
  type AdminQuizRow,
  type AdminQuizState,
  type QuizDefinitionOutput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminQuizService } from './admin-quiz.service.js'

@Controller('admin/quiz')
@RequirePermission(PERMISSIONS.content.manage)
export class AdminQuizController {
  constructor(private readonly adminQuizService: AdminQuizService) {}

  @Get()
  @RequirePermission(PERMISSIONS.content.manage)
  async list(): Promise<{ items: AdminQuizRow[] }> {
    return this.adminQuizService.listRows()
  }

  @Get(':categoryId')
  @RequirePermission(PERMISSIONS.content.manage)
  async get(@Param('categoryId') categoryId: string): Promise<AdminQuizState> {
    return this.adminQuizService.getState(categoryId)
  }

  @Put(':categoryId')
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async save(
    @Param('categoryId') categoryId: string,
    @Body(new ZodValidationPipe(quizDefinitionSchema)) body: QuizDefinitionOutput,
  ): Promise<AdminQuizState> {
    return this.adminQuizService.save(categoryId, body)
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.content.manage)
  @Audit('content')
  async remove(@Param('categoryId') categoryId: string): Promise<void> {
    return this.adminQuizService.remove(categoryId)
  }
}
