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

describe('Admin Confirm API E2E (/api/admin/confirm)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const testEmail = `admin-confirm-${runId}@serag.test`
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
        name: `مدير تأكيد الطلبات ${runId}`,
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
        modelCode: `CONF-${nanoid(8)}`,
        slug: `conf-${nanoid(8)}`,
        name: `منتج اختبار تأكيد ${nanoid(6)}`,
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
    customerName?: string
    customerPhone?: string
    items: Array<{ productId: string; qty: number; unitPrice: number }>
  }): Promise<{ orderId: string; confirmToken: string; no: string }> {
    const confirmToken = nanoid(24)
    const o = await prisma.order.create({
      data: {
        no: `SR-2026-${nanoid(6).toUpperCase()}`,
        status: opts.status,
        customerName: opts.customerName ?? 'أحمد مصطفى',
        customerPhone: opts.customerPhone ?? '01012345678',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجمهورية',
        subtotal: opts.total,
        discount: 0,
        deliveryFee: 0,
        total: opts.total,
        paidAmount: opts.paidAmount ?? 0,
        paymentMethod: opts.paymentMethod,
        depositPct: opts.depositPct ?? null,
        depositAmount: opts.depositAmount ?? null,
        publicToken: nanoid(24),
        confirmToken,
        items: {
          create: opts.items.map((i) => ({
            productId: i.productId,
            name: 'منتج تأكيد',
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
    return { orderId: o.id, confirmToken, no: o.no }
  }

  it('returns 401 without an admin session', async () => {
    const prodId = await createTestProduct(5)
    const { confirmToken } = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 50_000,
      items: [{ productId: prodId, qty: 1, unitPrice: 50_000 }],
    })

    await request(app.getHttpServer()).get(`/api/admin/confirm/${confirmToken}`).expect(401)
    await request(app.getHttpServer())
      .post(`/api/admin/confirm/${confirmToken}/confirm`)
      .send({ amount: 50_000 })
      .expect(401)
  })

  it('returns 403 without CSRF token on POST mutations', async () => {
    const prodId = await createTestProduct(5)
    const { confirmToken } = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 50_000,
      items: [{ productId: prodId, qty: 1, unitPrice: 50_000 }],
    })

    await request(app.getHttpServer())
      .post(`/api/admin/confirm/${confirmToken}/confirm`)
      .set('Cookie', sessionCookie)
      .send({ amount: 50_000 })
      .expect(403)

    await request(app.getHttpServer())
      .post(`/api/admin/confirm/${confirmToken}/reject`)
      .set('Cookie', sessionCookie)
      .send({ reason: 'إيصال غير صالح' })
      .expect(403)
  })

  it('returns 404 for unknown confirm token', async () => {
    const unknownToken = nanoid(24)
    await request(app.getHttpServer())
      .get(`/api/admin/confirm/${unknownToken}`)
      .set('Cookie', sessionCookie)
      .expect(404)

    await request(app.getHttpServer())
      .post(`/api/admin/confirm/${unknownToken}/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 10_000 })
      .expect(404)
  })

  it('returns summary for an InstaPay order with expectedAmount = total and canConfirm = true', async () => {
    const prodId = await createTestProduct(5)
    const { confirmToken, orderId, no } = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 150_000,
      customerName: 'محمود سعد',
      items: [{ productId: prodId, qty: 3, unitPrice: 50_000 }],
    })

    const res = await request(app.getHttpServer())
      .get(`/api/admin/confirm/${confirmToken}`)
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(res.body).toMatchObject({
      orderId,
      no,
      status: 'awaiting_payment',
      customerFirstName: 'محمود',
      total: 150_000,
      paidAmount: 0,
      expectedAmount: 150_000,
      method: 'instapay',
      methodLabel: 'إنستا باي',
      deposit: null,
      canConfirm: true,
      canReject: true,
    })
  })

  it('returns summary for a large-COD order with expectedAmount = deposit', async () => {
    const prodId = await createTestProduct(10)
    const { confirmToken } = await createTestOrder({
      status: 'awaiting_deposit',
      paymentMethod: 'cod',
      total: 3_500_000,
      depositPct: 10,
      depositAmount: 350_000,
      items: [{ productId: prodId, qty: 1, unitPrice: 3_500_000 }],
    })

    const res = await request(app.getHttpServer())
      .get(`/api/admin/confirm/${confirmToken}`)
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(res.body.expectedAmount).toBe(350_000)
    expect(res.body.deposit).toEqual({ pct: 10, amount: 350_000 })
    expect(res.body.canConfirm).toBe(true)
    expect(res.body.canReject).toBe(true)
  })

  it('confirms order, marks canConfirm false afterwards, and GET still returns 200', async () => {
    const prodId = await createTestProduct(5)
    const { confirmToken } = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 50_000,
      items: [{ productId: prodId, qty: 1, unitPrice: 50_000 }],
    })

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${confirmToken}/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 50_000, note: 'تحويل معتمد من التطبيق' })
      .expect(200)

    expect(confirmRes.body.status).toBe('confirmed')
    expect(confirmRes.body.paidAmount).toBe(50_000)
    expect(confirmRes.body.canConfirm).toBe(false)
    expect(confirmRes.body.canReject).toBe(false)

    // GET still returns 200 with canConfirm=false
    const getRes = await request(app.getHttpServer())
      .get(`/api/admin/confirm/${confirmToken}`)
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(getRes.body.status).toBe('confirmed')
    expect(getRes.body.canConfirm).toBe(false)
  })

  it('rejects order with reason and returns rejectWhatsappUrl starting https://wa.me/2010', async () => {
    const prodId = await createTestProduct(5)
    const { confirmToken, no } = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'vodafone_cash',
      total: 50_000,
      customerName: 'فاطمة علي',
      customerPhone: '01099887766',
      items: [{ productId: prodId, qty: 1, unitPrice: 50_000 }],
    })

    const rejectRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${confirmToken}/reject`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ reason: 'رقم المحفظة المحول منها غير مسجل' })
      .expect(200)

    expect(rejectRes.body.status).toBe('payment_rejected')
    expect(rejectRes.body.rejectWhatsappUrl).toBeDefined()
    expect(rejectRes.body.rejectWhatsappUrl).toMatch(/^https:\/\/wa\.me\/2010/)

    const decodedUrl = decodeURIComponent(rejectRes.body.rejectWhatsappUrl)
    expect(decodedUrl).toContain('رقم المحفظة المحول منها غير مسجل')
    expect(decodedUrl).toContain(no)
    expect(decodedUrl).toContain('فاطمة علي')
  })

  it('supports confirming an order after rejection via the same confirm link', async () => {
    const prodId = await createTestProduct(5)
    const { confirmToken } = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      total: 50_000,
      items: [{ productId: prodId, qty: 1, unitPrice: 50_000 }],
    })

    // First reject
    await request(app.getHttpServer())
      .post(`/api/admin/confirm/${confirmToken}/reject`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ reason: 'إيصال ناقص التاريخ' })
      .expect(200)

    // Inspect GET -> canConfirm should be true
    const checkRes = await request(app.getHttpServer())
      .get(`/api/admin/confirm/${confirmToken}`)
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(checkRes.body.status).toBe('payment_rejected')
    expect(checkRes.body.canConfirm).toBe(true)

    // Now confirm
    const confirmRes = await request(app.getHttpServer())
      .post(`/api/admin/confirm/${confirmToken}/confirm`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ amount: 50_000, note: 'تم إرسال إيصال صحيح' })
      .expect(200)

    expect(confirmRes.body.status).toBe('confirmed')
    expect(confirmRes.body.canConfirm).toBe(false)
  })
})
