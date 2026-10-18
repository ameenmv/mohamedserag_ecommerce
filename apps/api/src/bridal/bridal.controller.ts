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
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  bridalAlternativesQuerySchema,
  bridalTokenSchema,
  createBridalListSchema,
  saveBridalListSchema,
  type BridalAlternative,
  type BridalAlternativesQuery,
  type BridalListView,
  type BridalTierSummary,
  type CreateBridalListInput,
  type SaveBridalListInput,
} from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { BridalListsService } from './bridal-lists.service.js'
import { BridalTiersService } from './bridal-tiers.service.js'

@Controller('bridal')
export class BridalController {
  constructor(
    private readonly tiersService: BridalTiersService,
    private readonly listsService: BridalListsService,
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
}
