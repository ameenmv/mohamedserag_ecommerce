import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import {
  bridalAlternativesQuerySchema,
  bridalReserveQuoteQuerySchema,
  bridalReserveSchema,
  bridalTokenSchema,
  createBridalListSchema,
  saveBridalListSchema,
  type BridalAlternative,
  type BridalAlternativesQuery,
  type BridalListView,
  type BridalReserveInput,
  type BridalReserveQuote,
  type BridalReserveQuoteQuery,
  type BridalTierSummary,
  type CreateBridalListInput,
  type SaveBridalListInput,
} from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { BridalListsService } from './bridal-lists.service.js'
import { BridalReserveService } from './bridal-reserve.service.js'
import { BridalTiersService } from './bridal-tiers.service.js'

@Controller('bridal')
export class BridalController {
  constructor(
    private readonly tiersService: BridalTiersService,
    private readonly listsService: BridalListsService,
    private readonly reserveService: BridalReserveService,
  ) {}

  @Get('tiers')
  @Public()
  async getTiers(): Promise<{ tiers: BridalTierSummary[] }> {
    return this.tiersService.listTiers()
  }

  @Post('lists')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async createList(
    @Body(new ZodValidationPipe(createBridalListSchema)) body: CreateBridalListInput,
  ): Promise<{ editToken: string }> {
    return this.listsService.create(body)
  }

  @Get('lists/:token')
  @Public()
  @Header('Cache-Control', 'no-store')
  async getList(
    @Param('token', new ZodValidationPipe(bridalTokenSchema)) token: string,
  ): Promise<BridalListView> {
    return this.listsService.getByToken(token)
  }

  @Patch('lists/:token')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async saveList(
    @Param('token', new ZodValidationPipe(bridalTokenSchema)) token: string,
    @Body(new ZodValidationPipe(saveBridalListSchema)) body: SaveBridalListInput,
  ): Promise<BridalListView> {
    return this.listsService.save(token, body.rooms)
  }

  @Get('alternatives')
  @Public()
  async getAlternatives(
    @Query(new ZodValidationPipe(bridalAlternativesQuerySchema)) query: BridalAlternativesQuery,
  ): Promise<{ items: BridalAlternative[] }> {
    return this.listsService.alternatives(query.productId)
  }

  @Get('reserve-quote/:token')
  @Public()
  @Header('Cache-Control', 'no-store')
  async getReserveQuote(
    @Param('token', new ZodValidationPipe(bridalTokenSchema)) token: string,
    @Query(new ZodValidationPipe(bridalReserveQuoteQuerySchema)) query: BridalReserveQuoteQuery,
  ): Promise<BridalReserveQuote> {
    return this.reserveService.getReserveQuote(token, query)
  }

  @Post('lists/:token/reserve')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async reserve(
    @Param('token', new ZodValidationPipe(bridalTokenSchema)) token: string,
    @Body(new ZodValidationPipe(bridalReserveSchema)) body: BridalReserveInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ orderNo: string; publicToken: string }> {
    const outcome = await this.reserveService.reserve(token, body)
    res.status(outcome.isNew ? HttpStatus.CREATED : HttpStatus.OK)
    return { orderNo: outcome.orderNo, publicToken: outcome.publicToken }
  }
}

