import { randomBytes, randomUUID } from 'node:crypto'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { customAlphabet } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

describe('Flash Sale Pricing API E2E (/api/products, /api/search, /api/cart/quote, /api/orders, /api/bridal, /api/offers)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runTag = `fl_${nanoid()}`
  let categoryId = ''
  let categorySlug = ''
  let brandId = ''
  let brandSlug = ''

  let pRunningId = ''
  let pRunningSlug = ''
  let pRunningModel = ''
  let pRunningName = ''

  let pScheduledId = ''
  let pScheduledSlug = ''

  let pEndedId = ''
  let pEndedSlug = ''

  let pDiscountedId = ''
  let pDiscountedSlug = ''

  let pOverlapId = ''

  let runningSaleId = ''
  let scheduledSaleId = ''
  let endedSaleId = ''

  let bridalEditToken = ''
  let bridalListId = ''
  const createdOrderNos: string[] = []

  let ipCounter = 10
  const nextIp = () => `10.0.1.${(ipCounter++ % 250) + 1}`

  const regularPriceRunning = 100_000 // 1,000 EGP
  const salePriceRunning = 70_000 // 700 EGP (30% off)

  const regularPriceScheduled = 200_000 // 2,000 EGP
  const salePriceScheduled = 150_000 // 1,500 EGP

  const regularPriceEnded = 300_000 // 3,000 EGP
  const salePriceEnded = 220_000 // 2,200 EGP

  const regularPriceDiscounted = 400_000 // 4,000 EGP
  const oldPriceDiscounted = 500_000 // 5,000 EGP (20% off)

  const regularPriceOverlap = 150_000 // 1,500 EGP
  const oldPriceOverlap = 200_000 // 2,000 EGP
  const salePriceOverlap = 120_000 // 1,200 EGP

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // 1. Create unique test category and brand
    categorySlug = `flash-cat-${runTag}`
    const category = await prisma.category.create({
      data: {
        name: `قسم عروض فلاش ${runTag}`,
        slug: categorySlug,
        visible: true,
        sort: 100,
      },
    })
    categoryId = category.id

    brandSlug = `flash-brand-${runTag}`
    const brand = await prisma.brand.create({
      data: {
        name: `ماركة فلاش ${runTag}`,
        slug: brandSlug,
        visible: true,
        sort: 100,
      },
    })
    brandId = brand.id

    // 2. Create products
    pRunningModel = `RUN-${runTag}`
    pRunningSlug = `prod-running-${runTag}`
    pRunningName = `ثلاجة عرض جاري ${runTag}`
    const p1 = await prisma.product.create({
      data: {
        modelCode: pRunningModel,
        slug: pRunningSlug,
        name: pRunningName,
        price: regularPriceRunning,
        oldPrice: null,
        stock: 10,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        brandId,
        categoryId,
        searchText: `${pRunningModel} ${pRunningName}`.toLowerCase(),
        images: {
          create: [{ url: `https://example.com/p1-${runTag}.jpg`, sort: 0 }],
        },
      },
    })
    pRunningId = p1.id

    pScheduledSlug = `prod-sched-${runTag}`
    const p2 = await prisma.product.create({
      data: {
        modelCode: `SCHED-${runTag}`,
        slug: pScheduledSlug,
        name: `غسالة عرض مجدول ${runTag}`,
        price: regularPriceScheduled,
        oldPrice: null,
        stock: 10,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        brandId,
        categoryId,
      },
    })
    pScheduledId = p2.id

    pEndedSlug = `prod-ended-${runTag}`
    const p3 = await prisma.product.create({
      data: {
        modelCode: `END-${runTag}`,
        slug: pEndedSlug,
        name: `شاشة عرض منتهي ${runTag}`,
        price: regularPriceEnded,
        oldPrice: null,
        stock: 10,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        brandId,
        categoryId,
      },
    })
    pEndedId = p3.id

    pDiscountedSlug = `prod-disc-${runTag}`
    const p4 = await prisma.product.create({
      data: {
        modelCode: `DISC-${runTag}`,
        slug: pDiscountedSlug,
        name: `بوتاجاز خصم عادي ${runTag}`,
        price: regularPriceDiscounted,
        oldPrice: oldPriceDiscounted,
        stock: 10,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        brandId,
        categoryId,
      },
    })
    pDiscountedId = p4.id

    const p5 = await prisma.product.create({
      data: {
        modelCode: `OVER-${runTag}`,
        slug: `prod-overlap-${runTag}`,
        name: `تكييف عرض وخصم ${runTag}`,
        price: regularPriceOverlap,
        oldPrice: oldPriceOverlap,
        stock: 10,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        brandId,
        categoryId,
      },
    })
    pOverlapId = p5.id

    // 3. Create flash sales: running, scheduled, ended
    const now = new Date()

    const runningSale = await prisma.flashSale.create({
      data: {
        name: `عرض نشط ${runTag}`,
        startsAt: new Date(now.getTime() - 3600_000), // 1 hour ago
        endsAt: new Date(now.getTime() + 3600_000), // 1 hour from now
        items: {
          create: [
            { productId: pRunningId, salePrice: salePriceRunning },
            { productId: pOverlapId, salePrice: salePriceOverlap },
          ],
        },
      },
    })
    runningSaleId = runningSale.id

    const scheduledSale = await prisma.flashSale.create({
      data: {
        name: `عرض مجدول ${runTag}`,
        startsAt: new Date(now.getTime() + 3600_000),
        endsAt: new Date(now.getTime() + 7200_000),
        items: {
          create: [{ productId: pScheduledId, salePrice: salePriceScheduled }],
        },
      },
    })
    scheduledSaleId = scheduledSale.id

    const endedSale = await prisma.flashSale.create({
      data: {
        name: `عرض منتهي ${runTag}`,
        startsAt: new Date(now.getTime() - 7200_000),
        endsAt: new Date(now.getTime() - 3600_000),
        items: {
          create: [{ productId: pEndedId, salePrice: salePriceEnded }],
        },
      },
    })
    endedSaleId = endedSale.id

    // 4. Create bridal list containing pRunning
    bridalEditToken = randomBytes(32).toString('base64url')
    const bridalList = await prisma.bridalList.create({
      data: {
        editToken: bridalEditToken,
        shareToken: randomBytes(32).toString('base64url'),
        status: 'draft',
        rooms: [
          {
            key: 'kitchen',
            items: [{ productId: pRunningId, qty: 1 }],
          },
        ],
      },
    })
    bridalListId = bridalList.id
  })

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (createdOrderNos.length > 0) {
      await prisma.orderEvent.deleteMany({ where: { order: { no: { in: createdOrderNos } } } })
      await prisma.orderItem.deleteMany({ where: { order: { no: { in: createdOrderNos } } } })
      await prisma.order.deleteMany({ where: { no: { in: createdOrderNos } } })
    }

    if (bridalListId) {
      await prisma.bridalList.deleteMany({ where: { id: bridalListId } })
    }

    await prisma.flashSaleItem.deleteMany({
      where: { flashSaleId: { in: [runningSaleId, scheduledSaleId, endedSaleId] } },
    })
    await prisma.flashSale.deleteMany({
      where: { id: { in: [runningSaleId, scheduledSaleId, endedSaleId] } },
    })

    const productIds = [pRunningId, pScheduledId, pEndedId, pDiscountedId, pOverlapId].filter(Boolean)
    if (productIds.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: { in: productIds } } })
      await prisma.product.deleteMany({ where: { id: { in: productIds } } })
    }

    if (categoryId) {
      await prisma.category.deleteMany({ where: { id: categoryId } })
    }
    if (brandId) {
      await prisma.brand.deleteMany({ where: { id: brandId } })
    }

    await app.close()
  })

  describe('GET /api/products (catalog listing and IDs branch)', () => {
    it('applies flash pricing to running sale product, and keeps regular prices for scheduled and ended sales', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products?category=${categorySlug}`)
        .expect(200)

      const runningCard = res.body.items.find((item: { id: string }) => item.id === pRunningId)
      expect(runningCard).toBeDefined()
      expect(runningCard.price).toBe(salePriceRunning) // 70,000
      expect(runningCard.oldPrice).toBe(regularPriceRunning) // 100,000
      expect(runningCard.discountPercent).toBe(30)
      expect(runningCard.flash).toMatchObject({
        salePrice: salePriceRunning,
        endsAt: expect.any(String),
      })

      const schedCard = res.body.items.find((item: { id: string }) => item.id === pScheduledId)
      expect(schedCard).toBeDefined()
      expect(schedCard.price).toBe(regularPriceScheduled) // 200,000
      expect(schedCard.oldPrice).toBeNull()
      expect(schedCard.discountPercent).toBeNull()
      expect(schedCard.flash).toBeNull()

      const endedCard = res.body.items.find((item: { id: string }) => item.id === pEndedId)
      expect(endedCard).toBeDefined()
      expect(endedCard.price).toBe(regularPriceEnded) // 300,000
      expect(endedCard.oldPrice).toBeNull()
      expect(endedCard.discountPercent).toBeNull()
      expect(endedCard.flash).toBeNull()

      const discCard = res.body.items.find((item: { id: string }) => item.id === pDiscountedId)
      expect(discCard).toBeDefined()
      expect(discCard.price).toBe(regularPriceDiscounted) // 400,000
      expect(discCard.oldPrice).toBe(oldPriceDiscounted) // 500,000
      expect(discCard.discountPercent).toBe(20)
      expect(discCard.flash).toBeNull()
    })

    it('applies flash pricing in the ?ids= branch (wishlist/compare)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products?ids=${pRunningId},${pScheduledId},${pEndedId}`)
        .expect(200)

      expect(res.body.items).toHaveLength(3)
      const runningCard = res.body.items[0]
      expect(runningCard.id).toBe(pRunningId)
      expect(runningCard.price).toBe(salePriceRunning)
      expect(runningCard.oldPrice).toBe(regularPriceRunning)
      expect(runningCard.discountPercent).toBe(30)
      expect(runningCard.flash?.salePrice).toBe(salePriceRunning)

      const schedCard = res.body.items[1]
      expect(schedCard.id).toBe(pScheduledId)
      expect(schedCard.price).toBe(regularPriceScheduled)
      expect(schedCard.flash).toBeNull()
    })
  })

  describe('GET /api/products/:slug', () => {
    it('returns flash pricing and flash object on running sale product detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products/${pRunningSlug}`)
        .expect(200)

      expect(res.body.id).toBe(pRunningId)
      expect(res.body.price).toBe(salePriceRunning)
      expect(res.body.oldPrice).toBe(regularPriceRunning)
      expect(res.body.discountPercent).toBe(30)
      expect(res.body.flash).toMatchObject({
        salePrice: salePriceRunning,
        endsAt: expect.any(String),
      })
    })

    it('returns regular price and null flash for scheduled or ended sale product detail', async () => {
      const resSched = await request(app.getHttpServer())
        .get(`/api/products/${pScheduledSlug}`)
        .expect(200)
      expect(resSched.body.price).toBe(regularPriceScheduled)
      expect(resSched.body.flash).toBeNull()

      const resEnded = await request(app.getHttpServer())
        .get(`/api/products/${pEndedSlug}`)
        .expect(200)
      expect(resEnded.body.price).toBe(regularPriceEnded)
      expect(resEnded.body.flash).toBeNull()
    })
  })

  describe('GET /api/search', () => {
    it('returns flash pricing on search dropdown card for active sale item', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/search?q=${encodeURIComponent(pRunningModel)}`)
        .expect(200)

      const card = res.body.items.find((item: { id: string }) => item.id === pRunningId)
      expect(card).toBeDefined()
      expect(card.price).toBe(salePriceRunning)
      expect(card.oldPrice).toBe(regularPriceRunning)
      expect(card.discountPercent).toBe(30)
      expect(card.flash).toMatchObject({
        salePrice: salePriceRunning,
        endsAt: expect.any(String),
      })
    })
  })

  describe('POST /api/cart/quote', () => {
    it('uses the flash sale price as effective unit price for the line', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: pRunningId, qty: 1 }],
          governorate: 'الدقهلية',
          city: 'المنصورة',
        })
        .expect(200)

      expect(res.body.lines[0]?.unitPrice).toBe(salePriceRunning) // 70,000
      expect(res.body.lines[0]?.lineTotal).toBe(salePriceRunning)
      expect(res.body.subtotal).toBe(salePriceRunning)
      expect(res.body.total).toBe(salePriceRunning + res.body.deliveryFee)
    })
  })

  describe('POST /api/orders', () => {
    it('locks the order line at the flash sale price', async () => {
      const idempotencyKey = randomUUID()
      // Delivery fee in Mansoura is 10,000 piastres (100 EGP)
      const expectedTotal = salePriceRunning + 10_000

      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: pRunningId, qty: 1 }],
          customer: {
            name: 'مشترى عرض فلاش',
            phone: '01011112222',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع الجلاء، المنصورة',
          },
          paymentMethod: 'cod',
          idempotencyKey,
          expectedTotal,
        })
        .expect(201)

      expect(res.body.no).toBeDefined()
      createdOrderNos.push(res.body.no)

      const savedOrder = await prisma.order.findUnique({
        where: { no: res.body.no },
        include: { items: true },
      })

      expect(savedOrder).toBeDefined()
      expect(savedOrder?.subtotal).toBe(salePriceRunning)
      expect(savedOrder?.total).toBe(expectedTotal)
      expect(savedOrder?.items[0]?.unitPrice).toBe(salePriceRunning)
    })
  })

  describe('Bridal reserve quote uses regular price', () => {
    it('uses the regular catalog price for bridal quote even if the item is in an active flash sale', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/bridal/reserve-quote/${bridalEditToken}`)
        .query({ governorate: 'الدقهلية', city: 'المنصورة' })
        .expect(200)

      // Bridal locks regular prices: the running flash price must not leak in.
      expect(res.body.subtotal).toBe(regularPriceRunning)

      const view = await request(app.getHttpServer()).get(`/api/bridal/lists/${bridalEditToken}`).expect(200)
      expect(view.body.rooms[0]?.items[0]?.unitPrice).toBe(regularPriceRunning)
    })
  })

  describe('GET /api/offers', () => {
    it('returns running flash sale groups with products, and lists non-flash discounted products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/offers')
        .expect(200)

      // Caching header
      expect(res.headers['cache-control']).toBeDefined()

      // Flash section
      expect(res.body.flash).toBeInstanceOf(Array)
      const activeGroup = res.body.flash.find((g: { id: string }) => g.id === runningSaleId)
      expect(activeGroup).toBeDefined()
      expect(activeGroup.name).toBe(`عرض نشط ${runTag}`)
      expect(activeGroup.endsAt).toBeDefined()

      const activeProductCard = activeGroup.products.find((p: { id: string }) => p.id === pRunningId)
      expect(activeProductCard).toBeDefined()
      expect(activeProductCard.price).toBe(salePriceRunning)
      expect(activeProductCard.oldPrice).toBe(regularPriceRunning)
      expect(activeProductCard.discountPercent).toBe(30)
      expect(activeProductCard.flash?.salePrice).toBe(salePriceRunning)

      // Scheduled and ended sales should NOT be in the flash groups
      const schedGroup = res.body.flash.find((g: { id: string }) => g.id === scheduledSaleId)
      expect(schedGroup).toBeUndefined()
      const endedGroup = res.body.flash.find((g: { id: string }) => g.id === endedSaleId)
      expect(endedGroup).toBeUndefined()

      // Discounted section
      expect(res.body.discounted).toBeInstanceOf(Array)
      const discountedItem = res.body.discounted.find((p: { id: string }) => p.id === pDiscountedId)
      expect(discountedItem).toBeDefined()
      expect(discountedItem.price).toBe(regularPriceDiscounted)
      expect(discountedItem.oldPrice).toBe(oldPriceDiscounted)
      expect(discountedItem.flash).toBeNull()

      // Product that has oldPrice BUT is in the active flash sale must NOT be listed under discounted
      const overlapItem = res.body.discounted.find((p: { id: string }) => p.id === pOverlapId)
      expect(overlapItem).toBeUndefined()
    })
  })
})
