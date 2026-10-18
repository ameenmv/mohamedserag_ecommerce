import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  piastresToEgp,
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

describe('Admin Orders API E2E (/api/admin/orders)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const testEmail = `admin-orders-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  let adminUserId = ''
  let sessionCookie = ''
  let csrfToken = ''

  let categoryId = ''
  let brandId = ''

  const createdOrderIds: string[] = []
  const createdProductIds: string[] = []

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // Ensure permissions
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
        name: `مدير الطلبات ${runId}`,
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
      await prisma.whatsAppMessage.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.stockMovement.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.auditLog.deleteMany({ where: { entityId: { in: createdOrderIds } } })
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    }

    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    }

    if (adminUserId) {
      await prisma.session.deleteMany({ where: { userId: adminUserId } })
      await prisma.userRole.deleteMany({ where: { userId: adminUserId } })
      await prisma.user.deleteMany({ where: { id: adminUserId } })
    }

    await app.close()
  })

  async function createTestOrder(opts: {
    status: OrderStatus
    paymentMethod: PaymentMethod
    customerName: string
    customerPhone: string
    total: number
    orderNo?: string
  }) {
    const p = await prisma.product.create({
      data: {
        modelCode: `ORD-${nanoid(8)}`,
        slug: `ord-${nanoid(8)}`,
        name: `منتج اختبار طلب ${nanoid(6)}`,
        brandId,
        categoryId,
        price: 50_000,
        stock: 10,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
      },
    })
    createdProductIds.push(p.id)

    const orderNo = opts.orderNo ?? `SR-2026-${nanoid(6).toUpperCase()}`
    const o = await prisma.order.create({
      data: {
        no: orderNo,
        status: opts.status,
        customerName: opts.customerName,
        customerPhone: opts.customerPhone,
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'zone-1',
        address: 'شارع الجمهورية',
        subtotal: opts.total,
        discount: 0,
        deliveryFee: 0,
        total: opts.total,
        paymentMethod: opts.paymentMethod,
        paidAmount: 0,
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        items: {
          create: [
            {
              productId: p.id,
              name: p.name,
              modelCode: p.modelCode,
              qty: 2,
              unitPrice: opts.total / 2,
            },
          ],
        },
      },
    })
    createdOrderIds.push(o.id)
    return o
  }

  it('enforces authentication and authorization', async () => {
    // 401 without session
    await request(app.getHttpServer()).get('/api/admin/orders').expect(401)
    await request(app.getHttpServer()).get('/api/admin/orders/export.csv').expect(401)

    // Create user without orders permissions
    const limitedPass = 'limited-secret'
    const limitedHash = await argon2.hash(limitedPass)
    const limitedUser = await prisma.user.create({
      data: {
        email: `limited-${runId}@serag.test`,
        name: 'مدير محدود',
        passwordHash: limitedHash,
        active: true,
      },
    })

    const loginRes = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: limitedUser.email, password: limitedPass })
      .expect(200)

    const setCookie = loginRes.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    const seragCookie = cookies.find((c: string) => c.startsWith('serag_sid='))
    const limitedCookie = seragCookie?.split(';')[0] ?? ''

    // 403 without orders.read
    await request(app.getHttpServer())
      .get('/api/admin/orders')
      .set('Cookie', limitedCookie)
      .expect(403)

    // Cleanup limited user
    await prisma.session.deleteMany({ where: { userId: limitedUser.id } })
    await prisma.user.delete({ where: { id: limitedUser.id } })
  })

  it('lists orders with filters, search, pagination, and status counts', async () => {
    const o1 = await createTestOrder({
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      customerName: `سعيد محفوظ ${runId}`,
      customerPhone: '01011112222',
      total: 200_000,
    })

    const o2 = await createTestOrder({
      status: 'new',
      paymentMethod: 'cod',
      customerName: `طارق رضوان ${runId}`,
      customerPhone: '01233334444',
      total: 150_000,
    })

    // Filter by status: awaiting_payment
    const resStatus = await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ status: 'awaiting_payment' })
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(resStatus.body.items.some((it: any) => it.id === o1.id)).toBe(true)
    expect(resStatus.body.items.some((it: any) => it.id === o2.id)).toBe(false)
    expect(resStatus.body.counts.awaiting_payment).toBeGreaterThanOrEqual(1)
    expect(resStatus.body.counts.new).toBeGreaterThanOrEqual(1)

    // Filter by paymentMethod: cod
    const resMethod = await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ paymentMethod: 'cod' })
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(resMethod.body.items.some((it: any) => it.id === o2.id)).toBe(true)
    expect(resMethod.body.items.some((it: any) => it.id === o1.id)).toBe(false)

    // Search by order number
    const resSearchNo = await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ q: o1.no })
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(resSearchNo.body.items).toHaveLength(1)
    expect(resSearchNo.body.items[0].no).toBe(o1.no)

    // Search by customer name
    const resSearchName = await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ q: `سعيد محفوظ ${runId}` })
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(resSearchName.body.items).toHaveLength(1)
    expect(resSearchName.body.items[0].id).toBe(o1.id)

    // Search by phone using Arabic-Indic digits
    const resSearchPhone = await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ q: '٠١٠١١١١٢٢٢٢' })
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(resSearchPhone.body.items.some((it: any) => it.id === o1.id)).toBe(true)

    // Pagination
    const resPage = await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ page: 1, pageSize: 1 })
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(resPage.body.pageSize).toBe(1)
    expect(resPage.body.items).toHaveLength(1)
  })

  it('updates internal notes and creates an audit log entry', async () => {
    const o = await createTestOrder({
      status: 'new',
      paymentMethod: 'cod',
      customerName: `عميل ملاحظات ${runId}`,
      customerPhone: '01122334455',
      total: 100_000,
    })

    const noteText = 'ملاحظة خاصة بالإدارة: العميل أكد بالتليفون'
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/admin/orders/${o.id}/notes`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ internalNotes: noteText })
      .expect(200)

    expect(patchRes.body.internalNotes).toBe(noteText)

    // Verify DB update
    const updated = await prisma.order.findUnique({ where: { id: o.id } })
    expect(updated?.internalNotes).toBe(noteText)

    // Verify audit log entry
    const audit = await prisma.auditLog.findFirst({
      where: { entity: 'order', entityId: o.id },
      orderBy: { at: 'desc' },
    })
    expect(audit).not.toBeNull()
  })

  it('logs whatsapp message and creates an audit log entry', async () => {
    const o = await createTestOrder({
      status: 'confirmed',
      paymentMethod: 'cod',
      customerName: `عميل واتساب ${runId}`,
      customerPhone: '01511223344',
      total: 80_000,
    })

    const postRes = await request(app.getHttpServer())
      .post(`/api/admin/orders/${o.id}/whatsapp`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        templateKey: 'order_confirmed',
        to: o.customerPhone,
        variables: {
          customerName: 'عميل واتساب',
          orderNo: o.no,
          total: '800 ج.م',
        },
      })
      .expect(201)

    expect(postRes.body.id).toBeDefined()

    // Verify WhatsAppMessage created
    const msg = await prisma.whatsAppMessage.findUnique({ where: { id: postRes.body.id } })
    expect(msg).not.toBeNull()
    expect(msg?.channel).toBe('link')
    expect(msg?.status).toBe('opened')
    expect(msg?.templateKey).toBe('order_confirmed')

    // Verify audit log entry
    const audit = await prisma.auditLog.findFirst({
      where: { entity: 'order', entityId: o.id },
      orderBy: { at: 'desc' },
    })
    expect(audit).not.toBeNull()
  })

  it('exports orders as CSV with UTF-8 BOM, Arabic headers, and EGP amounts', async () => {
    const o = await createTestOrder({
      status: 'delivered',
      paymentMethod: 'instapay',
      customerName: `عميل التصدير ${runId}`,
      customerPhone: '01099887766',
      total: 250_000,
    })

    const res = await request(app.getHttpServer())
      .get('/api/admin/orders/export.csv')
      .query({ q: o.no })
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="orders-\d{4}-\d{2}-\d{2}\.csv"/)

    const text = res.text
    // UTF-8 BOM is \uFEFF (first character code 0xFEFF)
    expect(text.charCodeAt(0)).toBe(0xfeff)

    // Contains Arabic headers
    expect(text).toContain('رقم الطلب,النوع,التاريخ,العميل,الموبايل,المحافظة,المدينة,عدد القطع,الإجمالي (ج.م),المدفوع (ج.م),طريقة الدفع,الحالة')

    // Contains seeded order details
    expect(text).toContain(o.no)
    expect(text).toContain('طلب')
    expect(text).toContain(o.customerName)
    expect(text).toContain(o.customerPhone)
    expect(text).toContain(String(piastresToEgp(o.total)))
  })
})
