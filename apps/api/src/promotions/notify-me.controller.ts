import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { notifyMeInputSchema, type NotifyMeInput } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { NotifyMeService } from './notify-me.service.js'

@Controller('notify-me')
export class NotifyMeController {
  constructor(private readonly notifyMeService: NotifyMeService) {}

  /**
   * POST /api/notify-me
   * Public shopper request for back-in-stock notification.
   */
  @Post()
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async requestNotification(
    @Body(new ZodValidationPipe(notifyMeInputSchema)) body: NotifyMeInput,
  ): Promise<{ ok: true }> {
    return this.notifyMeService.requestNotification(body)
  }
}
