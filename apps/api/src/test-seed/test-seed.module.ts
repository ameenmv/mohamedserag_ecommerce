import { type DynamicModule, Logger, Module } from '@nestjs/common'
import { TestSeedController } from './test-seed.controller.js'
import { TestSeedGuard } from './test-seed.guard.js'
import { TestSeedService } from './test-seed.service.js'

@Module({})
export class TestSeedModule {
  private static readonly logger = new Logger(TestSeedModule.name)

  static forRoot(options?: {
    allowTestSeed?: boolean
    secret?: string
  }): DynamicModule {
    const allowTestSeed =
      options?.allowTestSeed ?? (process.env.ALLOW_TEST_SEED === 'true')
    const secret = options?.secret ?? process.env.TEST_SEED_SECRET
    const isEnabled =
      allowTestSeed && typeof secret === 'string' && secret.length >= 16

    if (!isEnabled) {
      return {
        module: TestSeedModule,
      }
    }

    TestSeedModule.logger.warn(
      'TEST SEED MODULE ENABLED — never use in production',
    )

    return {
      module: TestSeedModule,
      controllers: [TestSeedController],
      providers: [TestSeedService, TestSeedGuard],
      exports: [TestSeedService],
    }
  }
}
