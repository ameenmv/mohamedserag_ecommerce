import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { customAlphabet } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaService } from '../src/prisma/prisma.service.js'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

describe('Public Reviews API E2E (GET /api/products/:slug/reviews & card/detail ratings)', () => {
  const originalEnv = { ...process.env }
  const validSecret = 'valid-test-seed-secret-at-least-16-chars'
  const runId = `run-${nanoid()}`

  let app: INestApplication
  let prisma: PrismaService

  // Test entities
  let product1Id = ''
  let product1Slug = ''

  let product2Id = ''
  let product2Slug = ''

  let product3Id = ''
  let product3Slug = ''

  let product4HiddenSlug = ''

  let product5ArchivedId = ''
  let product5ArchivedSlug = ''

  let product6Id = ''
  let product6Slug = ''

  beforeAll(async () => {
    process.env.ALLOW_TEST_SEED = 'true'
    process.env.TEST_SEED_SECRET = validSecret

    // Import after setting ALLOW_TEST_SEED: the test-seed routes are registered when app.module loads
    const { AppModule } = await import('../src/app.module.js')
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    // 1. Clean up via test-seed run endpoint
    if (app) {
      await request(app.getHttpServer())
        .delete(`/api/test/run/${runId}`)
        .set('x-test-seed-secret', validSecret)
        .catch(() => undefined)
    }

    // 2. Direct fallback cleanup in Prisma
    if (prisma) {
      const e2eProds = await prisma.product.findMany({
        where: {
          OR: [
            { modelCode: { startsWith: `E2E-${runId}-` } },
            { slug: { startsWith: `e2e-${runId}-` } },
          ],
        },
        select: { id: true },
      })
      const ids = e2eProds.map((p) => p.id)
      if (ids.length > 0) {
        await prisma.review.deleteMany({ where: { productId: { in: ids } } }).catch(() => undefined)
        await prisma.product.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
      }
    }

    if (app) {
      await app.close()
    }

    process.env = originalEnv
  })

  // ==========================================================================
  // Scenario 6: Test-seed review route security (403 without valid secret)
  // ==========================================================================
  describe('Test-seed review route security', () => {
    it('refuses POST /api/test/seed/review without secret with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .send({
          runId,
          productId: 'dummy-prod-id',
          stars: 5,
        })
        .expect(403)
    })

    it('refuses POST /api/test/seed/review with invalid secret with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', 'wrong-secret-value-too-short')
        .send({
          runId,
          productId: 'dummy-prod-id',
          stars: 5,
        })
        .expect(403)
    })
  })

  // ==========================================================================
  // Scenario 1: Product with approved, pending, and rejected reviews
  // ==========================================================================
  describe('Approved review list and rating summary', () => {
    beforeAll(async () => {
      // Seed product 1
      const prodRes = await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          name: `منتج مراجعات تجريبي 1 ${runId}`,
          priceEgp: 3000,
        })
        .expect(201)

      product1Id = prodRes.body.id
      product1Slug = prodRes.body.slug

      const now = Date.now()

      // Seed 3 approved reviews: 3 stars (oldest), 4 stars (middle), 5 stars (newest)
      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: product1Id,
          stars: 3,
          text: 'تقييم متوسط ثلاث نجوم للمنتج للتجربة',
          status: 'approved',
          createdAt: new Date(now - 30 * 60_000).toISOString(),
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: product1Id,
          stars: 4,
          text: 'تقييم جيد جدا أربع نجوم للمنتج للتجربة',
          status: 'approved',
          createdAt: new Date(now - 20 * 60_000).toISOString(),
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: product1Id,
          stars: 5,
          text: 'تقييم ممتاز خمس نجوم للمنتج خامة رائعة',
          status: 'approved',
          createdAt: new Date(now - 10 * 60_000).toISOString(),
        })
        .expect(201)

      // Seed 1 pending review: 1 star
      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: product1Id,
          stars: 1,
          text: 'تقييم معلق نجمة واحدة لم يوافق عليه بعد',
          status: 'pending',
          createdAt: new Date(now - 5 * 60_000).toISOString(),
        })
        .expect(201)

      // Seed 1 rejected review: 1 star
      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: product1Id,
          stars: 1,
          text: 'تقييم مرفوض نجمة واحدة غير معروض إطلاقا',
          status: 'rejected',
          createdAt: new Date(now - 2 * 60_000).toISOString(),
        })
        .expect(201)
    })

    it('returns approved reviews only, newest first, with correct summary and zero private fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products/${product1Slug}/reviews`)
        .expect(200)

      // 1. Summary checks: average = (5+4+3)/3 = 4, count = 3, distribution
      expect(res.body.summary).toEqual({
        average: 4,
        count: 3,
        distribution: {
          1: 0,
          2: 0,
          3: 1,
          4: 1,
          5: 1,
        },
      })
      expect(res.body.total).toBe(3)
      expect(res.body.page).toBe(1)
      expect(res.body.pageSize).toBe(10)

      // 2. Items checks: exactly 3 items, newest first
      expect(res.body.items).toHaveLength(3)
      expect(res.body.items[0].stars).toBe(5)
      expect(res.body.items[1].stars).toBe(4)
      expect(res.body.items[2].stars).toBe(3)

      // 3. Privacy checks: NEVER expose phone, ip, or status
      for (const item of res.body.items) {
        expect(item).not.toHaveProperty('phone')
        expect(item).not.toHaveProperty('ip')
        expect(item).not.toHaveProperty('status')

        expect(typeof item.id).toBe('string')
        expect(typeof item.name).toBe('string')
        expect(typeof item.stars).toBe('number')
        expect(typeof item.text).toBe('string')
        expect(item).toHaveProperty('reply')
        expect(typeof item.verifiedBuyer).toBe('boolean')
        expect(typeof item.createdAt).toBe('string')
      }
    })
  })

  // ==========================================================================
  // Scenario 2: Card & Detail ratings
  // ==========================================================================
  describe('Card & Detail rating representation', () => {
    beforeAll(async () => {
      // Seed product 2 with only pending and rejected reviews
      const prodRes = await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          name: `منتج بدون تقييمات معتمدة ${runId}`,
          priceEgp: 4500,
        })
        .expect(201)

      product2Id = prodRes.body.id
      product2Slug = prodRes.body.slug

      // 1 pending review
      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: product2Id,
          stars: 5,
          status: 'pending',
        })
        .expect(201)

      // 1 rejected review
      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: product2Id,
          stars: 1,
          status: 'rejected',
        })
        .expect(201)
    })

    it('shows rating: { average: 4, count: 3 } on card and detail for product with approved reviews', async () => {
      // Check card via ?ids=
      const listRes = await request(app.getHttpServer())
        .get(`/api/products?ids=${product1Id}`)
        .expect(200)

      expect(listRes.body.items).toHaveLength(1)
      expect(listRes.body.items[0].rating).toEqual({
        average: 4,
        count: 3,
      })

      // Check detail via /:slug
      const detailRes = await request(app.getHttpServer())
        .get(`/api/products/${product1Slug}`)
        .expect(200)

      expect(detailRes.body.rating).toEqual({
        average: 4,
        count: 3,
      })
    })

    it('shows rating: null on card and detail when product has only pending/rejected reviews', async () => {
      // Check card via ?ids=
      const listRes = await request(app.getHttpServer())
        .get(`/api/products?ids=${product2Id}`)
        .expect(200)

      expect(listRes.body.items).toHaveLength(1)
      expect(listRes.body.items[0].rating).toBeNull()

      // Check detail via /:slug
      const detailRes = await request(app.getHttpServer())
        .get(`/api/products/${product2Slug}`)
        .expect(200)

      expect(detailRes.body.rating).toBeNull()

      // Check reviews list is empty with summary.count = 0 and average = 0
      const reviewsRes = await request(app.getHttpServer())
        .get(`/api/products/${product2Slug}/reviews`)
        .expect(200)

      expect(reviewsRes.body.summary).toEqual({
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      })
      expect(reviewsRes.body.items).toEqual([])
      expect(reviewsRes.body.total).toBe(0)
    })
  })

  // ==========================================================================
  // Scenario 3: Paging & Validation
  // ==========================================================================
  describe('Paging and query validation', () => {
    beforeAll(async () => {
      // Seed product 3 with 12 approved reviews
      const prodRes = await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          name: `منتج ترقيم صفحات ${runId}`,
          priceEgp: 5000,
        })
        .expect(201)

      product3Id = prodRes.body.id
      product3Slug = prodRes.body.slug

      const now = Date.now()
      for (let i = 1; i <= 12; i++) {
        await request(app.getHttpServer())
          .post('/api/test/seed/review')
          .set('x-test-seed-secret', validSecret)
          .send({
            runId,
            productId: product3Id,
            stars: (i % 5) + 1,
            text: `تقييم تجريبي رقم ${i} لاختبار الترقيم بالكامل`,
            status: 'approved',
            createdAt: new Date(now - (20 - i) * 60_000).toISOString(),
          })
          .expect(201)
      }
    })

    it('returns page 1 with 10 items, page 2 with 2 items, total 12', async () => {
      const page1Res = await request(app.getHttpServer())
        .get(`/api/products/${product3Slug}/reviews?page=1&pageSize=10`)
        .expect(200)

      expect(page1Res.body.page).toBe(1)
      expect(page1Res.body.pageSize).toBe(10)
      expect(page1Res.body.total).toBe(12)
      expect(page1Res.body.items).toHaveLength(10)

      const page2Res = await request(app.getHttpServer())
        .get(`/api/products/${product3Slug}/reviews?page=2&pageSize=10`)
        .expect(200)

      expect(page2Res.body.page).toBe(2)
      expect(page2Res.body.pageSize).toBe(10)
      expect(page2Res.body.total).toBe(12)
      expect(page2Res.body.items).toHaveLength(2)
    })

    it('returns 400 when pageSize exceeds 50', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${product3Slug}/reviews?pageSize=51`)
        .expect(400)
    })

    it('returns 400 when page is less than 1', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${product3Slug}/reviews?page=0`)
        .expect(400)
    })
  })

  // ==========================================================================
  // Scenario 4: Hidden or archived products (404)
  // ==========================================================================
  describe('Hidden or archived product visibility', () => {
    beforeAll(async () => {
      // Seed hidden product
      const hiddenRes = await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          name: `منتج مخفي ${runId}`,
          visible: false,
        })
        .expect(201)

      product4HiddenSlug = hiddenRes.body.slug

      // Seed archived product
      const archRes = await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          name: `منتج مؤرشف ${runId}`,
          visible: true,
        })
        .expect(201)

      product5ArchivedId = archRes.body.id
      product5ArchivedSlug = archRes.body.slug

      await prisma.product.update({
        where: { id: product5ArchivedId },
        data: { archivedAt: new Date() },
      })
    })

    it('returns 404 «المنتج مش موجود» for hidden product reviews', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products/${product4HiddenSlug}/reviews`)
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })

    it('returns 404 «المنتج مش موجود» for archived product reviews', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products/${product5ArchivedSlug}/reviews`)
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })

    it('returns 404 «المنتج مش موجود» for non-existent product slug', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products/non-existent-product-slug-${runId}/reviews`)
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })
  })

  // ==========================================================================
  // Scenario 5: verifiedBuyer and reply pass through
  // ==========================================================================
  describe('verifiedBuyer badge and store reply pass-through', () => {
    beforeAll(async () => {
      // Seed product 6
      const prodRes = await request(app.getHttpServer())
        .post('/api/test/seed/product')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          name: `منتج مشتري موثق ${runId}`,
        })
        .expect(201)

      product6Id = prodRes.body.id
      product6Slug = prodRes.body.slug

      // Seed review with verifiedBuyer: true and store reply
      await request(app.getHttpServer())
        .post('/api/test/seed/review')
        .set('x-test-seed-secret', validSecret)
        .send({
          runId,
          productId: product6Id,
          stars: 5,
          name: 'عميل مميز اشترى المنتج',
          text: 'تجربة ممتازة واشتريت من المعرض بالفعل وتم التوصيل',
          status: 'approved',
          verifiedBuyer: true,
          reply: 'شكراً جزيلاً لك ويسعدنا دائماً خدمتك في معرض سراج',
        })
        .expect(201)
    })

    it('passes through verifiedBuyer = true and reply string in public reviews list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products/${product6Slug}/reviews`)
        .expect(200)

      expect(res.body.items).toHaveLength(1)
      const review = res.body.items[0]
      expect(review.verifiedBuyer).toBe(true)
      expect(review.reply).toBe('شكراً جزيلاً لك ويسعدنا دائماً خدمتك في معرض سراج')
      expect(review.name).toBe('عميل مميز اشترى المنتج')
      expect(review.stars).toBe(5)
    })
  })
})
