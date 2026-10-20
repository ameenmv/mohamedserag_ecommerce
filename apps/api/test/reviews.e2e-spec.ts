import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Reviews API E2E (POST /api/reviews)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()

  let categoryId = ''
  let brandId = ''

  let prod1Id = ''
  let prod2Id = ''
  let prod3Id = ''
  let hiddenProdId = ''
  let archivedProdId = ''
  let prodForOrderId = ''
  let prodOtherOrderId = ''

  const createdProductIds: string[] = []
  const createdOrderIds: string[] = []

  let ipCounter = 1
  const nextIp = () => `10.9.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // Lookup Category and Brand
    const cat = await prisma.category.findFirst({ orderBy: { sort: 'asc' } })
    if (!cat) throw new Error('No category found in database')
    categoryId = cat.id

    const br = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!br) throw new Error('No brand found in database')
    brandId = br.id

    // 1. Standard active product 1
    const p1 = await prisma.product.create({
      data: {
        modelCode: `REV-P1-${runId}`,
        slug: `rev-p1-${runId}`,
        name: `منتج مراجعات 1 ${runId}`,
        brandId,
        categoryId,
        price: 50_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prod1Id = p1.id
    createdProductIds.push(p1.id)

    // 2. Standard active product 2
    const p2 = await prisma.product.create({
      data: {
        modelCode: `REV-P2-${runId}`,
        slug: `rev-p2-${runId}`,
        name: `منتج مراجعات 2 ${runId}`,
        brandId,
        categoryId,
        price: 60_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prod2Id = p2.id
    createdProductIds.push(p2.id)

    // 3. Product 3 for rejected test
    const p3 = await prisma.product.create({
      data: {
        modelCode: `REV-P3-${runId}`,
        slug: `rev-p3-${runId}`,
        name: `منتج مراجعات 3 ${runId}`,
        brandId,
        categoryId,
        price: 70_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prod3Id = p3.id
    createdProductIds.push(p3.id)

    // 4. Hidden product (visible: false)
    const pHidden = await prisma.product.create({
      data: {
        modelCode: `REV-HIDDEN-${runId}`,
        slug: `rev-hidden-${runId}`,
        name: `منتج مخفي ${runId}`,
        brandId,
        categoryId,
        price: 80_000,
        stock: 10,
        visible: false,
        taxRate: 14,
      },
    })
    hiddenProdId = pHidden.id
    createdProductIds.push(pHidden.id)

    // 5. Archived product (archivedAt set)
    const pArchived = await prisma.product.create({
      data: {
        modelCode: `REV-ARCH-${runId}`,
        slug: `rev-arch-${runId}`,
        name: `منتج مؤرشف ${runId}`,
        brandId,
        categoryId,
        price: 90_000,
        stock: 10,
        visible: true,
        archivedAt: new Date(),
        taxRate: 14,
      },
    })
    archivedProdId = pArchived.id
    createdProductIds.push(pArchived.id)

    // 6. Product for verified buyer orders
    const pOrder = await prisma.product.create({
      data: {
        modelCode: `REV-ORDER-${runId}`,
        slug: `rev-order-${runId}`,
        name: `منتج للطلبات ${runId}`,
        brandId,
        categoryId,
        price: 100_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prodForOrderId = pOrder.id
    createdProductIds.push(pOrder.id)

    // 7. Product for other order (not matching)
    const pOther = await prisma.product.create({
      data: {
        modelCode: `REV-OTHER-${runId}`,
        slug: `rev-other-${runId}`,
        name: `منتج لطلب آخر ${runId}`,
        brandId,
        categoryId,
        price: 110_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prodOtherOrderId = pOther.id
    createdProductIds.push(pOther.id)

    // Create Delivered Order with prodForOrderId
    const oDelivered = await prisma.order.create({
      data: {
        no: `SR-REV-DELIV-${runId}`,
        status: 'delivered',
        customerPhone: '01055556666',
        customerName: 'عميل مستلم',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجلاء',
        subtotal: 100_000,
        total: 100_000,
        paymentMethod: 'cod',
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        items: {
          create: [
            {
              productId: prodForOrderId,
              name: `منتج للطلبات ${runId}`,
              modelCode: `REV-ORDER-${runId}`,
              qty: 1,
              unitPrice: 100_000,
              taxRate: 14,
            },
          ],
        },
      },
    })
    createdOrderIds.push(oDelivered.id)

    // Create Confirmed (NOT delivered) Order with prodForOrderId
    const oConfirmed = await prisma.order.create({
      data: {
        no: `SR-REV-CONF-${runId}`,
        status: 'confirmed',
        customerPhone: '01077778888',
        customerName: 'عميل مؤكد',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع المشاية',
        subtotal: 100_000,
        total: 100_000,
        paymentMethod: 'cod',
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        items: {
          create: [
            {
              productId: prodForOrderId,
              name: `منتج للطلبات ${runId}`,
              modelCode: `REV-ORDER-${runId}`,
              qty: 1,
              unitPrice: 100_000,
              taxRate: 14,
            },
          ],
        },
      },
    })
    createdOrderIds.push(oConfirmed.id)

    // Create Delivered Order with prodOtherOrderId
    const oOther = await prisma.order.create({
      data: {
        no: `SR-REV-OTHER-${runId}`,
        status: 'delivered',
        customerPhone: '01033332222',
        customerName: 'عميل طلب آخر',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجيش',
        subtotal: 110_000,
        total: 110_000,
        paymentMethod: 'cod',
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        items: {
          create: [
            {
              productId: prodOtherOrderId,
              name: `منتج لطلب آخر ${runId}`,
              modelCode: `REV-OTHER-${runId}`,
              qty: 1,
              unitPrice: 110_000,
              taxRate: 14,
            },
          ],
        },
      },
    })
    createdOrderIds.push(oOther.id)
  })

  afterAll(async () => {
    // 1. Delete reviews
    if (createdProductIds.length > 0) {
      await prisma.review.deleteMany({
        where: { productId: { in: createdProductIds } },
      })
    }

    // 2. Delete orders and items
    if (createdOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      })
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      })
    }

    // 3. Delete products
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      })
    }

    await app.close()
  })

  // ==========================================================================
  // Scenario 1: Valid review with Arabic-digit phone
  // ==========================================================================
  describe('Scenario 1: Valid review submission', () => {
    it('accepts Arabic-digit mobile number, trims text, sets pending status, records IP, and verifiedBuyer false', async () => {
      const fixedIp = '10.8.0.1'
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', fixedIp)
        .send({
          productId: prod1Id,
          name: '  أحمد محمود  ',
          phone: '٠١٠١٢٣٤٥٦٧٨',
          stars: 5,
          text: '   منتج ممتاز وخامة عالية جداً وأنصح به   ',
        })
        .expect(201)

      expect(res.body).toEqual({ ok: true })

      const row = await prisma.review.findUnique({
        where: {
          productId_phone: {
            productId: prod1Id,
            phone: '01012345678',
          },
        },
      })
      expect(row).not.toBeNull()
      expect(row?.phone).toBe('01012345678')
      expect(row?.name).toBe('أحمد محمود')
      expect(row?.text).toBe('منتج ممتاز وخامة عالية جداً وأنصح به')
      expect(row?.stars).toBe(5)
      expect(row?.status).toBe('pending')
      expect(row?.verifiedBuyer).toBe(false)
      expect(row?.ip).toBe(fixedIp)
    })
  })

  // ==========================================================================
  // Scenario 2: Repeat review on same product vs another product
  // ==========================================================================
  describe('Scenario 2: Repeat review refusal (409) and different product acceptance', () => {
    it('refuses repeat review on same product with 409 and leaves original unchanged', async () => {
      const repeatRes = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          name: 'أحمد محمود مختلف',
          phone: '01012345678',
          stars: 3,
          text: '   نص تقييم مختلف تماما عن التقييم السابق للتجربة   ',
        })
        .expect(409)

      expect(repeatRes.body.message).toBe('انت قيّمت المنتج ده قبل كده')

      // Check original review row remains untouched
      const originalRow = await prisma.review.findUnique({
        where: {
          productId_phone: {
            productId: prod1Id,
            phone: '01012345678',
          },
        },
      })
      expect(originalRow?.stars).toBe(5)
      expect(originalRow?.name).toBe('أحمد محمود')
    })

    it('allows same phone to review another product', async () => {
      const diffRes = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod2Id,
          name: 'أحمد محمود',
          phone: '01012345678',
          stars: 4,
          text: '   تقييم لمنتج آخر تماماً لا يقل عن عشرين حرف   ',
        })
        .expect(201)

      expect(diffRes.body).toEqual({ ok: true })

      const diffRow = await prisma.review.findUnique({
        where: {
          productId_phone: {
            productId: prod2Id,
            phone: '01012345678',
          },
        },
      })
      expect(diffRow).not.toBeNull()
      expect(diffRow?.productId).toBe(prod2Id)
      expect(diffRow?.phone).toBe('01012345678')
    })
  })

  // ==========================================================================
  // Scenario 3: Rejected review still blocks a repeat
  // ==========================================================================
  describe('Scenario 3: Rejected review blocks repeat', () => {
    it('returns 409 when attempting to review a product where status is rejected', async () => {
      // Create a rejected review directly via Prisma
      await prisma.review.create({
        data: {
          productId: prod3Id,
          phone: '01099990000',
          name: 'عميل مرفوض',
          stars: 1,
          text: 'تقييم مرفوض مسبقاً لا يقل عن عشرين حرفاً للتجربة',
          status: 'rejected',
        },
      })

      // Attempt to submit again with same product and phone
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod3Id,
          phone: '01099990000',
          name: 'عميل مرفوض يحاول مجددا',
          stars: 5,
          text: 'محاولة تقييم جديدة بعد الرفض بأكثر من عشرين حرفاً',
        })
        .expect(409)

      expect(res.body.message).toBe('انت قيّمت المنتج ده قبل كده')
    })
  })

  // ==========================================================================
  // Scenario 4: Input Validation (400)
  // ==========================================================================
  describe('Scenario 4: Validation failures', () => {
    it('returns 400 when stars are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          name: 'علي حسن',
          phone: '01011112222',
          text: 'تقييم سليم بأكثر من عشرين حرفاً للتجربة',
        })
        .expect(400)
    })

    it('returns 400 when stars are 0, 6, or 2.5', async () => {
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          stars: 0,
          name: 'علي حسن',
          phone: '01011112222',
          text: 'تقييم سليم بأكثر من عشرين حرفاً للتجربة',
        })
        .expect(400)

      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          stars: 6,
          name: 'علي حسن',
          phone: '01011112222',
          text: 'تقييم سليم بأكثر من عشرين حرفاً للتجربة',
        })
        .expect(400)

      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          stars: 2.5,
          name: 'علي حسن',
          phone: '01011112222',
          text: 'تقييم سليم بأكثر من عشرين حرفاً للتجربة',
        })
        .expect(400)
    })

    it('returns 400 when text is shorter than 20 chars, whitespace only, or > 1000 chars', async () => {
      // 19 chars
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          stars: 4,
          name: 'علي حسن',
          phone: '01011112222',
          text: '1234567890123456789',
        })
        .expect(400)

      // Whitespace only
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          stars: 4,
          name: 'علي حسن',
          phone: '01011112222',
          text: ' '.repeat(25),
        })
        .expect(400)

      // 1001 chars
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          stars: 4,
          name: 'علي حسن',
          phone: '01011112222',
          text: 'أ'.repeat(1001),
        })
        .expect(400)
    })

    it('returns 400 when phone number is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          stars: 5,
          name: 'علي حسن',
          phone: '012345',
          text: 'تقييم سليم بأكثر من عشرين حرفاً للتجربة',
        })
        .expect(400)
    })
  })

  // ==========================================================================
  // Scenario 5: Hidden product and archived product (404)
  // ==========================================================================
  describe('Scenario 5: Non-existent, hidden, and archived products', () => {
    it('returns 404 for hidden product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: hiddenProdId,
          stars: 5,
          name: 'عميل مخفي',
          phone: '01011113333',
          text: 'تقييم لمنتج مخفي لا يقل عن عشرين حرفاً',
        })
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })

    it('returns 404 for archived product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: archivedProdId,
          stars: 5,
          name: 'عميل مؤرشف',
          phone: '01011113333',
          text: 'تقييم لمنتج مؤرشف لا يقل عن عشرين حرفاً',
        })
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })

    it('returns 404 when the product brand or category is hidden (same rule as the public pages)', async () => {
      const hiddenBrand = await prisma.brand.create({
        data: { name: `ماركة مخفية ${runId}`, slug: `rev-hidden-brand-${runId}`, visible: false },
      })
      const hiddenCategory = await prisma.category.create({
        data: { name: `قسم مخفي ${runId}`, slug: `rev-hidden-cat-${runId}`, visible: false },
      })
      try {
        const underHiddenBrand = await prisma.product.create({
          data: {
            modelCode: `REV-HBRAND-${runId}`,
            slug: `rev-hbrand-${runId}`,
            name: `منتج ماركته مخفية ${runId}`,
            brandId: hiddenBrand.id,
            categoryId,
            price: 70_000,
            stock: 10,
            visible: true,
            taxRate: 14,
          },
        })
        const underHiddenCategory = await prisma.product.create({
          data: {
            modelCode: `REV-HCAT-${runId}`,
            slug: `rev-hcat-${runId}`,
            name: `منتج قسمه مخفي ${runId}`,
            brandId,
            categoryId: hiddenCategory.id,
            price: 70_000,
            stock: 10,
            visible: true,
            taxRate: 14,
          },
        })
        createdProductIds.push(underHiddenBrand.id, underHiddenCategory.id)

        for (const productId of [underHiddenBrand.id, underHiddenCategory.id]) {
          const res = await request(app.getHttpServer())
            .post('/api/reviews')
            .set('X-Forwarded-For', nextIp())
            .send({
              productId,
              stars: 4,
              name: 'عميل تجريبي',
              phone: '01011114444',
              text: 'تقييم لمنتج ماركته أو قسمه مخفي لا يقل عن عشرين حرفاً',
            })
            .expect(404)
          expect(res.body.message).toBe('المنتج مش موجود')
        }
      } finally {
        await prisma.product.deleteMany({
          where: { OR: [{ brandId: hiddenBrand.id }, { categoryId: hiddenCategory.id }] },
        })
        await prisma.brand.delete({ where: { id: hiddenBrand.id } })
        await prisma.category.delete({ where: { id: hiddenCategory.id } })
      }
    })

    it('returns 404 for non-existent product ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: 'non-existent-product-id',
          stars: 5,
          name: 'عميل وهمي',
          phone: '01011113333',
          text: 'تقييم لمنتج غير موجود بأكثر من عشرين حرفاً',
        })
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })
  })

  // ==========================================================================
  // Scenario 6: Honeypot silently accepted
  // ==========================================================================
  describe('Scenario 6: Honeypot filled silently succeeds without persistence', () => {
    it('returns 201 without persisting anything when honeypot field is filled', async () => {
      const honeypotPhone = '01088889999'
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prod1Id,
          stars: 5,
          name: 'سبام بوت',
          phone: honeypotPhone,
          text: 'تقييم بوت سبام لا يقل عن عشرين حرفاً للتجربة',
          website: 'https://spambot.example.com',
        })
        .expect(201)

      expect(res.body).toEqual({ ok: true })

      const row = await prisma.review.findUnique({
        where: {
          productId_phone: {
            productId: prod1Id,
            phone: honeypotPhone,
          },
        },
      })
      expect(row).toBeNull()
    })
  })

  // ==========================================================================
  // Scenario 7: Verified Buyer calculation
  // ==========================================================================
  describe('Scenario 7: Verified buyer calculation', () => {
    it('sets verifiedBuyer true when phone has a DELIVERED order containing the product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prodForOrderId,
          stars: 5,
          name: 'عميل مستلم حقيقي',
          phone: '01055556666',
          text: 'اشتريت المنتج واستلمته وتجربتي ممتازة جداً معه',
        })
        .expect(201)

      expect(res.body).toEqual({ ok: true })

      const row = await prisma.review.findUnique({
        where: {
          productId_phone: {
            productId: prodForOrderId,
            phone: '01055556666',
          },
        },
      })
      expect(row?.verifiedBuyer).toBe(true)
    })

    it('sets verifiedBuyer false when phone has an order that is NOT delivered', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prodForOrderId,
          stars: 4,
          name: 'عميل طلبه مؤكد ولم يستلم بعد',
          phone: '01077778888',
          text: 'طلبت المنتج وفي انتظار الاستلام والتجربة الكاملة',
        })
        .expect(201)

      expect(res.body).toEqual({ ok: true })

      const row = await prisma.review.findUnique({
        where: {
          productId_phone: {
            productId: prodForOrderId,
            phone: '01077778888',
          },
        },
      })
      expect(row?.verifiedBuyer).toBe(false)
    })

    it('sets verifiedBuyer false when phone has a delivered order for a DIFFERENT product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prodForOrderId,
          stars: 4,
          name: 'عميل اشترى منتج آخر',
          phone: '01033332222',
          text: 'أردت تقييم هذا المنتج رغم أنني اشتريت منتج آخر سابقاً',
        })
        .expect(201)

      expect(res.body).toEqual({ ok: true })

      const row = await prisma.review.findUnique({
        where: {
          productId_phone: {
            productId: prodForOrderId,
            phone: '01033332222',
          },
        },
      })
      expect(row?.verifiedBuyer).toBe(false)
    })
  })

  // ==========================================================================
  // Scenario 8: Rate Limiting / Throttle (3 per minute)
  // ==========================================================================
  describe('Scenario 8: Rate Limiting / Throttling', () => {
    it('returns 429 on the 4th request within a minute from the same IP', async () => {
      const throttleIp = `192.168.88.${Math.floor(Math.random() * 200) + 10}`

      // First 3 requests succeed (201)
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/api/reviews')
          .set('X-Forwarded-For', throttleIp)
          .send({
            productId: prod1Id,
            stars: 5,
            name: `عميل معدل ${i}`,
            phone: `0100000000${i}`,
            text: 'تقييم اختبار معدل الطلبات لا يقل عن عشرين حرفا',
            website: 'spam-bot-trap',
          })
          .expect(201)
      }

      // 4th request from same IP is throttled (429)
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', throttleIp)
        .send({
          productId: prod1Id,
          stars: 5,
          name: 'عميل تجاوز الحد',
          phone: '01000000009',
          text: 'تقييم اختبار معدل الطلبات لا يقل عن عشرين حرفا',
          website: 'spam-bot-trap',
        })
        .expect(429)
    })
  })
})
