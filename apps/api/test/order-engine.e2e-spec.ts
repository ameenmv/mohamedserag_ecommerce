import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  type OrderStatus,
  type PaymentMethod,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Order Payment & Status Engine E2E (/api/admin/orders)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const testEmail = `admin-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  let adminUserId = ''
  let sessionCookie = ''
  let csrfToken = ''

  let categoryId = ''
  let brandId = ''

  const createdProductIds: string[] = []
  const createdOrderIds: string[] = []

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // Ensure permissions and owner role
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
        name: `مدير اختبار المحرك ${runId}`,
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

    // Log in to get session cookie & csrf token
    const loginRes = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200)

    const setCookie = loginRes.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    const seragCookie = cookies.find((c: string) => c.startsWith('serag_sid='))
    sessionCookie = seragCookie?.split(';')[0] ?? ''
    csrfToken = loginRes.body.csrfToken
  })

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.stockMovement.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    }

    if (createdProductIds.length > 0) {
      await prisma.stockMovement.deleteMany({ where: { productId: { in: createdProductIds } } })
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    }

    if (adminUserId) {
      await prisma.session.deleteMany({ where: { userId: adminUserId } })
      await prisma.userRole.deleteMany({ where: { userId: adminUserId } })
      await prisma.user.deleteMany({ where: { id: adminUserId } })
    }

    await app.close()
  })

  async function createTestProduct(stock: number): Promise<string> {
    const p = await prisma.product.create({
      data: {
        modelCode: `PROD-${nanoid(8)}`,
        slug: `prod-${nanoid(8)}`,
        name: `منتج اختبار ${nanoid(6)}`,
        brandId,
        categoryId,
        price: 50_000,
        stock,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
      },
    })
    createdProductIds.push(p.id)
    return p.id
  }

  async function createTestOrder(opts: {
    status: OrderStatus
    paymentMethod: PaymentMethod
    total: number
    paidAmount?: number
    depositPct?: number | null
    depositAmount?: number | null
    items: Array<{ productId: string; qty: number; unitPrice: number; name?: string }>
  }): Promise<string> {
    const o = await prisma.order.create({
      data: {
        no: `SR-2026-${nanoid(6).toUpperCase()}`,
        status: opts.status,
        customerName: 'محمد أحمد',
        customerPhone: '01012345678',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجيش، المنصورة',
        subtotal: opts.total,
        discount: 0,
        deliveryFee: 0,
        total: opts.total,
        paidAmount: opts.paidAmount ?? 0,
        paymentMethod: opts.paymentMethod,
        depositPct: opts.depositPct ?? null,
        depositAmount: opts.depositAmount ?? null,
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        items: {
          create: opts.items.map((i) => ({
            productId: i.productId,
            name: i.name ?? 'منتج طلب',
            modelCode: `CODE-${nanoid(4)}`,
            qty: i.qty,
            unitPrice: i.unitPrice,
            taxRate: 14,
          })),
        },
        events: {
          create: [{ status: opts.status, note: 'إنشاء الطلب', userId: null }],
        },
      },
    })
    createdOrderIds.push(o.id)
    return o.id
  }

  it('handles two parallel confirms on the same transfer order: exactly 1 payment, 1 stock deduction', async () => {
    const prodId = await createTestProduct(10)
    const orderId = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 100_000,
      items: [{ productId: prodId, qty: 2, unitPrice: 50_000 }],
    })

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/admin/orders/${orderId}/payments/confirm`)
        .set('Cookie', sessionCookie)
        .set('x-csrf-token', csrfToken)
        .send({ amount: 100_000 }),
      request(app.getHttpServer())
        .post(`/api/admin/orders/${orderId}/payments/confirm`)
        .set('Cookie', sessionCookie)
        .set('x-csrf-token', csrfToken)
        .send({ amount: 100_000 }),
    ])

    const statuses = [res1.status, res2.status].sort()
    expect(statuses).toEqual([200, 409])

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
    expect(updatedOrder.status).toBe('confirmed')
    expect(updatedOrder.paidAmount).toBe(100_000)

    const payments = await prisma.payment.findMany({ where: { orderId } })
    expect(payments).toHaveLength(1)
    expect(payments[0]?.status).toBe('confirmed')
    expect(payments[0]?.amount).toBe(100_000)

    const product = await prisma.product.findUniqueOrThrow({ where: { id: prodId } })
    expect(product.stock).toBe(8)

    const movements = await prisma.stockMovement.findMany({ where: { orderId } })
    expect(movements).toHaveLength(1)
    expect(movements[0]?.qty).toBe(-2)
    expect(movements[0]?.reason).toBe('order_confirmed')
  })

  it('confirms with stock lower than qty: stock 0 (not negative), movement = -taken, cancel restores exactly taken', async () => {
    const prodId = await createTestProduct(3)
    const orderId = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'vodafone_cash',
      total: 250_000,
      items: [{ productId: prodId, qty: 5, unitPrice: 50_000, name: 'شاشة محدودة' }],
    })

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/admin/orders/${orderId}/payments/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 250_000 })
      .expect(200)

    expect(confirmRes.body.shortages).toBeDefined()
    expect(confirmRes.body.shortages).toHaveLength(1)
    expect(confirmRes.body.shortages[0]).toMatchObject({
      productId: prodId,
      requested: 5,
      taken: 3,
    })

    const prodAfterConfirm = await prisma.product.findUniqueOrThrow({ where: { id: prodId } })
    expect(prodAfterConfirm.stock).toBe(0)

    const movementsAfterConfirm = await prisma.stockMovement.findMany({ where: { orderId } })
    expect(movementsAfterConfirm).toHaveLength(1)
    expect(movementsAfterConfirm[0]?.qty).toBe(-3)
    expect(movementsAfterConfirm[0]?.reason).toBe('order_confirmed')

    // Cancel order -> restores exactly taken (3)
    await request(app.getHttpServer())
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ to: 'cancelled', reason: 'طلب العميل إلغاء الطلب' })
      .expect(200)

    const prodAfterCancel = await prisma.product.findUniqueOrThrow({ where: { id: prodId } })
    expect(prodAfterCancel.stock).toBe(3)

    const allMovements = await prisma.stockMovement.findMany({ where: { orderId } })
    expect(allMovements).toHaveLength(2)
    const cancelMovement = allMovements.find((m) => m.reason === 'order_cancelled')
    expect(cancelMovement?.qty).toBe(3)
  })

  it('refuses cancelling twice (cancelled is final) and restore never runs twice', async () => {
    const prodId = await createTestProduct(5)
    const orderId = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 100_000,
      items: [{ productId: prodId, qty: 2, unitPrice: 50_000 }],
    })

    await request(app.getHttpServer())
      .post(`/api/admin/orders/${orderId}/payments/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 100_000 })
      .expect(200)

    await request(app.getHttpServer())
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ to: 'cancelled', reason: 'إلغاء أولي' })
      .expect(200)

    const stockFirstCancel = (await prisma.product.findUniqueOrThrow({ where: { id: prodId } })).stock
    expect(stockFirstCancel).toBe(5)

    // Second cancel attempt must return 409
    await request(app.getHttpServer())
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ to: 'cancelled', reason: 'إلغاء ثاني مكرر' })
      .expect(409)

    const stockSecondCancel = (await prisma.product.findUniqueOrThrow({ where: { id: prodId } })).stock
    expect(stockSecondCancel).toBe(5)
  })

  it('cancelling a never-confirmed order causes no stock movement', async () => {
    const prodId = await createTestProduct(10)
    const orderId = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 50_000,
      items: [{ productId: prodId, qty: 2, unitPrice: 25_000 }],
    })

    await request(app.getHttpServer())
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ to: 'cancelled', reason: 'العميل لم يقم بالتحويل' })
      .expect(200)

    const product = await prisma.product.findUniqueOrThrow({ where: { id: prodId } })
    expect(product.stock).toBe(10)

    const movements = await prisma.stockMovement.findMany({ where: { orderId } })
    expect(movements).toHaveLength(0)
  })

  it('supports rejecting then confirming an order', async () => {
    const prodId = await createTestProduct(10)
    const orderId = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 50_000,
      items: [{ productId: prodId, qty: 1, unitPrice: 50_000 }],
    })

    // Reject payment
    const rejectRes = await request(app.getHttpServer())
      .post(`/api/admin/orders/${orderId}/payments/reject`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ reason: 'صورة الإيصال غير واضحة' })
      .expect(200)

    expect(rejectRes.body.status).toBe('payment_rejected')

    const rejectPayment = await prisma.payment.findFirst({
      where: { orderId, status: 'rejected' },
    })
    expect(rejectPayment?.rejectReason).toBe('صورة الإيصال غير واضحة')

    // Confirm payment afterwards
    const confirmRes = await request(app.getHttpServer())
      .post(`/api/admin/orders/${orderId}/payments/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 50_000 })
      .expect(200)

    expect(confirmRes.body.status).toBe('confirmed')
    expect(confirmRes.body.paidAmount).toBe(50_000)
  })

  it('handles partial payments on confirmed orders and rejects amount > remaining with 400', async () => {
    const prodId = await createTestProduct(10)
    const orderId = await createTestOrder({
      status: 'confirmed',
      paymentMethod: 'instapay',
      total: 100_000,
      paidAmount: 40_000,
      items: [{ productId: prodId, qty: 2, unitPrice: 50_000 }],
    })

    // Attempt paying 70,000 when remaining is 60,000 -> 400
    const errRes = await request(app.getHttpServer())
      .post(`/api/admin/orders/${orderId}/payments/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 70_000 })
      .expect(400)

    expect(errRes.body.message).toBe('المبلغ أكبر من الباقي')

    // Pay 30,000 partial
    const res1 = await request(app.getHttpServer())
      .post(`/api/admin/orders/${orderId}/payments/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 30_000, note: 'دفعة ثانية' })
      .expect(200)

    expect(res1.body.paidAmount).toBe(70_000)
    expect(res1.body.remaining).toBe(30_000)

    // Pay remaining 30,000
    const res2 = await request(app.getHttpServer())
      .post(`/api/admin/orders/${orderId}/payments/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 30_000, note: 'دفعة أخيرة' })
      .expect(200)

    expect(res2.body.paidAmount).toBe(100_000)
    expect(res2.body.remaining).toBe(0)
  })

  it('refuses illegal transition (new → delivered) with 409', async () => {
    const prodId = await createTestProduct(5)
    const orderId = await createTestOrder({
      status: 'new',
      paymentMethod: 'cod',
      total: 50_000,
      items: [{ productId: prodId, qty: 1, unitPrice: 50_000 }],
    })

    await request(app.getHttpServer())
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ to: 'delivered' })
      .expect(409)
  })

  it('deducts stock when COD new order is confirmed via PATCH status', async () => {
    const prodId = await createTestProduct(10)
    const orderId = await createTestOrder({
      status: 'new',
      paymentMethod: 'cod',
      total: 150_000,
      items: [{ productId: prodId, qty: 3, unitPrice: 50_000 }],
    })

    const res = await request(app.getHttpServer())
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ to: 'confirmed', reason: 'تأكيد هاتفي مع العميل' })
      .expect(200)

    expect(res.body.status).toBe('confirmed')

    const product = await prisma.product.findUniqueOrThrow({ where: { id: prodId } })
    expect(product.stock).toBe(7)

    const movement = await prisma.stockMovement.findFirst({
      where: { orderId, reason: 'order_confirmed' },
    })
    expect(movement?.qty).toBe(-3)
    expect(movement?.userId).toBe(adminUserId)
  })

  it('records an order event with acting admin userId for every change', async () => {
    const prodId = await createTestProduct(5)
    const orderId = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 50_000,
      items: [{ productId: prodId, qty: 1, unitPrice: 50_000 }],
    })

    await request(app.getHttpServer())
      .post(`/api/admin/orders/${orderId}/payments/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 50_000, note: 'تم التحقق من الحساب البنكي' })
      .expect(200)

    await request(app.getHttpServer())
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ to: 'out_for_delivery' })
      .expect(200)

    const events = await prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { at: 'asc' },
    })

    // creation event (userId null) + payment_confirmed event + confirmed status event + out_for_delivery status event
    const adminEvents = events.filter((e) => e.userId === adminUserId)
    expect(adminEvents.length).toBeGreaterThanOrEqual(3)
  })

  it('prevents stock race when two different orders for the same product confirm in parallel', async () => {
    const prodId = await createTestProduct(3)
    const order1Id = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 150_000,
      items: [{ productId: prodId, qty: 3, unitPrice: 50_000, name: 'غسالة اختبار سباق المخزون' }],
    })
    const order2Id = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 150_000,
      items: [{ productId: prodId, qty: 3, unitPrice: 50_000, name: 'غسالة اختبار سباق المخزون' }],
    })

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/admin/orders/${order1Id}/payments/confirm`)
        .set('Cookie', sessionCookie)
        .set('x-csrf-token', csrfToken)
        .send({ amount: 150_000 }),
      request(app.getHttpServer())
        .post(`/api/admin/orders/${order2Id}/payments/confirm`)
        .set('Cookie', sessionCookie)
        .set('x-csrf-token', csrfToken)
        .send({ amount: 150_000 }),
    ])

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)

    const product = await prisma.product.findUniqueOrThrow({ where: { id: prodId } })
    expect(product.stock).toBe(0)

    const m1 = await prisma.stockMovement.findFirstOrThrow({
      where: { orderId: order1Id, reason: 'order_confirmed' },
    })
    const m2 = await prisma.stockMovement.findFirstOrThrow({
      where: { orderId: order2Id, reason: 'order_confirmed' },
    })

    const movementQtys = [m1.qty, m2.qty].sort((a, b) => a - b)
    expect(movementQtys).toEqual([-3, 0])

    const shortageCounts = [res1.body.shortages.length, res2.body.shortages.length].sort((a, b) => a - b)
    expect(shortageCounts).toEqual([0, 1])

    const orderWithShortage = res1.body.shortages.length === 1 ? res1.body : res2.body
    expect(orderWithShortage.shortages[0]).toMatchObject({
      productId: prodId,
      requested: 3,
      taken: 0,
    })
  })

  it('prevents overpayment race when two partial payments on a confirmed order run in parallel', async () => {
    const prodId = await createTestProduct(10)
    const totalT = 100_000
    const partialAmount = Math.round(0.6 * totalT) // 60,000

    const orderId = await createTestOrder({
      status: 'confirmed',
      paymentMethod: 'instapay',
      total: totalT,
      paidAmount: 0,
      items: [{ productId: prodId, qty: 2, unitPrice: 50_000 }],
    })

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/admin/orders/${orderId}/payments/confirm`)
        .set('Cookie', sessionCookie)
        .set('x-csrf-token', csrfToken)
        .send({ amount: partialAmount }),
      request(app.getHttpServer())
        .post(`/api/admin/orders/${orderId}/payments/confirm`)
        .set('Cookie', sessionCookie)
        .set('x-csrf-token', csrfToken)
        .send({ amount: partialAmount }),
    ])

    const statuses = [res1.status, res2.status].sort()
    expect(statuses).toEqual([200, 409])

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
    expect(updatedOrder.paidAmount).toBe(partialAmount)

    const payments = await prisma.payment.findMany({ where: { orderId, status: 'confirmed' } })
    expect(payments).toHaveLength(1)
    expect(payments[0]?.amount).toBe(partialAmount)
  })
})

