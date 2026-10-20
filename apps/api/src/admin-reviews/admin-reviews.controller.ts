import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common'
import {
  adminReviewListQuerySchema,
  type AdminReviewListQueryOutput,
  type AdminReviewListResponse,
  type AdminReviewRow,
  PERMISSIONS,
  reviewReplySchema,
  type ReviewReplyOutput,
} from '@serag/shared'
import { Audit, RequirePermission } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AdminReviewsService } from './admin-reviews.service.js'

@Controller('admin/reviews')
@RequirePermission(PERMISSIONS.reviews.moderate)
export class AdminReviewsController {
  constructor(private readonly adminReviewsService: AdminReviewsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.reviews.moderate)
  async list(
    @Query(new ZodValidationPipe(adminReviewListQuerySchema))
    query: AdminReviewListQueryOutput,
  ): Promise<AdminReviewListResponse> {
    return this.adminReviewsService.list(query)
  }

  @Get('pending-count')
  @RequirePermission(PERMISSIONS.reviews.moderate)
  async getPendingCount(): Promise<{ count: number }> {
    return this.adminReviewsService.getPendingCount()
  }

  @Patch(':id/approve')
  @RequirePermission(PERMISSIONS.reviews.moderate)
  @Audit('review')
  async approve(@Param('id') id: string): Promise<AdminReviewRow> {
    return this.adminReviewsService.approve(id)
  }

  @Patch(':id/reject')
  @RequirePermission(PERMISSIONS.reviews.moderate)
  @Audit('review')
  async reject(@Param('id') id: string): Promise<AdminReviewRow> {
    return this.adminReviewsService.reject(id)
  }

  @Patch(':id/reply')
  @RequirePermission(PERMISSIONS.reviews.moderate)
  @Audit('review')
  async reply(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviewReplySchema))
    body: ReviewReplyOutput,
  ): Promise<AdminReviewRow> {
    return this.adminReviewsService.reply(id, body.reply)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.reviews.moderate)
  @Audit('review')
  async delete(@Param('id') id: string): Promise<void> {
    await this.adminReviewsService.delete(id)
  }
}
