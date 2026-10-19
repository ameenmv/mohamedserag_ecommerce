import { randomUUID } from 'node:crypto'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OrderPaymentsService } from '../src/admin-orders/order-payments.service.js'
import { OrderStatusService } from '../src/admin-orders/order-status.service.js'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Coupons API E2E (/api/cart/quote, /api/orders)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService
  let orderStatusService: OrderStatusService
  let orderPaymentsService: OrderPaymentsService

  const runId = nanoid(8).toLowerCase()

  let catAId = ''
  let catBId = ''
  let brandAId = ''
  let brandBId = ''

  let eligibleProdId = ''
  let flashProdId = ''
  let oldPriceProdId = ''
  let catBProdId = ''
  let brandBProdId = ''
  let smallProdId = ''

  let flashSaleId = ''

  const eligiblePrice = 100_000 // 1,000 EGP
  const flashRegularPrice = 200_000 // 2,000 EGP
  const flashSalePrice = 150_000 // 1,500 EGP
  const oldPriceProdPrice = 50_000 // 500 EGP (oldPrice = 800 EGP)
  const smallPrice = 5_000 // 50 EGP

  const createdOrderIds: string[] = []
  const createdCouponIds: string[] = []
  const createdProductIds: string[] = []

  let ipCounter = 2000
  const nextIp = () => `10.2.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)
    orderStatusService = app.get(OrderStatusService)
    orderPaymentsService = app.get(OrderPaymentsService)

    // Ensure test categories and brands exist
    const catA = await prisma.category.create({
      data: {
        name: `فئة أ ${runId}`,
        slug: `cat-a-${runId}`,
        sort: 100,
      },
    })
    catAId = catA.id

    const catB = await prisma.category.create({
      data: {
        name: `فئة ب ${runId}`,
        slug: `cat-b-${runId}`,
        sort: 101,
      },
    })
    catBId = catB.id

    const brandA = await prisma.brand.create({
      data: {
        name: `ماركة أ ${runId}`,
        slug: `brand-a-${runId}`,
        sort: 100,
      },
    })
    brandAId = brandA.id

    const brandB = await prisma.brand.create({
      data: {
        name: `ماركة ب ${runId}`,
        slug: `brand-b-${runId}`,
        sort: 101,
      },
    })
    brandBId = brandB.id

    // 1. Eligible product (Cat A, Brand A, no old price, no flash sale)
    const p1 = await prisma.product.create({
      data: {
        modelCode: `PROD-${runId}-1`,
        slug: `prod-${runId}-1`,
        name: `منتج مؤهل ${runId}`,
        categoryId: catAId,
        brandId: brandAId,
        price: eligiblePrice,
        stock: 50,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    eligibleProdId = p1.id
    createdProductIds.push(p1.id)

    // 2. Product on active flash sale (Cat A, Brand A)
    const p2 = await prisma.product.create({
      data: {
        modelCode: `PROD-${runId}-2`,
        slug: `prod-${runId}-2`,
        name: `منتج فلاش ${runId}`,
        categoryId: catAId,
        brandId: brandAId,
        price: flashRegularPrice,
        stock: 50,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    flashProdId = p2.id
    createdProductIds.push(p2.id)

    const now = Date.now()
    const fs = await prisma.flashSale.create({
      data: {
        name: `عرض فلاش اختبار ${runId}`,
        startsAt: new Date(now - 3600_000), // started 1h ago
        endsAt: new Date(now + 3600_000), // ends in 1h
        items: {
          create: [{ productId: flashProdId, salePrice: flashSalePrice }],
        },
      },
    })
    flashSaleId = fs.id

    // 3. Product with old-price discount (Cat A, Brand A)
    const p3 = await prisma.product.create({
      data: {
        modelCode: `PROD-${runId}-3`,
        slug: `prod-${runId}-3`,
        name: `منتج تخفيض قديم ${runId}`,
        categoryId: catAId,
        brandId: brandAId,
        price: oldPriceProdPrice,
        oldPrice: 80_000,
        stock: 50,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    oldPriceProdId = p3.id
    createdProductIds.push(p3.id)

    // 4. Product with Cat B, Brand A
    const p4 = await prisma.product.create({
      data: {
        modelCode: `PROD-${runId}-4`,
        slug: `prod-${runId}-4`,
        name: `منتج فئة ب ${runId}`,
        categoryId: catBId,
        brandId: brandAId,
        price: 60_000,
        stock: 50,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    catBProdId = p4.id
    createdProductIds.push(p4.id)

    // 5. Product with Cat A, Brand B
    const p5 = await prisma.product.create({
      data: {
        modelCode: `PROD-${runId}-5`,
        slug: `prod-${runId}-5`,
        name: `منتج ماركة ب ${runId}`,
        categoryId: catAId,
        brandId: brandBId,
        price: 70_000,
        stock: 50,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    brandBProdId = p5.id
    createdProductIds.push(p5.id)

    // 6. Small eligible product for capping tests
    const p6 = await prisma.product.create({
      data: {
        modelCode: `PROD-${runId}-6`,
        slug: `prod-${runId}-6`,
        name: `منتج صغير ${runId}`,
        categoryId: catAId,
        brandId: brandAId,
        price: smallPrice,
        stock: 50,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    smallProdId = p6.id
    createdProductIds.push(p6.id)
  })

  afterAll(async () => {
    if (prisma) {
      if (createdOrderIds.length > 0) {
        await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } })
        await prisma.stockMovement.deleteMany({ where: { orderId: { in: createdOrderIds } } })
        await prisma.couponRedemption.deleteMany({ where: { orderId: { in: createdOrderIds } } })
        await prisma.orderEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } })
        await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } })
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
      }

      if (createdCouponIds.length > 0) {
        await prisma.couponRedemption.deleteMany({ where: { couponId: { in: createdCouponIds } } })
        await prisma.coupon.deleteMany({ where: { id: { in: createdCouponIds } } })
      }

      if (flashSaleId) {
        await prisma.flashSaleItem.deleteMany({ where: { flashSaleId } })
        await prisma.flashSale.deleteMany({ where: { id: flashSaleId } })
      }

      if (createdProductIds.length > 0) {
        await prisma.productImage.deleteMany({ where: { productId: { in: createdProductIds } } })
        await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
      }

      const catIds = [catAId, catBId].filter(Boolean)
      if (catIds.length > 0) {
        await prisma.category.deleteMany({ where: { id: { in: catIds } } })
      }

      const brandIds = [brandAId, brandBId].filter(Boolean)
      if (brandIds.length > 0) {
        await prisma.brand.deleteMany({ where: { id: { in: brandIds } } })
      }
    }

    if (app) {
      await app.close()
    }
  })

  // ==========================================================================
  // 1. Percent on eligible items only (flash sale & old-price excluded)
  // ==========================================================================
  it('applies percent discount ONLY on eligible items, excluding flash sale and old-price items', async () => {
    const couponCode = `PCT_${nanoid(6).toUpperCase()}`
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        type: 'percent',
        value: 10, // 10%
        active: true,
      },
    })
    createdCouponIds.push(coupon.id)

    // Cart contains:
    // - eligibleProd (100,000)
    // - flashProd (effective price 150,000, struck-through 200,000)
    // - oldPriceProd (50,000, oldPrice 80,000)
    const res = await request(app.getHttpServer())
      .post('/api/cart/quote')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [
          { productId: eligibleProdId, qty: 1 },
          { productId: flashProdId, qty: 1 },
          { productId: oldPriceProdId, qty: 1 },
        ],
        couponCode,
      })
      .expect(200)

    // Subtotal = 100,000 + 150,000 + 50,000 = 300,000
    // Eligible subtotal = only eligibleProdId = 100,000
    // Discount = 10% of 100,000 = 10,000 piastres (100 EGP)
    expect(res.body.subtotal).toBe(300_000)
    expect(res.body.coupon).toEqual({
      code: couponCode,
      status: 'applied',
      discount: 10_000,
      reason: null,
      reasonCode: null,
      minOrder: null,
    })
    expect(res.body.discount).toBe(10_000)
    expect(res.body.total).toBe(290_000)
  })

  // ==========================================================================
  // 2. Fixed capped at eligible subtotal
  // ==========================================================================
  it('caps fixed coupon discount at the eligible subtotal when discount exceeds subtotal', async () => {
    const couponCode = `FIXED_${nanoid(6).toUpperCase()}`
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        type: 'fixed',
        value: 100_000, // 1,000 EGP fixed discount
        active: true,
      },
    })
    createdCouponIds.push(coupon.id)

    // Cart with only smallProdId (5,000 piastres)
    const res = await request(app.getHttpServer())
      .post('/api/cart/quote')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: smallProdId, qty: 1 }],
        couponCode,
      })
      .expect(200)

    expect(res.body.subtotal).toBe(5_000)
    expect(res.body.coupon).toEqual({
      code: couponCode,
      status: 'applied',
      discount: 5_000, // Capped at 5,000
      reason: null,
      reasonCode: null,
      minOrder: null,
    })
    expect(res.body.discount).toBe(5_000)
    expect(res.body.total).toBe(0)
  })

  // ==========================================================================
  // 3. Minimum order requirement with formatted Arabic message
  // ==========================================================================
  it('rejects coupon with min_order reason containing formatted Egyptian pound amount when below threshold', async () => {
    const couponCode = `MIN_${nanoid(6).toUpperCase()}`
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        type: 'percent',
        value: 10,
        minOrder: 500_000, // 5,000 EGP
        active: true,
      },
    })
    createdCouponIds.push(coupon.id)

    // Cart with eligible subtotal 100,000 (< 500,000)
    const res = await request(app.getHttpServer())
      .post('/api/cart/quote')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        couponCode,
      })
      .expect(200)

    expect(res.body.coupon).toEqual({
      code: couponCode,
      status: 'rejected',
      discount: 0,
      reason: 'الحد الأدنى للطلب 5,000 ج.م',
      reasonCode: 'min_order',
      minOrder: 500_000,
    })
    expect(res.body.discount).toBe(0)
  })

  // ==========================================================================
  // 4. Coupon dates & active flag (not started, expired, inactive)
  // ==========================================================================
  describe('coupon dates and active state', () => {
    it('rejects not-started coupon with not_started reason', async () => {
      const code = `NOTYET_${nanoid(6).toUpperCase()}`
      const coupon = await prisma.coupon.create({
        data: {
          code,
          type: 'percent',
          value: 10,
          startsAt: new Date(Date.now() + 86400_000), // starts tomorrow
          active: true,
        },
      })
      createdCouponIds.push(coupon.id)

      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: eligibleProdId, qty: 1 }],
          couponCode: code,
        })
        .expect(200)

      expect(res.body.coupon).toEqual({
        code,
        status: 'rejected',
        discount: 0,
        reason: 'الكود لسه مبدأش',
        reasonCode: 'not_started',
        minOrder: null,
      })
    })

    it('rejects expired coupon with expired reason', async () => {
      const code = `EXPIRED_${nanoid(6).toUpperCase()}`
      const coupon = await prisma.coupon.create({
        data: {
          code,
          type: 'percent',
          value: 10,
          startsAt: new Date(Date.now() - 172800_000),
          endsAt: new Date(Date.now() - 86400_000), // ended yesterday
          active: true,
        },
      })
      createdCouponIds.push(coupon.id)

      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: eligibleProdId, qty: 1 }],
          couponCode: code,
        })
        .expect(200)

      expect(res.body.coupon).toEqual({
        code,
        status: 'rejected',
        discount: 0,
        reason: 'الكود انتهى',
        reasonCode: 'expired',
        minOrder: null,
      })
    })

    it('rejects inactive coupon with expired reason', async () => {
      const code = `INACTIVE_${nanoid(6).toUpperCase()}`
      const coupon = await prisma.coupon.create({
        data: {
          code,
          type: 'percent',
          value: 10,
          active: false,
        },
      })
      createdCouponIds.push(coupon.id)

      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: eligibleProdId, qty: 1 }],
          couponCode: code,
        })
        .expect(200)

      expect(res.body.coupon).toEqual({
        code,
        status: 'rejected',
        discount: 0,
        reason: 'الكود انتهى',
        reasonCode: 'expired',
        minOrder: null,
      })
    })
  })

  // ==========================================================================
  // 5. Unknown coupon code (not_found)
  // ==========================================================================
  it('rejects unknown coupon code with not_found reason', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/quote')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        couponCode: 'DOES_NOT_EXIST_999',
      })
      .expect(200)

    expect(res.body.coupon).toEqual({
      code: 'DOES_NOT_EXIST_999',
      status: 'rejected',
      discount: 0,
      reason: 'الكود ده مش موجود',
      reasonCode: 'not_found',
      minOrder: null,
    })
  })

  // ==========================================================================
  // 6. Category scope and brand scope (AND logic)
  // ==========================================================================
  describe('category and brand scope', () => {
    it('requires item to match BOTH category and brand when both scopes are specified', async () => {
      const code = `SCOPE_${nanoid(6).toUpperCase()}`
      const coupon = await prisma.coupon.create({
        data: {
          code,
          type: 'percent',
          value: 10,
          categoryIds: [catAId],
          brandIds: [brandAId],
          active: true,
        },
      })
      createdCouponIds.push(coupon.id)

      // A: Item matches Cat B, Brand A -> fails category scope
      const resA = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: catBProdId, qty: 1 }],
          couponCode: code,
        })
        .expect(200)

      expect(resA.body.coupon).toEqual({
        code,
        status: 'rejected',
        discount: 0,
        reason: 'الكود ده مش على المنتجات اللي في السلة',
        reasonCode: 'no_eligible',
        minOrder: null,
      })

      // B: Item matches Cat A, Brand B -> fails brand scope
      const resB = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: brandBProdId, qty: 1 }],
          couponCode: code,
        })
        .expect(200)

      expect(resB.body.coupon).toEqual({
        code,
        status: 'rejected',
        discount: 0,
        reason: 'الكود ده مش على المنتجات اللي في السلة',
        reasonCode: 'no_eligible',
        minOrder: null,
      })

      // C: Item matches Cat A and Brand A -> passes both!
      const resC = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: eligibleProdId, qty: 1 }],
          couponCode: code,
        })
        .expect(200)

      expect(resC.body.coupon).toEqual({
        code,
        status: 'applied',
        discount: 10_000,
        reason: null,
        reasonCode: null,
        minOrder: null,
      })
    })
  })

  // ==========================================================================
  // 7. Order placement records couponId, discount, and CouponRedemption
  // ==========================================================================
  it('records couponId, discount, and active CouponRedemption row on order placement', async () => {
    const code = `ORDER_${nanoid(6).toUpperCase()}`
    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: 'percent',
        value: 10,
        active: true,
      },
    })
    createdCouponIds.push(coupon.id)

    // subtotal = 100,000, discount = 10,000, deliveryFee = 10,000 (الدقهلية/المنصورة) -> total = 100,000
    const expectedTotal = 100_000
    const key = `idem_${randomUUID().replace(/-/g, '')}`
    const phone = '01011112222'

    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        customer: {
          name: 'عميل طلب كوبون',
          phone,
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع المشاية السفلية',
        },
        paymentMethod: 'cod',
        couponCode: code,
        idempotencyKey: key,
        expectedTotal,
      })
      .expect(201)

    expect(res.body.total).toBe(expectedTotal)

    const orderInDb = await prisma.order.findUnique({
      where: { no: res.body.no },
      include: { couponRedemptions: true },
    })
    expect(orderInDb).toBeDefined()
    if (orderInDb) {
      createdOrderIds.push(orderInDb.id)
      expect(orderInDb.couponId).toBe(coupon.id)
      expect(orderInDb.discount).toBe(10_000)
      expect(orderInDb.couponRedemptions.length).toBe(1)
      const redemption = orderInDb.couponRedemptions[0]
      expect(redemption?.couponId).toBe(coupon.id)
      expect(redemption?.customerPhone).toBe('01011112222')
      expect(redemption?.amount).toBe(10_000)
      expect(redemption?.status).toBe('active')
    }
  })

  // ==========================================================================
  // 8. Total usage limit 1 under parallel order placement
  // ==========================================================================
  it('enforces total maxUses limit safely under concurrent order placements (exactly one winner, loser gets 409 COUPON_REJECTED)', async () => {
    const code = `CONCUR_${nanoid(6).toUpperCase()}`
    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: 'percent',
        value: 10,
        maxUses: 1, // Strictly one use
        active: true,
      },
    })
    createdCouponIds.push(coupon.id)

    const expectedTotal = 100_000

    const makePayload = (phone: string, key: string) => ({
      items: [{ productId: eligibleProdId, qty: 1 }],
      customer: {
        name: `متسابق ${phone}`,
        phone,
        governorate: 'الدقهلية',
        city: 'المنصورة',
        address: 'شارع البحر',
      },
      paymentMethod: 'cod',
      couponCode: code,
      idempotencyKey: key,
      expectedTotal,
    })

    const payloadA = makePayload('01012341111', `race_${randomUUID().replace(/-/g, '')}`)
    const payloadB = makePayload('01012342222', `race_${randomUUID().replace(/-/g, '')}`)

    // Execute concurrently
    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send(payloadA),
      request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send(payloadB),
    ])

    const statuses = [resA.status, resB.status]
    expect(statuses).toContain(201)
    expect(statuses).toContain(409)

    const successRes = resA.status === 201 ? resA : resB
    const rejectedRes = resA.status === 409 ? resA : resB

    // Winner gets order created
    const winnerOrder = await prisma.order.findUnique({
      where: { no: successRes.body.no },
    })
    expect(winnerOrder?.couponId).toBe(coupon.id)
    if (winnerOrder) {
      createdOrderIds.push(winnerOrder.id)
    }

    // Loser gets COUPON_REJECTED with reason and quote recomputed without coupon
    expect(rejectedRes.body).toMatchObject({
      code: 'COUPON_REJECTED',
      message: 'الكود ده خلص',
      quote: expect.objectContaining({
        discount: 0,
        total: 110_000, // 100,000 subtotal + 10,000 fee
      }),
    })

    // Exactly 1 active redemption in DB
    const activeCount = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, status: 'active' },
    })
    expect(activeCount).toBe(1)
  })

  // ==========================================================================
  // 9. Per-phone usage limit at order placement
  // ==========================================================================
  it('enforces maxUsesPerPhone limit at order placement', async () => {
    const code = `PHONELIM_${nanoid(6).toUpperCase()}`
    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: 'percent',
        value: 10,
        maxUsesPerPhone: 1, // 1 use per phone
        maxUses: 10,
        active: true,
      },
    })
    createdCouponIds.push(coupon.id)

    const expectedTotal = 100_000
    const phone = '01055556666'

    // First order by this phone succeeds (201)
    const res1 = await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        customer: {
          name: 'عميل نفس الرقم 1',
          phone,
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الجمهورية',
        },
        paymentMethod: 'cod',
        couponCode: code,
        idempotencyKey: `phone_1_${randomUUID().replace(/-/g, '')}`,
        expectedTotal,
      })
      .expect(201)

    const order1 = await prisma.order.findUnique({ where: { no: res1.body.no } })
    if (order1) createdOrderIds.push(order1.id)

    // Second order by same phone gets refused with 409 COUPON_REJECTED
    const res2 = await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        customer: {
          name: 'عميل نفس الرقم 2',
          phone,
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الجمهورية',
        },
        paymentMethod: 'cod',
        couponCode: code,
        idempotencyKey: `phone_2_${randomUUID().replace(/-/g, '')}`,
        expectedTotal,
      })
      .expect(409)

    expect(res2.body).toMatchObject({
      code: 'COUPON_REJECTED',
      message: 'استخدمت الكود ده قبل كده',
      quote: expect.objectContaining({ discount: 0 }),
    })

    // Third order by a DIFFERENT phone succeeds
    const res3 = await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        customer: {
          name: 'عميل رقم مختلف',
          phone: '01077778888',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الجمهورية',
        },
        paymentMethod: 'cod',
        couponCode: code,
        idempotencyKey: `phone_3_${randomUUID().replace(/-/g, '')}`,
        expectedTotal,
      })
      .expect(201)

    const order3 = await prisma.order.findUnique({ where: { no: res3.body.no } })
    if (order3) createdOrderIds.push(order3.id)
  })

  // ==========================================================================
  // 10. Cancellation releases redemption so coupon is usable again
  // ==========================================================================
  it('releases coupon redemption on order cancellation allowing the coupon to be used again', async () => {
    const code = `CANCEL_${nanoid(6).toUpperCase()}`
    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: 'percent',
        value: 10,
        maxUses: 1, // Only 1 use
        active: true,
      },
    })
    createdCouponIds.push(coupon.id)

    const expectedTotal = 100_000

    // 1. Place first order consuming the single use
    const res1 = await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        customer: {
          name: 'عميل الإلغاء 1',
          phone: '01088881111',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع السكة القديمة',
        },
        paymentMethod: 'cod',
        couponCode: code,
        idempotencyKey: `cancel_1_${randomUUID().replace(/-/g, '')}`,
        expectedTotal,
      })
      .expect(201)

    const order1 = await prisma.order.findUniqueOrThrow({ where: { no: res1.body.no } })
    createdOrderIds.push(order1.id)

    // 2. Second order while active fails (409)
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        customer: {
          name: 'عميل الإلغاء 2',
          phone: '01088882222',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع السكة القديمة',
        },
        paymentMethod: 'cod',
        couponCode: code,
        idempotencyKey: `cancel_2_${randomUUID().replace(/-/g, '')}`,
        expectedTotal,
      })
      .expect(409)

    // 3. Cancel the first order
    await orderStatusService.transitionOrder({
      orderId: order1.id,
      to: 'cancelled',
      note: 'إلغاء لاختبار تحرير الكوبون',
    })

    const redemptionAfterCancel = await prisma.couponRedemption.findFirst({
      where: { orderId: order1.id },
    })
    expect(redemptionAfterCancel?.status).toBe('released')

    // 4. Place second order now -> succeeds (201)!
    const res2 = await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        customer: {
          name: 'عميل الإلغاء 2',
          phone: '01088882222',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع السكة القديمة',
        },
        paymentMethod: 'cod',
        couponCode: code,
        idempotencyKey: `cancel_retry_${randomUUID().replace(/-/g, '')}`,
        expectedTotal,
      })
      .expect(201)

    const order2 = await prisma.order.findUniqueOrThrow({ where: { no: res2.body.no } })
    createdOrderIds.push(order2.id)
    expect(order2.couponId).toBe(coupon.id)
  })

  // ==========================================================================
  // 11. Payment reject releases redemption, then confirm re-activates it
  // ==========================================================================
  it('releases redemption when payment is rejected, then restores it to active on confirmation', async () => {
    const code = `PAY_${nanoid(6).toUpperCase()}`
    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: 'percent',
        value: 10,
        maxUses: 1,
        active: true,
      },
    })
    createdCouponIds.push(coupon.id)

    const expectedTotal = 100_000

    // 1. Create order with instapay (initial status awaiting_payment)
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: eligibleProdId, qty: 1 }],
        customer: {
          name: 'عميل رفض الدفع',
          phone: '01099990000',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الترعة',
        },
        paymentMethod: 'instapay',
        couponCode: code,
        idempotencyKey: `pay_flow_${randomUUID().replace(/-/g, '')}`,
        expectedTotal,
      })
      .expect(201)

    const order = await prisma.order.findUniqueOrThrow({ where: { no: res.body.no } })
    createdOrderIds.push(order.id)

    const initialRedemption = await prisma.couponRedemption.findFirst({
      where: { orderId: order.id },
    })
    expect(initialRedemption?.status).toBe('active')

    // 2. Reject the payment -> status becomes payment_rejected -> redemption released
    await orderPaymentsService.reject(order.id, {
      reason: 'تحويل غير مطابق للمبلغ',
    })

    const afterRejectOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(afterRejectOrder.status).toBe('payment_rejected')

    const redemptionAfterReject = await prisma.couponRedemption.findFirst({
      where: { orderId: order.id },
    })
    expect(redemptionAfterReject?.status).toBe('released')

    // 3. Confirm the payment later -> status becomes confirmed -> redemption active again
    await orderPaymentsService.confirm(order.id, {
      amount: order.total,
      note: 'تم إرفاق إيصال التحويل الصحيح',
    })

    const afterConfirmOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(afterConfirmOrder.status).toBe('confirmed')

    const redemptionAfterConfirm = await prisma.couponRedemption.findFirst({
      where: { orderId: order.id },
    })
    expect(redemptionAfterConfirm?.status).toBe('active')
  })
})
