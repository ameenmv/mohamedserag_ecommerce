import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  cairoToday,
  lockEndDate,
  OWNER_ROLE_KEY,
} from '@serag/shared'
import { randomUUID } from 'node:crypto'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import type { Prisma } from '../src/generated/prisma/client.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Bridal Reserve API E2E (/api/bridal/reserve-quote, /api/bridal/lists/:token/reserve)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const testEmail = `admin-bridal-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  let adminUserId = ''
  let sessionCookie = ''
  let csrfToken = ''

  let categoryId = ''
  let brandId = ''

  let prodInStock1Id = ''
  let prodOutOfStockId = ''
  let prodExpensiveRetailId = ''

  const price1 = 100_000 // 1,000 EGP
  const price2 = 200_000 // 2,000 EGP
  const priceExpensive = 3_500_000 // 35,000 EGP

  const createdProductIds: string[] = []
  const createdOrderIds: string[] = []
  const createdListIds: string[] = []

  let ipCounter = 1
  const nextIp = () => `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  let originalBridalSetting: Prisma.InputJsonValue | null = null

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // Ensure permissions and owner role for admin confirm actions
    for (const key of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      })
    }

    const role = await prisma.role.upsert({
      where: { key: OWNER_ROLE_KEY },
      update: { name: 'مدير' },
      create: { key: OWNER_ROLE_KEY, name: 'مدير' },
    })

    const perms = await prisma.permission.findMany()
    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: `مدير حجز العروسة ${runId}`,
        passwordHash,
        active: true,
        roles: { create: [{ roleId: role.id }] },
      },
    })
    adminUserId = user.id

    const cat = await prisma.category.findFirst({ orderBy: { sort: 'asc' } })
    if (!cat) throw new Error('No category found')
    categoryId = cat.id

    const br = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!br) throw new Error('No brand found')
    brandId = br.id

    // Login admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200)

    const setCookie = loginRes.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    const seragCookie = cookies.find((c: string) => c.startsWith('serag_sid='))
    sessionCookie = seragCookie?.split(';')[0] ?? ''
    csrfToken = loginRes.body.csrfToken

    // Create test products
    const p1 = await prisma.product.create({
      data: {
        modelCode: `B-STK1-${runId}`,
        slug: `b-stk1-${runId}`,
        name: `خلاط عرايس ${runId}`,
        brandId,
        categoryId,
        price: price1,
        stock: 10,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    prodInStock1Id = p1.id
    createdProductIds.push(p1.id)

    const p2 = await prisma.product.create({
      data: {
        modelCode: `B-STK2-${runId}`,
        slug: `b-stk2-${runId}`,
        name: `ميكروويف عرايس ${runId}`,
        brandId,
        categoryId,
        price: price2,
        stock: 5,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    createdProductIds.push(p2.id)

    const p3 = await prisma.product.create({
      data: {
        modelCode: `B-OOS-${runId}`,
        slug: `b-oos-${runId}`,
        name: `غسالة نافذة نفذت ${runId}`,
        brandId,
        categoryId,
        price: 150_000,
        stock: 0,
        lowStockThreshold: 2,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    prodOutOfStockId = p3.id
    createdProductIds.push(p3.id)

    const p4 = await prisma.product.create({
      data: {
        modelCode: `B-EXP-${runId}`,
        slug: `b-exp-${runId}`,
        name: `ثلاجة فاخرة كود ${runId}`,
        brandId,
        categoryId,
        price: priceExpensive,
        stock: 5,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    prodExpensiveRetailId = p4.id
    createdProductIds.push(p4.id)
  
    // Pin the bridal rules so lockDays/deposit assertions don't depend on the seeded settings
    const existingBridal = await prisma.setting.findUnique({ where: { key: 'bridal' } })
    originalBridalSetting = (existingBridal?.value ?? null) as Prisma.InputJsonValue | null
    await prisma.setting.upsert({
      where: { key: 'bridal' },
      update: { value: { depositPct: 10, lockDays: 45 } },
      create: { key: 'bridal', value: { depositPct: 10, lockDays: 45 } },
    })
  })

  afterAll(async () => {
    if (originalBridalSetting === null) {
      await prisma.setting.deleteMany({ where: { key: 'bridal' } })
    } else {
      await prisma.setting.update({ where: { key: 'bridal' }, data: { value: originalBridalSetting } })
    }
    if (createdOrderIds.length > 0) {
      await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.stockMovement.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    }
    if (createdListIds.length > 0) {
      await prisma.bridalList.deleteMany({ where: { id: { in: createdListIds } } })
    }
    if (createdProductIds.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: { in: createdProductIds } } })
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    }
    if (adminUserId) {
      await prisma.userRole.deleteMany({ where: { userId: adminUserId } })
      await prisma.session.deleteMany({ where: { userId: adminUserId } })
      await prisma.user.delete({ where: { id: adminUserId } })
    }
    await app.close()
  })

  async function createDraftList(
    items: Array<{ productId: string; qty: number }>,
  ): Promise<{ id: string; editToken: string; shareToken: string }> {
    const editToken = nanoid(24)
    const shareToken = nanoid(24)
    const list = await prisma.bridalList.create({
      data: {
        editToken,
        shareToken,
        status: 'draft',
        rooms: [
          {
            key: 'kitchen',
            items,
          },
        ],
      },
    })
    createdListIds.push(list.id)
    return { id: list.id, editToken, shareToken }
  }

  // 1. reserve-quote (fee by zone, deposit math, lockDays snapshot from settings)
  it('calculates reserve quote with zone fee, deposit math, and lockDays snapshot', async () => {
    const { editToken } = await createDraftList([{ productId: prodInStock1Id, qty: 1 }])

    // Query 1: Mansoura (fee 10,000)
    const res1 = await request(app.getHttpServer())
      .get(`/api/bridal/reserve-quote/${editToken}`)
      .query({ governorate: 'الدقهلية', city: 'المنصورة' })
      .expect(200)

    expect(res1.body).toEqual({
      subtotal: 100_000,
      deliveryFee: 10_000,
      total: 110_000,
      depositPct: 10,
      depositAmount: 11_000,
      lockDays: 45,
      zoneName: 'المنصورة',
    })

    // Query 2: Mit Ghamr (fee 15,000)
    const res2 = await request(app.getHttpServer())
      .get(`/api/bridal/reserve-quote/${editToken}`)
      .query({ governorate: 'الدقهلية', city: 'ميت غمر' })
      .expect(200)

    expect(res2.body).toEqual({
      subtotal: 100_000,
      deliveryFee: 15_000,
      total: 115_000,
      depositPct: 10,
      depositAmount: 11_500,
      lockDays: 45,
      zoneName: 'مراكز الدقهلية',
    })
  })

  // 2. share token -> 403
  it('rejects share token with 403 on quote and reserve endpoints', async () => {
    const { shareToken } = await createDraftList([{ productId: prodInStock1Id, qty: 1 }])

    // Quote with shareToken -> 403
    const quoteRes = await request(app.getHttpServer())
      .get(`/api/bridal/reserve-quote/${shareToken}`)
      .query({ governorate: 'الدقهلية', city: 'المنصورة' })
      .expect(403)
    expect(quoteRes.body.message).toContain('اللينك ده للعرض بس')

    // Reserve with shareToken -> 403
    const reserveRes = await request(app.getHttpServer())
      .post(`/api/bridal/lists/${shareToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'سميرة إبراهيم',
          phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع المشاية',
        },
        paymentMethod: 'instapay',
        idempotencyKey: randomUUID(),
        expectedTotal: 110_000,
      })
      .expect(403)
    expect(reserveRes.body.message).toContain('اللينك ده للعرض بس')
  })

  // 3. cod -> 400
  it('rejects cod paymentMethod with 400', async () => {
    const { editToken } = await createDraftList([{ productId: prodInStock1Id, qty: 1 }])

    await request(app.getHttpServer())
      .post(`/api/bridal/lists/${editToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'سميرة إبراهيم',
          phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع المشاية',
        },
        paymentMethod: 'cod',
        idempotencyKey: randomUUID(),
        expectedTotal: 110_000,
      })
      .expect(400)

  })

  // 4. UNAVAILABLE (stock 0 item or empty list)
  it('returns 409 UNAVAILABLE when list contains out-of-stock items or is empty', async () => {
    // Out-of-stock item
    const { editToken: oosToken } = await createDraftList([{ productId: prodOutOfStockId, qty: 1 }])

    const oosRes = await request(app.getHttpServer())
      .post(`/api/bridal/lists/${oosToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'سميرة إبراهيم',
          phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع المشاية',
        },
        paymentMethod: 'instapay',
        idempotencyKey: randomUUID(),
        expectedTotal: 160_000,
      })
      .expect(409)

    expect(oosRes.body).toMatchObject({
      code: 'UNAVAILABLE',
      message: 'فيه منتجات نفذت، بدّليها أو شيليها',
    })

    // Empty list
    const { editToken: emptyToken } = await createDraftList([])
    const emptyRes = await request(app.getHttpServer())
      .post(`/api/bridal/lists/${emptyToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'سميرة إبراهيم',
          phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع المشاية',
        },
        paymentMethod: 'instapay',
        idempotencyKey: randomUUID(),
        expectedTotal: 10_000,
      })
      .expect(409)

    expect(emptyRes.body).toMatchObject({
      code: 'UNAVAILABLE',
    })
  })

  // 5. PRICE_CHANGED
  it('returns 409 PRICE_CHANGED when expectedTotal does not match current quote total', async () => {
    const { editToken } = await createDraftList([{ productId: prodInStock1Id, qty: 1 }])

    const res = await request(app.getHttpServer())
      .post(`/api/bridal/lists/${editToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'سميرة إبراهيم',
          phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع المشاية',
        },
        paymentMethod: 'instapay',
        idempotencyKey: randomUUID(),
        expectedTotal: 99_999, // Mismatched total
      })
      .expect(409)

    expect(res.body).toMatchObject({
      code: 'PRICE_CHANGED',
      message: 'الأسعار اتغيرت، راجعي الإجمالي الجديد',
      quote: {
        subtotal: 100_000,
        deliveryFee: 10_000,
        total: 110_000,
      },
    })
  })

  // 6. reserve happy path, list frozen, edit view shows locked prices after catalog change
  let happyOrderNo = ''
  let happyPublicToken = ''
  let happyConfirmToken = ''
  let happyOrderId = ''
  const happyIdempotencyKey = randomUUID()

  it('reserves list, freezes it, and locks pricing in view even if catalog prices change', async () => {
    const { id: listId, editToken } = await createDraftList([{ productId: prodInStock1Id, qty: 1 }])

    const res = await request(app.getHttpServer())
      .post(`/api/bridal/lists/${editToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'منى أحمد السيد',
          phone: '01099887766',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الجمهورية أمام الجامعة',
        },
        preferredDate: cairoToday(),
        paymentMethod: 'instapay',
        idempotencyKey: happyIdempotencyKey,
        expectedTotal: 110_000,
      })
      .expect(201)

    expect(res.body).toMatchObject({
      orderNo: expect.stringMatching(/^SR-\d{4}-\d{6}$/),
      publicToken: expect.any(String),
    })

    happyOrderNo = res.body.orderNo
    happyPublicToken = res.body.publicToken

    const orderInDb = await prisma.order.findUniqueOrThrow({
      where: { no: happyOrderNo },
      include: { items: true, events: true },
    })
    happyOrderId = orderInDb.id
    happyConfirmToken = orderInDb.confirmToken
    createdOrderIds.push(happyOrderId)

    expect(orderInDb).toMatchObject({
      type: 'bridal',
      status: 'awaiting_deposit',
      bridalStatus: 'awaiting_deposit',
      subtotal: 100_000,
      discount: 0,
      deliveryFee: 10_000,
      total: 110_000,
      paymentMethod: 'instapay',
      depositPct: 10,
      depositAmount: 11_000,
      paidAmount: 0,
      lockDays: 45,
      bridalListId: listId,
    })
    expect(orderInDb.items).toHaveLength(1)
    expect(orderInDb.items[0]).toMatchObject({
      productId: prodInStock1Id,
      qty: 1,
      unitPrice: 100_000,
      taxRate: 14,
    })
    expect(orderInDb.events[0]).toMatchObject({
      status: 'awaiting_deposit',
      note: 'حجز جهاز العروسة',
    })

    // List is frozen
    const listInDb = await prisma.bridalList.findUniqueOrThrow({ where: { id: listId } })
    expect(listInDb.status).toBe('awaiting_deposit')
    expect(listInDb.customerName).toBe('منى أحمد السيد')
    expect(listInDb.customerPhone).toBe('01099887766')

    // PATCH list returns 409
    await request(app.getHttpServer())
      .patch(`/api/bridal/lists/${editToken}`)
      .send({ rooms: [] })
      .expect(409)

    // Second reserve attempt returns 409 NOT_DRAFT
    const repeatRes = await request(app.getHttpServer())
      .post(`/api/bridal/lists/${editToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'منى أحمد السيد',
          phone: '01099887766',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الجمهورية',
        },
        paymentMethod: 'instapay',
        idempotencyKey: randomUUID(),
        expectedTotal: 110_000,
      })
      .expect(409)
    expect(repeatRes.body.code).toBe('NOT_DRAFT')

    // Reserve quote on non-draft list returns 409
    await request(app.getHttpServer())
      .get(`/api/bridal/reserve-quote/${editToken}`)
      .query({ governorate: 'الدقهلية', city: 'المنصورة' })
      .expect(409)

    // Simulate catalog price hike: 100_000 -> 180_000
    await prisma.product.update({
      where: { id: prodInStock1Id },
      data: { price: 180_000 },
    })

    // GET /api/bridal/lists/:token shows locked order price (100_000) not catalog price (180_000)
    const viewRes = await request(app.getHttpServer())
      .get(`/api/bridal/lists/${editToken}`)
      .expect(200)

    expect(viewRes.body.total).toBe(100_000)
    expect(viewRes.body.rooms[0].items[0].unitPrice).toBe(100_000)
    expect(viewRes.body.rooms[0].items[0].available).toBe(true)
    expect(viewRes.body.reservation).toMatchObject({
      no: happyOrderNo,
      status: 'awaiting_deposit',
      bridalStatus: 'awaiting_deposit',
      total: 110_000,
      depositAmount: 11_000,
      paidAmount: 0,
      lockDays: 45,
      lockedUntil: null,
    })

    // Privacy guarantee: NEVER return customer phone, address, or confirmToken in list view
    expect(viewRes.body).not.toHaveProperty('phone')
    expect(viewRes.body).not.toHaveProperty('customerPhone')
    expect(viewRes.body).not.toHaveProperty('address')
    expect(viewRes.body).not.toHaveProperty('confirmToken')
    expect(viewRes.body.reservation).not.toHaveProperty('confirmToken')

    // Revert product price
    await prisma.product.update({
      where: { id: prodInStock1Id },
      data: { price: price1 },
    })
  })

  // 7. idempotent replay
  it('returns 200 OK with identical payload on idempotent replay', async () => {
    const { editToken } = await createDraftList([{ productId: prodInStock1Id, qty: 1 }])
    const res = await request(app.getHttpServer())
      .post(`/api/bridal/lists/${editToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'منى أحمد السيد',
          phone: '01099887766',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الجمهورية',
        },
        paymentMethod: 'instapay',
        idempotencyKey: happyIdempotencyKey, // Replay key
        expectedTotal: 110_000,
      })
      .expect(200)

    expect(res.body).toEqual({
      orderNo: happyOrderNo,
      publicToken: happyPublicToken,
    })
  })

  // 8. partial deposit confirm keeps awaiting_deposit and paidAmount
  it('keeps status awaiting_deposit when confirmed amount is less than required deposit', async () => {
    const confirmRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${happyConfirmToken}/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 4_000, note: 'جزء من العربون' })
      .expect(200)

    expect(confirmRes.body).toMatchObject({
      status: 'awaiting_deposit',
      paidAmount: 4_000,
      deposit: {
        paid: 4_000,
        required: 11_000,
        remaining: 7_000,
      },
      locked: null,
      canConfirm: true,
    })

    const inDb = await prisma.order.findUniqueOrThrow({ where: { id: happyOrderId } })
    expect(inDb.status).toBe('awaiting_deposit')
    expect(inDb.paidAmount).toBe(4_000)

    // Stock must not be touched
    const p1 = await prisma.product.findUniqueOrThrow({ where: { id: prodInStock1Id } })
    expect(p1.stock).toBe(10)
  })

  // 9. second confirm completes -> confirmed + bridalStatus locked + lockedUntil + list locked
  // 10. NO stock movement and stock unchanged
  it('transitions to confirmed and locks bridal order and list on reaching deposit, without deducting stock', async () => {
    const beforeStock = await prisma.product.findUniqueOrThrow({ where: { id: prodInStock1Id } })

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${happyConfirmToken}/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 7_000, note: 'باقي العربون' })
      .expect(200)

    expect(confirmRes.body).toMatchObject({
      status: 'confirmed',
      paidAmount: 11_000,
      deposit: {
        paid: 11_000,
        required: 11_000,
        remaining: 0,
      },
      locked: {
        lockedUntil: expect.any(String),
      },
      confirmWhatsappUrl: expect.stringContaining('wa.me'),
    })

    const inDb = await prisma.order.findUniqueOrThrow({
      where: { id: happyOrderId },
      include: { bridalList: true, events: true },
    })
    expect(inDb.status).toBe('confirmed')
    expect(inDb.bridalStatus).toBe('locked')
    expect(inDb.lockedUntil).not.toBeNull()
    // End of the Cairo day, lockDays from today (stored on the reservation at reserve time)
    expect(inDb.lockedUntil?.toISOString()).toBe(lockEndDate(new Date(), inDb.lockDays ?? 30).toISOString())
    expect(inDb.bridalList?.status).toBe('locked')

    // Verify bridal_locked event
    const lockEvent = inDb.events.find((e) => e.status === 'bridal_locked')
    expect(lockEvent).toBeDefined()
    expect(lockEvent?.note).toBe(cairoToday(inDb.lockedUntil!))

    // NO stock movement and stock unchanged
    const afterStock = await prisma.product.findUniqueOrThrow({ where: { id: prodInStock1Id } })
    expect(afterStock.stock).toBe(beforeStock.stock)

    const movements = await prisma.stockMovement.findMany({ where: { orderId: happyOrderId } })
    expect(movements).toHaveLength(0)
  })

  // 11. reject then partial confirm -> back to awaiting_deposit
  it('transitions payment_rejected back to awaiting_deposit when partial confirm is made', async () => {
    const { editToken } = await createDraftList([{ productId: prodInStock1Id, qty: 1 }])
    const res = await request(app.getHttpServer())
      .post(`/api/bridal/lists/${editToken}/reserve`)
      .set('X-Forwarded-For', nextIp())
      .send({
        customer: {
          name: 'نجوى فؤاد',
          phone: '01122334455',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'شارع الترعة',
        },
        paymentMethod: 'vodafone_cash',
        idempotencyKey: randomUUID(),
        expectedTotal: 110_000,
      })
      .expect(201)

    const order = await prisma.order.findUniqueOrThrow({ where: { no: res.body.orderNo } })
    createdOrderIds.push(order.id)

    // Admin rejects
    const rejectRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${order.confirmToken}/reject`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ reason: 'صورة التحويل غير واضحة' })
      .expect(200)

    expect(rejectRes.body.status).toBe('payment_rejected')

    // Admin confirms a partial payment (less than 11,000 deposit)
    const partialRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${order.confirmToken}/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 5_000, note: 'تحويل جزئي جديد' })
      .expect(200)

    expect(partialRes.body.status).toBe('awaiting_deposit')
    expect(partialRes.body.paidAmount).toBe(5_000)
    expect(partialRes.body.deposit).toMatchObject({
      paid: 5_000,
      required: 11_000,
      remaining: 6_000,
    })

    const orderDb = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(orderDb.status).toBe('awaiting_deposit')
    expect(orderDb.paidAmount).toBe(5_000)
  })

  // 12. large-COD retail order: partial deposit stays awaiting_deposit, full deposit -> confirmed with stock deducted
  it('manages retail large-COD deposit: partial stays awaiting_deposit without stock deduction, full deposit confirms and deducts stock', async () => {
    const prodBefore = await prisma.product.findUniqueOrThrow({ where: { id: prodExpensiveRetailId } })
    const stockBefore = prodBefore.stock

    // Create retail large-COD order (35,000 EGP > 30,000 threshold)
    const retailRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-Forwarded-For', nextIp())
      .send({
        items: [{ productId: prodExpensiveRetailId, qty: 1 }],
        customer: {
          name: 'عميل التجزئة الكبير',
          phone: '01011113333',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          address: 'حي الجامعة',
        },
        paymentMethod: 'cod',
        idempotencyKey: randomUUID(),
        expectedTotal: priceExpensive + 10_000,
      })
      .expect(201)

    const retailOrder = await prisma.order.findUniqueOrThrow({ where: { no: retailRes.body.no } })
    createdOrderIds.push(retailOrder.id)
    expect(retailOrder.type).toBe('order')
    expect(retailOrder.status).toBe('awaiting_deposit')
    expect(retailOrder.depositAmount).toBe(351_000)

    // 1. Partial confirm (150,000 < 351,000)
    const partRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${retailOrder.confirmToken}/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 150_000 })
      .expect(200)

    expect(partRes.body.status).toBe('awaiting_deposit')
    const stockDuring = await prisma.product.findUniqueOrThrow({ where: { id: prodExpensiveRetailId } })
    expect(stockDuring.stock).toBe(stockBefore) // Not deducted yet

    // 2. Full confirm (remainder 201,000)
    const fullRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${retailOrder.confirmToken}/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 201_000 })
      .expect(200)

    expect(fullRes.body.status).toBe('confirmed')

    // Stock for retail IS deducted upon confirmed!
    const stockAfter = await prisma.product.findUniqueOrThrow({ where: { id: prodExpensiveRetailId } })
    expect(stockAfter.stock).toBe(stockBefore - 1)

    const movements = await prisma.stockMovement.findMany({ where: { orderId: retailOrder.id } })
    expect(movements).toHaveLength(1)
    expect(movements[0].qty).toBe(-1)
    expect(movements[0].reason).toBe('order_confirmed')
  })

  // 13. cancel bridal reservation -> list cancelled, stock unchanged
  it('cancels bridal reservation: list status mirrored to cancelled and stock unchanged', async () => {
    const prodBefore = await prisma.product.findUniqueOrThrow({ where: { id: prodInStock1Id } })

    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/admin/orders/${happyOrderId}/status`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ to: 'cancelled', reason: 'طلب العميل إلغاء حجز الجهاز' })
      .expect(200)

    expect(cancelRes.body.status).toBe('cancelled')

    const orderInDb = await prisma.order.findUniqueOrThrow({
      where: { id: happyOrderId },
      include: { bridalList: true },
    })
    expect(orderInDb.status).toBe('cancelled')
    expect(orderInDb.bridalStatus).toBe('cancelled')
    expect(orderInDb.bridalList?.status).toBe('cancelled')

    // Stock unchanged (nothing deducted, nothing restored)
    const prodAfter = await prisma.product.findUniqueOrThrow({ where: { id: prodInStock1Id } })
    expect(prodAfter.stock).toBe(prodBefore.stock)
  })
})
