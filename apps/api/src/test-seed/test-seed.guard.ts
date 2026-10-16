import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { timingSafeEqual } from 'node:crypto'
import type { Request } from 'express'

@Injectable()
export class TestSeedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>()
    const headerSecret = req.headers['x-test-seed-secret']
    const expectedSecret = process.env.TEST_SEED_SECRET

    if (
      typeof headerSecret !== 'string' ||
      !expectedSecret ||
      expectedSecret.length < 16
    ) {
      throw new ForbiddenException('Forbidden')
    }

    const headerBuf = Buffer.from(headerSecret, 'utf8')
    const expectedBuf = Buffer.from(expectedSecret, 'utf8')

    if (
      headerBuf.length !== expectedBuf.length ||
      !timingSafeEqual(headerBuf, expectedBuf)
    ) {
      throw new ForbiddenException('Forbidden')
    }

    return true
  }
}
