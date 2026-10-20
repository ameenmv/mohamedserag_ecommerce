import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Orders and Cart API E2E (/api/cart, /api/orders)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  let inStockProductId = ''
  let outOfStockProductId = ''
  let lowStockProductId = ''
  let expensiveProductId = ''

  const inStockPrice = 500_000 // 5,000 EGP
  const outOfStockPrice = 300_000 // 3,000 EGP
  const lowStockPrice = 200_000 // 2,000 EGP
  const expensivePrice = 3_500_000 // 35,000 EGP

  const createdOrderNos: string[] = []
  let ipCounter = 1
  const nextIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // Ensure a category and a brand exist
    const category = await prisma.category.findFirst({ orderBy: { sort: 'asc' } })
    if (!category) throw new Error('No category found in test database')

    const brand = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!brand) throw new Error('No brand found in test database')

    // 1. In-stock product
    const p1 = await prisma.product.create({
      data: {
        modelCode: `TEST-${runId}-1`,
        slug: `test-${runId}-1`,
        name: `ثلاجة اختبار ${runId}`,
        brandId: brand.id,
        categoryId: category.id,
        price: inStockPrice,
        stock: 10,
        lowStockThreshold: 3,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
        images: {
          create: [{ url: `https://example.com/test-${runId}-1.jpg`, sort: 0 }],
        },
      },
    })
    inStockProductId = p1.id

    // 2. Out-of-stock product
    const p2 = await prisma.product.create({
      data: {
        modelCode: `TEST-${runId}-2`,
        slug: `test-${runId}-2`,
        name: `غسالة نافذة ${runId}`,
        brandId: brand.id,
        categoryId: category.id,
        price: outOfStockPrice,
        stock: 0,
        lowStockThreshold: 3,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    outOfStockProductId = p2.id

    // 3. Low-stock product
    const p3 = await prisma.product.create({
      data: {
        modelCode: `TEST-${runId}-3`,
        slug: `test-${runId}-3`,
        name: `شاشة كمية محدودة ${runId}`,
        brandId: brand.id,
        categoryId: category.id,
        price: lowStockPrice,
        stock: 2,
        lowStockThreshold: 3,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    lowStockProductId = p3.id

    // 4. Expensive product (for big COD deposit tests)
    const p4 = await prisma.product.create({
      data: {
        modelCode: `TEST-${runId}-4`,
        slug: `test-${runId}-4`,
        name: `تكييف مركزي غالي ${runId}`,
        brandId: brand.id,
        categoryId: category.id,
        price: expensivePrice,
        stock: 5,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    expensiveProductId = p4.id
  })

  afterAll(async () => {
    if (prisma) {
      if (createdOrderNos.length > 0) {
        const orders = await prisma.order.findMany({
          where: { no: { in: createdOrderNos } },
          select: { id: true },
        })
        const orderIds = orders.map((o) => o.id)
        if (orderIds.length > 0) {
          await prisma.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } })
          await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
          await prisma.order.deleteMany({ where: { id: { in: orderIds } } })
        }
      }

      const productIds = [
        inStockProductId,
        outOfStockProductId,
        lowStockProductId,
        expensiveProductId,
      ].filter(Boolean)
      if (productIds.length > 0) {
        await prisma.productImage.deleteMany({ where: { productId: { in: productIds } } })
        await prisma.product.deleteMany({ where: { id: { in: productIds } } })
      }
    }

    if (app) {
      await app.close()
    }
  })

  // ==========================================================================
  // A. POST /api/cart/quote
  // ==========================================================================
  describe('POST /api/cart/quote', () => {
    it('re-prices from the database (ignores client price) and returns image and issues', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1, knownPrice: 100 }],
          governorate: 'الدقهلية',
          city: 'المنصورة',
        })
        .expect(200)

      expect(res.body.lines).toHaveLength(1)
      const line = res.body.lines[0]
      expect(line.productId).toBe(inStockProductId)
      expect(line.unitPrice).toBe(inStockPrice) // 500,000, NOT 100
      expect(line.previousPrice).toBe(100)
      expect(line.issues).toContain('price_changed')
      expect(line.imageUrl).toContain(`test-${runId}-1.jpg`)
      expect(res.body.subtotal).toBe(inStockPrice)
      expect(res.body.hasBlockingIssues).toBe(true)
    })

    it('calculates zone delivery fees: Mansoura = 10000, other Dakahlia = 15000, Cairo = 40000', async () => {
      // Mansoura
      const resMansoura = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          governorate: 'الدقهلية',
          city: 'المنصورة',
        })
        .expect(200)

      expect(resMansoura.body.zone.fee).toBe(10000)
      expect(resMansoura.body.deliveryFee).toBe(10000)
      expect(resMansoura.body.total).toBe(inStockPrice + 10000)

      // Other Dakahlia city (ميت غمر)
      const resDakahlia = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          governorate: 'الدقهلية',
          city: 'ميت غمر',
        })
        .expect(200)

      expect(resDakahlia.body.zone.fee).toBe(15000)
      expect(resDakahlia.body.deliveryFee).toBe(15000)
      expect(resDakahlia.body.total).toBe(inStockPrice + 15000)

      // Cairo
      const resCairo = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          governorate: 'القاهرة',
          city: 'مدينة نصر',
        })
        .expect(200)

      expect(resCairo.body.zone.fee).toBe(40000)
      expect(resCairo.body.deliveryFee).toBe(40000)
      expect(resCairo.body.total).toBe(inStockPrice + 40000)
    })

    it('flags out-of-stock line as unavailable, sets qty to 0, and excludes it from totals', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: outOfStockProductId, qty: 2 }],
          governorate: 'الدقهلية',
          city: 'المنصورة',
        })
        .expect(200)

      expect(res.body.lines[0]?.issues).toContain('unavailable')
      expect(res.body.lines[0]?.qty).toBe(0)
      expect(res.body.lines[0]?.lineTotal).toBe(0)
      expect(res.body.subtotal).toBe(0)
      expect(res.body.deliveryFee).toBe(0) // No countable lines
      expect(res.body.total).toBe(0)
      expect(res.body.hasBlockingIssues).toBe(true)
    })

    it('caps requested quantity at stock for auto mode', async () => {
      // lowStockProduct has stock: 2
      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: lowStockProductId, qty: 5 }],
        })
        .expect(200)

      expect(res.body.lines[0]?.issues).toContain('qty_capped')
      expect(res.body.lines[0]?.requestedQty).toBe(5)
      expect(res.body.lines[0]?.qty).toBe(2)
      expect(res.body.lines[0]?.lineTotal).toBe(2 * lowStockPrice)
      expect(res.body.subtotal).toBe(400_000)
      expect(res.body.hasBlockingIssues).toBe(true)
    })

    it('shows deposit required for COD order above threshold', async () => {
      // expensiveProduct: 3,500,000 + 10,000 delivery = 3,510,000 piastres (above 3,000,000)
      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: expensiveProductId, qty: 1 }],
          governorate: 'الدقهلية',
          city: 'المنصورة',
          paymentMethod: 'cod',
        })
        .expect(200)

      expect(res.body.codDeposit.required).toBe(true)
      expect(res.body.codDeposit.pct).toBe(10)
      // 3,510,000 * 10% = 351,000
      expect(res.body.codDeposit.amount).toBe(351_000)
    })

    it('returns rejected coupon not_found when unknown coupon code is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          couponCode: 'WELCOME2026',
        })
        .expect(200)

      expect(res.body.coupon).toEqual({
        code: 'WELCOME2026',
        status: 'rejected',
        discount: 0,
        reason: 'الكود ده مش موجود',
        reasonCode: 'not_found',
        minOrder: null,
      })
      expect(res.body.discount).toBe(0)
    })
  })

  // ==========================================================================
  // B. POST /api/orders
  // ==========================================================================
  describe('POST /api/orders', () => {
    it('creates an order (201) and subsequent call with same idempotencyKey returns 200 with identical body', async () => {
      const key = `idem_${nanoid(20)}`
      const expectedTotal = inStockPrice + 10000 // 510,000

      const payload = {
        items: [{ productId: inStockProductId, qty: 1 }],
        customer: {
          name: 'عميل اختبار تجريبي',
          phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الجيش بجوار الاستاد',
          notes: 'اتصل قبل الوصول',
        },
        paymentMethod: 'cod',
        idempotencyKey: key,
        expectedTotal,
      }

      const ip = nextIp()
      // First request: 201 Created
      const res1 = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', ip)
        .send(payload)
        .expect(201)

      expect(res1.body).toMatchObject({
        no: expect.stringMatching(/^SR-\d{4}-\d{6}$/),
        publicToken: expect.any(String),
        status: 'new',
        total: expectedTotal,
      })
      expect(res1.body.publicToken.length).toBe(24)
      createdOrderNos.push(res1.body.no)

      // Second request with same idempotency key: 200 OK
      const res2 = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', ip)
        .send(payload)
        .expect(200)

      expect(res2.body).toEqual(res1.body)

      // Check DB: exactly one order row with this key
      const count = await prisma.order.count({
        where: { idempotencyKey: key },
      })
      expect(count).toBe(1)
    })

    it('handles concurrent requests with the same idempotency key and produces only one order', async () => {
      const concurrentKey = `concurrent_${nanoid(20)}`
      const expectedTotal = inStockPrice + 10000

      const payload = {
        items: [{ productId: inStockProductId, qty: 1 }],
        customer: {
          name: 'متسابق تزامني',
          phone: '01098765432',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'ميدان الثورة',
        },
        paymentMethod: 'cod',
        idempotencyKey: concurrentKey,
        expectedTotal,
      }

      const ip = nextIp()
      const [resA, resB] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/orders')
          .set('X-Forwarded-For', ip)
          .send(payload),
        request(app.getHttpServer())
          .post('/api/orders')
          .set('X-Forwarded-For', ip)
          .send(payload),
      ])

      const statuses = [resA.status, resB.status].sort()
      expect(statuses).toEqual([200, 201])
      expect(resA.body.no).toBe(resB.body.no)
      createdOrderNos.push(resA.body.no)

      const count = await prisma.order.count({
        where: { idempotencyKey: concurrentKey },
      })
      expect(count).toBe(1)
    })

    it('returns 409 TOTAL_CHANGED when expectedTotal is stale', async () => {
      const staleKey = `stale_${nanoid(20)}`
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          customer: {
            name: 'سعر قديم',
            phone: '01011112222',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع قناة السويس',
          },
          paymentMethod: 'cod',
          idempotencyKey: staleKey,
          expectedTotal: 999_999, // Stale expected total
        })
        .expect(409)

      expect(res.body).toMatchObject({
        code: 'TOTAL_CHANGED',
        message: 'في تغييرات في السلة، راجعها قبل ما تأكد',
        quote: expect.any(Object),
      })
      expect(res.body.quote.total).toBe(inStockPrice + 10000)
    })

    it('returns 409 CART_CHANGED when ordering an out-of-stock item', async () => {
      const outKey = `out_${nanoid(20)}`
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: outOfStockProductId, qty: 1 }],
          customer: {
            name: 'طلب منتج نافذ',
            phone: '01011113333',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع عبد السلام عارف',
          },
          paymentMethod: 'cod',
          idempotencyKey: outKey,
          expectedTotal: outOfStockPrice + 10000,
        })
        .expect(409)

      expect(res.body).toMatchObject({
        code: 'CART_CHANGED',
        message: 'في تغييرات في السلة، راجعها قبل ما تأكد',
        quote: expect.any(Object),
      })
    })

    it('returns 400 when selecting a disabled payment method (fawry)', async () => {
      const fawryKey = `fawry_${nanoid(20)}`
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          customer: {
            name: 'فوري غير متاح',
            phone: '01011114444',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع الترعة',
          },
          paymentMethod: 'fawry',
          idempotencyKey: fawryKey,
          expectedTotal: inStockPrice + 10000,
        })
        .expect(400)

      expect(res.body.message).toBe('طريقة الدفع دي مش متاحة')
    })

    it('returns 400 for invalid phone numbers', async () => {
      const invalidPhoneKey = `phone_${nanoid(20)}`
      await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          customer: {
            name: 'هاتف خاطئ',
            phone: '0131234567', // Invalid prefix
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع المحطة',
          },
          paymentMethod: 'cod',
          idempotencyKey: invalidPhoneKey,
          expectedTotal: inStockPrice + 10000,
        })
        .expect(400)
    })

    it('normalizes Arabic-Indic phone digits with spaces upon storage', async () => {
      const normPhoneKey = `norm_phone_${nanoid(20)}`
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          customer: {
            name: 'أرقام عربية',
            phone: '٠١١ ٢٣٤٥ ٦٧٨٩',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'حي الجامعة',
          },
          paymentMethod: 'cod',
          idempotencyKey: normPhoneKey,
          expectedTotal: inStockPrice + 10000,
        })
        .expect(201)

      createdOrderNos.push(res.body.no)

      const inDb = await prisma.order.findUnique({
        where: { no: res.body.no },
      })
      expect(inDb?.customerPhone).toBe('01123456789')
    })

    it('sets status to awaiting_payment for instapay orders', async () => {
      const instapayKey = `insta_${nanoid(20)}`
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          customer: {
            name: 'دفع إنستا باي',
            phone: '01211115555',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'المشاية السفلية',
          },
          paymentMethod: 'instapay',
          idempotencyKey: instapayKey,
          expectedTotal: inStockPrice + 10000,
        })
        .expect(201)

      expect(res.body.status).toBe('awaiting_payment')
      createdOrderNos.push(res.body.no)
    })

    it('sets status to awaiting_deposit with depositAmount for large COD orders', async () => {
      const bigCodKey = `big_cod_${nanoid(20)}`
      const expectedTotal = expensivePrice + 10000 // 3,510,000

      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: expensiveProductId, qty: 1 }],
          customer: {
            name: 'طلب كبير عربون',
            phone: '01511116666',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع المختلط',
          },
          paymentMethod: 'cod',
          idempotencyKey: bigCodKey,
          expectedTotal,
        })
        .expect(201)

      expect(res.body.status).toBe('awaiting_deposit')
      createdOrderNos.push(res.body.no)

      const inDb = await prisma.order.findUnique({
        where: { no: res.body.no },
      })
      expect(inDb?.status).toBe('awaiting_deposit')
      expect(inDb?.depositPct).toBe(10)
      expect(inDb?.depositAmount).toBe(351_000)
    })

    it('does NOT alter inventory stock on order creation', async () => {
      const stockBefore = await prisma.product.findUnique({
        where: { id: inStockProductId },
        select: { stock: true },
      })

      const stockCheckKey = `stock_check_${nanoid(20)}`
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 2 }],
          customer: {
            name: 'فحص المخزون',
            phone: '01011117777',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع الجلاء',
          },
          paymentMethod: 'cod',
          idempotencyKey: stockCheckKey,
          expectedTotal: inStockPrice * 2 + 10000,
        })
        .expect(201)

      createdOrderNos.push(res.body.no)

      const stockAfter = await prisma.product.findUnique({
        where: { id: inStockProductId },
        select: { stock: true },
      })

      expect(stockAfter?.stock).toBe(stockBefore?.stock)
    })

    it('throttles on the 11th request from the same IP within the window with 429', async () => {
      const throttledIp = nextIp()
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/orders')
          .set('X-Forwarded-For', throttledIp)
          .send({})
      }

      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', throttledIp)
        .send({})
        .expect(429)

      expect(res.body.statusCode).toBe(429)
    })
  })

  // ==========================================================================
  // C. GET /api/orders/:no/thanks?t=<token>
  // ==========================================================================
  describe('GET /api/orders/:no/thanks', () => {
    let codOrderNo = ''
    let codPublicToken = ''
    let instapayOrderNo = ''
    let instapayPublicToken = ''

    beforeAll(async () => {
      // 1. Small COD order (status 'new')
      const codRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          customer: {
            name: 'أحمد محمود التابعي',
            phone: '01099998888',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع بورسعيد برج الأمل',
          },
          paymentMethod: 'cod',
          idempotencyKey: `thanks_cod_${nanoid(20)}`,
          expectedTotal: inStockPrice + 10000,
        })
        .expect(201)

      codOrderNo = codRes.body.no
      codPublicToken = codRes.body.publicToken
      createdOrderNos.push(codOrderNo)

      // 2. Instapay order (status 'awaiting_payment')
      const instaRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: inStockProductId, qty: 1 }],
          customer: {
            name: 'سارة إبراهيم الشناوي',
            phone: '01299997777',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع النخلة',
          },
          paymentMethod: 'instapay',
          idempotencyKey: `thanks_insta_${nanoid(20)}`,
          expectedTotal: inStockPrice + 10000,
        })
        .expect(201)

      instapayOrderNo = instaRes.body.no
      instapayPublicToken = instaRes.body.publicToken
      createdOrderNos.push(instapayOrderNo)
    })

    it('returns 200 with sanitized data (no phone, no address, no customer/order ids) with no-store header', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/orders/${codOrderNo}/thanks`)
        .query({ t: codPublicToken })
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(res.headers['cache-control']).toContain('no-store')

      expect(res.body).toMatchObject({
        no: codOrderNo,
        status: 'new',
        createdAt: expect.any(String),
        paymentMethod: 'cod',
        items: [
          {
            name: expect.any(String),
            modelCode: expect.any(String),
            qty: 1,
            unitPrice: inStockPrice,
            lineTotal: inStockPrice,
          },
        ],
        subtotal: inStockPrice,
        discount: 0,
        deliveryFee: 10000,
        total: inStockPrice + 10000,
        deposit: null,
        payment: {
          name: expect.any(String),
        },
        customerFirstName: 'أحمد',
      })

      // Privacy guarantee: NEVER return phone, address, notes, city, or ids
      expect(res.body).not.toHaveProperty('phone')
      expect(res.body).not.toHaveProperty('customerPhone')
      expect(res.body).not.toHaveProperty('address')
      expect(res.body).not.toHaveProperty('notes')
      expect(res.body).not.toHaveProperty('city')
      expect(res.body).not.toHaveProperty('governorate')
      expect(res.body).not.toHaveProperty('id')
      expect(res.body).not.toHaveProperty('orderId')
      expect(res.body.items[0]).not.toHaveProperty('id')
      expect(res.body.items[0]).not.toHaveProperty('productId')
    })

    it('returns null confirmToken for small COD order and a valid confirmToken for instapay order', async () => {
      // Small COD (status 'new') -> confirmToken is null
      const codThanks = await request(app.getHttpServer())
        .get(`/api/orders/${codOrderNo}/thanks`)
        .query({ t: codPublicToken })
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(codThanks.body.confirmToken).toBeNull()

      // Instapay (status 'awaiting_payment') -> confirmToken is present
      const instaThanks = await request(app.getHttpServer())
        .get(`/api/orders/${instapayOrderNo}/thanks`)
        .query({ t: instapayPublicToken })
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(typeof instaThanks.body.confirmToken).toBe('string')
      expect(instaThanks.body.confirmToken.length).toBe(24)
      expect(instaThanks.body.customerFirstName).toBe('سارة')
    })

    it('returns identical 404 for wrong token, missing token, and unknown order number', async () => {
      // 1. Wrong token
      const wrongTokenRes = await request(app.getHttpServer())
        .get(`/api/orders/${codOrderNo}/thanks`)
        .query({ t: 'wrong_token_value_of_len_24' })
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      // 2. Missing token
      const missingTokenRes = await request(app.getHttpServer())
        .get(`/api/orders/${codOrderNo}/thanks`)
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      // 3. Unknown order number
      const unknownOrderRes = await request(app.getHttpServer())
        .get('/api/orders/SR-2026-999999/thanks')
        .query({ t: codPublicToken })
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      expect(wrongTokenRes.body).toEqual({
        statusCode: 404,
        message: 'الطلب غير موجود',
        error: 'Not Found',
      })
      expect(missingTokenRes.body).toEqual(wrongTokenRes.body)
      expect(unknownOrderRes.body).toEqual(wrongTokenRes.body)
    })
  })
})
