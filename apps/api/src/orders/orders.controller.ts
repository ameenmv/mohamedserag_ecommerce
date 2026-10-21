import {
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  createOrderInputSchema,
  type CreateOrderInput,
  type CreateOrderResult,
  type OrderThanks,
} from '@serag/shared'
import type { Response } from 'express'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { OrdersService } from './orders.service.js'
import { OrderThanksService } from './order-thanks.service.js'

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderThanksService: OrderThanksService,
  ) {}

  /**
   * POST /api/orders
   * Idempotent order placement with stock check, quote verification, and sequential order numbering.
   */
  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createOrder(
    @Body(new ZodValidationPipe(createOrderInputSchema)) body: CreateOrderInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CreateOrderResult> {
    const { result, isNew } = await this.ordersService.createOrder(body)
    res.status(isNew ? HttpStatus.CREATED : HttpStatus.OK)
    return result
  }

  /**
   * GET /api/orders/:no/thanks?t=<publicToken>
   * Thank-you page order detail lookup protected by publicToken verification.
   */
  @Get(':no/thanks')
  @Public()
  @Header('Cache-Control', 'no-store')
  async getThanks(
    @Param('no') no: string,
    @Query('t') token: string | undefined,
  ): Promise<OrderThanks> {
    return this.orderThanksService.getOrderThanks(no, token)
  }
}
