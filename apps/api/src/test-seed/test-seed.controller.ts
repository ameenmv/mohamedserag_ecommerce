import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import {
  runIdParamSchema,
  seedAdminSessionSchema,
  seedOrderSchema,
  seedProductSchema,
  type SeedAdminSessionInput,
  type SeedOrderInput,
  type SeedProductInput,
} from './test-seed.dto.js'
import { TestSeedGuard } from './test-seed.guard.js'
import { TestSeedService } from './test-seed.service.js'

@SkipThrottle()
@UseGuards(TestSeedGuard)
@Controller('test')
export class TestSeedController {
  constructor(private readonly service: TestSeedService) {}

  @Post('seed/product')
  async seedProduct(
    @Body(new ZodValidationPipe(seedProductSchema)) body: SeedProductInput,
  ) {
    return this.service.seedProduct(body)
  }

  @Post('seed/order')
  async seedOrder(
    @Body(new ZodValidationPipe(seedOrderSchema)) body: SeedOrderInput,
  ) {
    return this.service.seedOrder(body)
  }

  @Post('seed/admin-session')
  async seedAdminSession(
    @Body(new ZodValidationPipe(seedAdminSessionSchema)) body: SeedAdminSessionInput,
  ) {
    return this.service.seedAdminSession(body)
  }

  @Delete('run/:runId')
  async deleteRun(
    @Param('runId', new ZodValidationPipe(runIdParamSchema)) runId: string,
  ) {
    return this.service.deleteRun(runId)
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async reset() {
    return this.service.resetAllE2E()
  }
}
