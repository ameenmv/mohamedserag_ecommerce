import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

/**
 * Verifies per-visitor rate limiting across the trust boundary.
 *
 * `POST /api/notify-me` is limited to 5 requests per minute per visitor and validates the
 * product after the throttler runs. A valid-shaped body with a non-existent product id
 * therefore counts against the budget (guard runs first) and responds 404, while the
 * over-limit request responds 429 — no rows are written, so nothing needs cleanup.
 *
 * The Nest app under test sets `trust proxy` explicitly because only `main.ts` sets it in
 * production; `req.ip` must resolve to the forwarded visitor, not the socket.
 */
describe('Per-visitor throttling E2E (/api/notify-me trust boundary)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const NOTIFY_ME_PATH = '/api/notify-me'
  const NON_EXISTENT_PRODUCT_ID = 'per-visitor-throttle-non-existent-product'

  const validBody = {
    productId: NON_EXISTENT_PRODUCT_ID,
    name: 'عميل اختبار',
    phone: '01012345678',
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    await prisma.notifyRequest.deleteMany({
      where: { productId: NON_EXISTENT_PRODUCT_ID },
    })
    await app.close()
  })

  it('gives two forwarded visitors separate budgets', async () => {
    const firstVisitor = '203.0.113.10'

    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post(NOTIFY_ME_PATH)
        .set('X-Forwarded-For', firstVisitor)
        .send(validBody)
      expect(res.status).not.toBe(429)
      expect(res.status).toBe(404)
    }

    await request(app.getHttpServer())
      .post(NOTIFY_ME_PATH)
      .set('X-Forwarded-For', firstVisitor)
      .send(validBody)
      .expect(429)

    // A different forwarded visitor has an independent budget.
    await request(app.getHttpServer())
      .post(NOTIFY_ME_PATH)
      .set('X-Forwarded-For', '203.0.113.11')
      .send(validBody)
      .expect(404)
  })

  it('does not let a spoofed leading entry reset the budget', async () => {
    // Reuse the same real (last) visitor as the first test while prepending a spoofed entry.
    const spoofedChain = '198.51.100.99, 203.0.113.10'

    await request(app.getHttpServer())
      .post(NOTIFY_ME_PATH)
      .set('X-Forwarded-For', spoofedChain)
      .send(validBody)
      .expect(429)
  })

  it('does not persist anything for rejected (over-limit) requests', async () => {
    const count = await prisma.notifyRequest.count({
      where: { productId: NON_EXISTENT_PRODUCT_ID },
    })
    expect(count).toBe(0)
  })
})
