import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import type { BridalListView, BridalTierSummary } from '@serag/shared'

describe('Bridal Lists & Tiers API E2E (/api/bridal)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()

  let fridgeCategoryId = ''
  let washersCategoryId = ''
  let testBrandId = ''

  let inStockFridgeId = ''
  let altFridgeId = ''
  let inStockWasherId = ''
  let outOfStockWasherId = ''
  let hiddenWasherId = ''
  let testTierId = ''

  const createdListTokens: string[] = []
  const createdProductIds: string[] = []

  let ipCounter = 1
  const nextIp = () => `10.2.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // 1. Resolve or create categories
    let fridgeCat = await prisma.category.findUnique({ where: { slug: 'refrigerators' } })
    if (!fridgeCat) {
      fridgeCat = await prisma.category.create({
        data: {
          slug: 'refrigerators',
          name: 'ثلاجات',
          sort: 1,
        },
      })
    }
    fridgeCategoryId = fridgeCat.id

    let washersCat = await prisma.category.findUnique({ where: { slug: 'washers' } })
    if (!washersCat) {
      washersCat = await prisma.category.create({
        data: {
          slug: 'washers',
          name: 'غسالات',
          sort: 2,
        },
      })
    }
    washersCategoryId = washersCat.id

    // 2. Resolve or create brand
    let brand = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          slug: `brand-${runId}`,
          name: 'ماركة اختبار',
        },
      })
    }
    testBrandId = brand.id

    // 3. Create test products
    // Product A: In-stock fridge (20,000 EGP = 2,000,000 piastres)
    const p1 = await prisma.product.create({
      data: {
        modelCode: `BTEST-${runId}-1`,
        slug: `btest-${runId}-1`,
        name: `ثلاجة اختبار متوفرة ${runId}`,
        brandId: testBrandId,
        categoryId: fridgeCategoryId,
        price: 2_000_000,
        stock: 10,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
        images: {
          create: [{ url: `https://example.com/btest-${runId}-1.jpg`, sort: 0 }],
        },
      },
    })
    inStockFridgeId = p1.id
    createdProductIds.push(p1.id)

    // Product B: Alternative fridge (22,000 EGP = 2,200,000 piastres)
    const p2 = await prisma.product.create({
      data: {
        modelCode: `BTEST-${runId}-2`,
        slug: `btest-${runId}-2`,
        name: `ثلاجة بديلة متوفرة ${runId}`,
        brandId: testBrandId,
        categoryId: fridgeCategoryId,
        price: 2_200_000,
        stock: 8,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    altFridgeId = p2.id
    createdProductIds.push(p2.id)

    // Product C: In-stock washer (15,000 EGP = 1,500,000 piastres)
    const p3 = await prisma.product.create({
      data: {
        modelCode: `BTEST-${runId}-3`,
        slug: `btest-${runId}-3`,
        name: `غسالة اختبار متوفرة ${runId}`,
        brandId: testBrandId,
        categoryId: washersCategoryId,
        price: 1_500_000,
        stock: 5,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    inStockWasherId = p3.id
    createdProductIds.push(p3.id)

    // Product D: Out-of-stock washer (10,000 EGP = 1,000,000 piastres)
    const p4 = await prisma.product.create({
      data: {
        modelCode: `BTEST-${runId}-4`,
        slug: `btest-${runId}-4`,
        name: `غسالة نافذة ${runId}`,
        brandId: testBrandId,
        categoryId: washersCategoryId,
        price: 1_000_000,
        stock: 0,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    outOfStockWasherId = p4.id
    createdProductIds.push(p4.id)

    // Product E: Hidden washer (12,000 EGP = 1,200,000 piastres)
    const p5 = await prisma.product.create({
      data: {
        modelCode: `BTEST-${runId}-5`,
        slug: `btest-${runId}-5`,
        name: `غسالة مخفية ${runId}`,
        brandId: testBrandId,
        categoryId: washersCategoryId,
        price: 1_200_000,
        stock: 10,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: false,
        taxRate: 14,
      },
    })
    hiddenWasherId = p5.id
    createdProductIds.push(p5.id)

    // 4. Create a dedicated test tier
    const tier = await prisma.bridalTier.create({
      data: {
        slug: `test-tier-${runId}`,
        name: `باقة اختبار ${runId}`,
        sort: 999,
        highlights: ['ميزة اختبار أولى', 'ميزة اختبار ثانية'],
        rooms: [
          {
            key: 'kitchen',
            items: [{ productId: inStockFridgeId, qty: 1 }],
          },
          {
            key: 'laundry',
            items: [{ productId: inStockWasherId, qty: 1 }],
          },
        ],
      },
    })
    testTierId = tier.id
  })

  afterAll(async () => {
    if (prisma) {
      if (createdListTokens.length > 0) {
        await prisma.bridalList.deleteMany({
          where: {
            OR: [
              { editToken: { in: createdListTokens } },
              { shareToken: { in: createdListTokens } },
            ],
          },
        })
      }

      if (testTierId) {
        await prisma.bridalTier.deleteMany({
          where: { id: testTierId },
        })
      }

      if (createdProductIds.length > 0) {
        await prisma.productImage.deleteMany({
          where: { productId: { in: createdProductIds } },
        })
        await prisma.product.deleteMany({
          where: { id: { in: createdProductIds } },
        })
      }
    }

    if (app) {
      await app.close()
    }
  })

  // ==========================================================================
  // 1. GET /api/bridal/tiers
  // ==========================================================================
  describe('GET /api/bridal/tiers', () => {
    it('returns tiers list with totals, counts, and highlights for available items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bridal/tiers')
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.tiers)).toBe(true)

      const ourTier = res.body.tiers.find(
        (t: BridalTierSummary) => t.id === testTierId,
      )
      expect(ourTier).toBeDefined()
      expect(ourTier.slug).toBe(`test-tier-${runId}`)
      expect(ourTier.highlights).toEqual(['ميزة اختبار أولى', 'ميزة اختبار ثانية'])
      expect(ourTier.roomCount).toBe(2) // kitchen and laundry
      expect(ourTier.itemCount).toBe(2) // 1 fridge + 1 washer
      expect(ourTier.total).toBe(3_500_000) // 20,000 + 15,000 = 35,000 EGP in piastres
    })
  })

  // ==========================================================================
  // 2. POST /api/bridal/lists (create from tier)
  // ==========================================================================
  describe('POST /api/bridal/lists (from tier)', () => {
    it('creates a new bridal list copying the tier rooms and returns editToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bridal/lists')
        .set('X-Forwarded-For', nextIp())
        .send({ tierId: testTierId })

      expect(res.status).toBe(201)
      expect(typeof res.body.editToken).toBe('string')
      expect(res.body.editToken.length).toBeGreaterThanOrEqual(20)

      createdListTokens.push(res.body.editToken)

      // Fetch the created list using editToken
      const getRes = await request(app.getHttpServer())
        .get(`/api/bridal/lists/${res.body.editToken}`)
        .set('X-Forwarded-For', nextIp())

      expect(getRes.status).toBe(200)
      const data: BridalListView = getRes.body
      expect(data.mode).toBe('edit')
      expect(data.editToken).toBe(res.body.editToken)
      expect(data.shareToken).toBeDefined()
      createdListTokens.push(data.shareToken)
      expect(data.status).toBe('draft')
      expect(data.tier).toBeDefined()
      expect(data.tier?.id).toBe(testTierId)
      expect(data.tier?.total).toBe(3_500_000)
      expect(data.itemCount).toBe(2)
      expect(data.total).toBe(3_500_000)
      expect(data.rooms).toHaveLength(2)
      expect(data.rooms.map((r) => r.key)).toEqual(['kitchen', 'laundry'])
    })

    it('returns 404 if tier does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bridal/lists')
        .set('X-Forwarded-For', nextIp())
        .send({ tierId: 'non-existent-tier-id' })

      expect(res.status).toBe(404)
      expect(res.body.message).toContain('الباقة مش موجودة')
    })
  })

  // ==========================================================================
  // 3. POST /api/bridal/lists (create from product)
  // ==========================================================================
  describe('POST /api/bridal/lists (from product)', () => {
    it('creates a new bridal list placing the product into its category room', async () => {
      // inStockFridgeId has category 'refrigerators' -> mapped to 'kitchen'
      const res = await request(app.getHttpServer())
        .post('/api/bridal/lists')
        .set('X-Forwarded-For', nextIp())
        .send({ productId: inStockFridgeId })

      expect(res.status).toBe(201)
      createdListTokens.push(res.body.editToken)

      const getRes = await request(app.getHttpServer())
        .get(`/api/bridal/lists/${res.body.editToken}`)
        .set('X-Forwarded-For', nextIp())

      expect(getRes.status).toBe(200)
      const data: BridalListView = getRes.body
      expect(data.mode).toBe('edit')
      expect(data.tier).toBeNull()
      expect(data.itemCount).toBe(1)
      expect(data.total).toBe(2_000_000)
      expect(data.rooms).toHaveLength(1)
      expect(data.rooms[0]?.key).toBe('kitchen')
      expect(data.rooms[0]?.items[0]?.productId).toBe(inStockFridgeId)
      expect(data.rooms[0]?.items[0]?.qty).toBe(1)
    })

    it('returns 404 if product is archived or hidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bridal/lists')
        .set('X-Forwarded-For', nextIp())
        .send({ productId: hiddenWasherId })

      expect(res.status).toBe(404)
      expect(res.body.message).toContain('المنتج مش موجود')
    })
  })

  // ==========================================================================
  // 4. GET /api/bridal/lists/:token (edit mode vs share mode)
  // ==========================================================================
  describe('GET /api/bridal/lists/:token', () => {
    let editToken = ''
    let shareToken = ''

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bridal/lists')
        .set('X-Forwarded-For', nextIp())
        .send({ tierId: testTierId })
      editToken = res.body.editToken
      createdListTokens.push(editToken)

      const getRes = await request(app.getHttpServer())
        .get(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
      shareToken = getRes.body.shareToken
      createdListTokens.push(shareToken)
    })

    it('returns mode edit and includes editToken when called with editToken', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toBe('no-store')
      expect(res.body.mode).toBe('edit')
      expect(res.body.editToken).toBe(editToken)
      expect(res.body.shareToken).toBe(shareToken)
    })

    it('returns mode view and completely omits editToken when called with shareToken', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/bridal/lists/${shareToken}`)
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toBe('no-store')
      expect(res.body.mode).toBe('view')
      expect(res.body.shareToken).toBe(shareToken)
      expect('editToken' in res.body).toBe(false)
      expect(res.body.editToken).toBeUndefined()
    })

    it('returns 404 for unknown token', async () => {
      const randomToken = nanoid(32)
      const res = await request(app.getHttpServer())
        .get(`/api/bridal/lists/${randomToken}`)
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(404)
      expect(res.body.message).toContain('القايمة دي مش موجودة')
    })
  })

  // ==========================================================================
  // 5. PATCH /api/bridal/lists/:token (security and validation)
  // ==========================================================================
  describe('PATCH /api/bridal/lists/:token', () => {
    let editToken = ''
    let shareToken = ''

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bridal/lists')
        .set('X-Forwarded-For', nextIp())
        .send({})
      editToken = res.body.editToken
      createdListTokens.push(editToken)

      const getRes = await request(app.getHttpServer())
        .get(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
      shareToken = getRes.body.shareToken
      createdListTokens.push(shareToken)
    })

    it('rejects PATCH with share token with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bridal/lists/${shareToken}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: inStockFridgeId, qty: 1 }],
            },
          ],
        })

      expect(res.status).toBe(403)
      expect(res.body.message).toContain('اللينك ده للعرض بس')
    })

    it('rejects invalid room key with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          rooms: [
            {
              key: 'garage',
              items: [{ productId: inStockFridgeId, qty: 1 }],
            },
          ],
        })

      expect(res.status).toBe(400)
    })

    it('rejects quantity 11 with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: inStockFridgeId, qty: 11 }],
            },
          ],
        })

      expect(res.status).toBe(400)
    })

    it('rejects 121 total items with 400', async () => {
      const items40 = Array.from({ length: 40 }, () => ({
        productId: inStockFridgeId,
        qty: 1,
      }))
      const res = await request(app.getHttpServer())
        .patch(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          rooms: [
            { key: 'kitchen', items: items40 },
            { key: 'laundry', items: items40 },
            { key: 'living', items: items40 },
            { key: 'bedrooms', items: [{ productId: inStockWasherId, qty: 1 }] },
          ],
        })

      expect(res.status).toBe(400)
    })

    it('rejects unknown product IDs with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: 'unknown-cuid-1234567890', qty: 1 }],
            },
          ],
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('فيه منتج مش موجود')
    })

    it('saves valid rooms and returns normalized list (duplicates merged)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          rooms: [
            {
              key: 'kitchen',
              items: [
                { productId: inStockFridgeId, qty: 2 },
                { productId: inStockFridgeId, qty: 3 }, // Same product duplicate -> merged to 5
              ],
            },
            {
              key: 'laundry',
              items: [{ productId: inStockWasherId, qty: 1 }],
            },
          ],
        })

      expect(res.status).toBe(200)
      const data: BridalListView = res.body
      expect(data.itemCount).toBe(6) // 5 fridges + 1 washer
      expect(data.total).toBe(5 * 2_000_000 + 1 * 1_500_000) // 11,500,000 piastres

      const kitchen = data.rooms.find((r) => r.key === 'kitchen')
      expect(kitchen).toBeDefined()
      expect(kitchen?.items).toHaveLength(1)
      expect(kitchen?.items[0]?.qty).toBe(5)
      expect(kitchen?.subtotal).toBe(10_000_000)
    })

    it('rejects PATCH with 409 Conflict when status is not draft', async () => {
      // Find list and change status to locked
      await prisma.bridalList.updateMany({
        where: { editToken },
        data: { status: 'locked' },
      })

      const res = await request(app.getHttpServer())
        .patch(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: inStockFridgeId, qty: 1 }],
            },
          ],
        })

      expect(res.status).toBe(409)
      expect(res.body.message).toContain('القايمة اتحجزت ومينفعش تتعدل')

      // Restore status to draft for any remaining tests
      await prisma.bridalList.updateMany({
        where: { editToken },
        data: { status: 'draft' },
      })
    })

    it('excludes unavailable items from total and counts them in issues.unavailable', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bridal/lists/${editToken}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: inStockFridgeId, qty: 1 }], // 20,000 EGP, in stock
            },
            {
              key: 'laundry',
              items: [{ productId: outOfStockWasherId, qty: 1 }], // 10,000 EGP, out of stock (0)
            },
          ],
        })

      expect(res.status).toBe(200)
      const data: BridalListView = res.body
      expect(data.issues.unavailable).toBe(1)
      expect(data.total).toBe(2_000_000) // Only the fridge price

      const laundry = data.rooms.find((r) => r.key === 'laundry')
      expect(laundry?.subtotal).toBe(0)
      expect(laundry?.items[0]?.available).toBe(false)
      expect(laundry?.items[0]?.unitPrice).toBe(1_000_000)
    })
  })

  // ==========================================================================
  // 6. GET /api/bridal/alternatives?productId=
  // ==========================================================================
  describe('GET /api/bridal/alternatives', () => {
    it('returns up to 24 products in the same category excluding the product itself', async () => {
      // inStockFridgeId is in fridgeCategoryId
      const res = await request(app.getHttpServer())
        .get(`/api/bridal/alternatives?productId=${inStockFridgeId}`)
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.items)).toBe(true)

      const items = res.body.items
      // altFridgeId must be present
      const altFound = items.find((i: { productId: string }) => i.productId === altFridgeId)
      expect(altFound).toBeDefined()
      expect(altFound.price).toBe(2_200_000)
      expect(altFound.available).toBe(true)

      // inStockFridgeId (self) must NOT be present
      const selfFound = items.find((i: { productId: string }) => i.productId === inStockFridgeId)
      expect(selfFound).toBeUndefined()

      // Washers must NOT be present (different category)
      const washerFound = items.find(
        (i: { productId: string }) => i.productId === inStockWasherId,
      )
      expect(washerFound).toBeUndefined()
    })

    it('returns 404 for unknown productId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bridal/alternatives?productId=non-existent-product')
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(404)
      expect(res.body.message).toContain('المنتج مش موجود')
    })
  })
})
