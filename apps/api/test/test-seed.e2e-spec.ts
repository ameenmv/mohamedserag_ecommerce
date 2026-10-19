import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { normalizeArabic } from '@serag/shared'
import cookieParser from 'cookie-parser'
import { customAlphabet } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../src/prisma/prisma.service.js'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

describe('TestSeedModule E2E (/api/test)', () => {
  const originalEnv = { ...process.env }
  const validSecret = 'valid-test-seed-secret-at-least-16-chars'

  afterAll(() => {
    process.env = originalEnv
  })

  describe('(a) when ALLOW_TEST_SEED is unset', () => {
    let app: INestApplication

    beforeAll(async () => {
      delete process.env.ALLOW_TEST_SEED
      delete process.env.TEST_SEED_SECRET
      vi.resetModules()

      const { AppModule } = await import('../src/app.module.js')
      const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
      app = mod.createNestApplication()
      app.use(cookieParser())
      app.setGlobalPrefix('api')
      await app.init()
    })

    afterAll(async () => {
      if (app) {
        await app.close()
      }
    })

    it('returns 404 on POST /api/test/seed/product', async () => {
      await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({ runId: 'run-disabled' })
        .expect(404)
    })

    it('returns 404 on POST /api/test/reset', async () => {
      await request(app.getHttpServer())
        .post('/api/test/reset')
        .set('x-test-seed-secret', validSecret)
        .expect(404)
    })
  })

  describe('(b) & (c) when ALLOW_TEST_SEED is enabled with valid secret', () => {
    let app: INestApplication
    let prisma: PrismaService
    const runId = `run-${nanoid()}`

    let seededProductId = ''
    let seededModelCode = ''
    let seededOrderId = ''
    let initialCatalogCount = 0

    beforeAll(async () => {
      process.env.ALLOW_TEST_SEED = 'true'
      process.env.TEST_SEED_SECRET = validSecret
      vi.resetModules()

      const { AppModule } = await import('../src/app.module.js')
      const { PrismaService } = await import('../src/prisma/prisma.service.js')
      const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
      app = mod.createNestApplication()
      app.use(cookieParser())
      app.setGlobalPrefix('api')
      await app.init()

      prisma = app.get(PrismaService)
      initialCatalogCount = await prisma.product.count({
        where: { modelCode: { not: { startsWith: 'E2E-' } } },
      })
    })

    afterAll(async () => {
      if (app) {
        await app.close()
      }
    })

    // (b) enabled + wrong/missing secret -> 403
    it('returns 403 when x-test-seed-secret header is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .send({ runId })
        .expect(403)
    })

    it('returns 403 when x-test-seed-secret header is wrong', async () => {
      await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', 'wrong-secret-value')
        .send({ runId })
        .expect(403)
    })

    // (c) enabled + right secret
    it('creates a product tagged with runId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          name: 'ثلاجة تجريبية لاختبار E2E',
          priceEgp: 5000,
        })
        .expect(201)

      expect(res.body).toMatchObject({
        id: expect.any(String),
        slug: `e2e-${runId}-1`,
        modelCode: `E2E-${runId}-1`,
        price: 500000,
      })

      seededProductId = res.body.id
      seededModelCode = res.body.modelCode

      const inDb = await prisma.product.findUnique({
        where: { id: seededProductId },
      })
      expect(inDb).not.toBeNull()
      expect(inDb?.searchText).toContain(normalizeArabic('ثلاجة'))
    })

    it('creates an order for that product tagged with runId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/test/seed/order')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          items: [{ productId: seededProductId, qty: 2 }],
          paymentMethod: 'cod',
          governorate: 'الدقهلية',
          city: 'المنصورة',
        })
        .expect(201)

      expect(res.body).toMatchObject({
        id: expect.any(String),
        no: `E2E-${runId}-1`,
        publicToken: expect.any(String),
        confirmToken: expect.any(String),
        total: 1000000 + 10000, // 2 * 5000 EGP + 100 EGP delivery
        status: 'new',
      })
      expect(res.body.publicToken.length).toBe(32)
      expect(res.body.confirmToken.length).toBe(32)

      seededOrderId = res.body.id

      const inDb = await prisma.order.findUnique({
        where: { id: seededOrderId },
        include: { items: true, events: true },
      })
      expect(inDb).not.toBeNull()
      expect(inDb?.items).toHaveLength(1)
      expect(inDb?.items[0].modelCode).toBe(seededModelCode)
      expect(inDb?.events).toHaveLength(1)
      expect(inDb?.customerPhone).toBe('01000000001')
    })

    it('creates an admin session and allows authenticating against GET /api/admin/auth/me', async () => {
      const adminRes = await request(app.getHttpServer())
        .post('/api/test/seed/admin-session')
        .set('x-test-seed-secret', validSecret)
        .send({ runId })
        .expect(201)

      expect(adminRes.body).toMatchObject({
        cookieName: 'serag_sid',
        cookieValue: expect.any(String),
        csrfToken: expect.any(String),
        email: `e2e-${runId}@test.local`,
      })

      const meRes = await request(app.getHttpServer())
        .get('/api/admin/auth/me')
        .set('Cookie', `${adminRes.body.cookieName}=${adminRes.body.cookieValue}`)
        .expect(200)

      expect(meRes.body.user.email).toBe(`e2e-${runId}@test.local`)
      expect(meRes.body.csrfToken).toBe(adminRes.body.csrfToken)
    })

    it('creates a review for that product tagged with runId', async () => {
      const revRes = await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: seededProductId,
          stars: 5,
          status: 'approved',
          verifiedBuyer: true,
          reply: 'شكراً لك',
        })
        .expect(201)

      expect(revRes.body).toMatchObject({
        id: expect.any(String),
      })

      const reviewInDb = await prisma.review.findUnique({
        where: { id: revRes.body.id },
      })
      expect(reviewInDb).not.toBeNull()
      expect(reviewInDb?.productId).toBe(seededProductId)
      expect(reviewInDb?.stars).toBe(5)
      expect(reviewInDb?.status).toBe('approved')
      expect(reviewInDb?.verifiedBuyer).toBe(true)
      expect(reviewInDb?.reply).toBe('شكراً لك')
    })

    it('deletes the run data and leaves the seeded catalog untouched', async () => {
      const delRes = await request(app.getHttpServer())
        .delete(`/api/test/run/${runId}`)
        .set('x-test-seed-secret', validSecret)
        .expect(200)

      expect(delRes.body).toMatchObject({
        runId,
        products: expect.any(Number),
        orders: expect.any(Number),
        users: expect.any(Number),
      })
      expect(delRes.body.products).toBeGreaterThanOrEqual(1)
      expect(delRes.body.orders).toBeGreaterThanOrEqual(1)
      expect(delRes.body.users).toBeGreaterThanOrEqual(1)

      const productAfter = await prisma.product.findUnique({
        where: { id: seededProductId },
      })
      expect(productAfter).toBeNull()

      const orderAfter = await prisma.order.findUnique({
        where: { id: seededOrderId },
      })
      expect(orderAfter).toBeNull()

      const userAfter = await prisma.user.findUnique({
        where: { email: `e2e-${runId}@test.local` },
      })
      expect(userAfter).toBeNull()

      const catalogCountAfter = await prisma.product.count({
        where: { modelCode: { not: { startsWith: 'E2E-' } } },
      })
      expect(catalogCountAfter).toBe(initialCatalogCount)
    })

    it('reset wipes any stray E2E records without touching non-E2E records', async () => {
      const strayRunId = `stray-${nanoid(6)}`
      await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({ runId: strayRunId })
        .expect(201)

      const resetRes = await request(app.getHttpServer())
        .post('/api/test/reset')
        .set('x-test-seed-secret', validSecret)
        .expect(200)

      expect(resetRes.body.products).toBeGreaterThanOrEqual(1)

      const remainingE2EProducts = await prisma.product.count({
        where: { modelCode: { startsWith: 'E2E-' } },
      })
      expect(remainingE2EProducts).toBe(0)

      const catalogCountAfterReset = await prisma.product.count({
        where: { modelCode: { not: { startsWith: 'E2E-' } } },
      })
      expect(catalogCountAfterReset).toBe(initialCatalogCount)
    })
  })
})
