import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  cairoEndOfDay,
  cairoToday,
  formatEgpWithUnit,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type AdminBridalTier,
  type BridalExpiringItem,
  type BridalRepriceResult,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import type { Prisma } from '../src/generated/prisma/client.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Admin Bridal API E2E (/api/admin/bridal, /api/admin/orders/:id/...)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `admin-bridal-owner-${runId}@serag.test`
  const restrictedEmail = `admin-bridal-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let ownerCsrfToken = ''

  let restrictedUserId = ''
  let restrictedSessionCookie = ''
  let restrictedCsrfToken = ''

  let categoryId = ''
  let brandId = ''

  let prod1Id = ''
  let prodOosId = ''

  const price1 = 100_000 // 1,000 EGP
  const priceOos = 150_000 // 1,500 EGP

  const createdProductIds: string[] = []
  const createdOrderIds: string[] = []
  const createdListIds: string[] = []
  const createdTierIds: string[] = []

  let ipCounter = 1
  const nextIp = () => `10.2.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  let originalBridalSetting: Prisma.InputJsonValue | null = null

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // Ensure all permissions exist
    for (const key of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      })
    }

    // Owner role (has all permissions)
    const ownerRole = await prisma.role.upsert({
      where: { key: OWNER_ROLE_KEY },
      update: { name: 'مدير كامل' },
      create: { key: OWNER_ROLE_KEY, name: 'مدير كامل' },
    })

    const perms = await prisma.permission.findMany()
    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: p.id },
      })
    }

    // Restricted role (orders only, NO bridal.manage)
    const restrictedRoleKey = `restricted-${runId}`
    const restrictedRole = await prisma.role.create({
      data: { key: restrictedRoleKey, name: 'موظف طلبات فقط' },
    })

    const ordersPerms = perms.filter((p) =>
      p.key === PERMISSIONS.orders.read || p.key === PERMISSIONS.orders.update,
    )
    for (const p of ordersPerms) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: p.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)

    // Create Owner user
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير عام ${runId}`,
        passwordHash,
        active: true,
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    })
    ownerUserId = ownerUser.id

    // Create Restricted user
    const restrictedUser = await prisma.user.create({
      data: {
        email: restrictedEmail,
        name: `موظف بدون باقات ${runId}`,
        passwordHash,
        active: true,
        roles: { create: [{ roleId: restrictedRole.id }] },
      },
    })
    restrictedUserId = restrictedUser.id

    // Login Owner
    const loginOwnerRes = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({ email: ownerEmail, password: testPassword })
      .expect(200)

    const ownerSetCookie = loginOwnerRes.headers['set-cookie']
    const ownerCookies = Array.isArray(ownerSetCookie) ? ownerSetCookie : ownerSetCookie ? [ownerSetCookie] : []
    const ownerSid = ownerCookies.find((c: string) => c.startsWith('serag_sid='))
    ownerSessionCookie = ownerSid?.split(';')[0] ?? ''
    ownerCsrfToken = loginOwnerRes.body.csrfToken

    // Login Restricted
    const loginRestrictedRes = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({ email: restrictedEmail, password: testPassword })
      .expect(200)

    const restrictedSetCookie = loginRestrictedRes.headers['set-cookie']
    const restrictedCookies = Array.isArray(restrictedSetCookie) ? restrictedSetCookie : restrictedSetCookie ? [restrictedSetCookie] : []
    const restrictedSid = restrictedCookies.find((c: string) => c.startsWith('serag_sid='))
    restrictedSessionCookie = restrictedSid?.split(';')[0] ?? ''
    restrictedCsrfToken = loginRestrictedRes.body.csrfToken

    // Lookup Category and Brand
    const cat = await prisma.category.findFirst({ orderBy: { sort: 'asc' } })
    if (!cat) throw new Error('No category found')
    categoryId = cat.id

    const br = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!br) throw new Error('No brand found')
    brandId = br.id

    // Create Products
    const p1 = await prisma.product.create({
      data: {
        modelCode: `AB-P1-${runId}`,
        slug: `ab-p1-${runId}`,
        name: `ثلاجة عروسة اختبار ${runId}`,
        brandId,
        categoryId,
        price: price1,
        stock: 10,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    prod1Id = p1.id
    createdProductIds.push(p1.id)

    const pOos = await prisma.product.create({
      data: {
        modelCode: `AB-POOS-${runId}`,
        slug: `ab-poos-${runId}`,
        name: `غسالة نافذة اختبار ${runId}`,
        brandId,
        categoryId,
        price: priceOos,
        stock: 0,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    prodOosId = pOos.id
    createdProductIds.push(pOos.id)

    // Save initial bridal settings
    const existingBridal = await prisma.setting.findUnique({ where: { key: 'bridal' } })
    originalBridalSetting = (existingBridal?.value ?? null) as Prisma.InputJsonValue | null

    await prisma.setting.upsert({
      where: { key: 'bridal' },
      update: { value: { depositPct: 10, lockDays: 30 } },
      create: { key: 'bridal', value: { depositPct: 10, lockDays: 30 } },
    })
  })

  afterAll(async () => {
    // Restore bridal settings
    if (originalBridalSetting === null) {
      await prisma.setting.deleteMany({ where: { key: 'bridal' } })
    } else {
      await prisma.setting.update({
        where: { key: 'bridal' },
        data: { value: originalBridalSetting },
      })
    }

    if (createdOrderIds.length > 0) {
      await prisma.whatsAppMessage.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.stockMovement.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.auditLog.deleteMany({ where: { entityId: { in: createdOrderIds } } })
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    }

    if (createdListIds.length > 0) {
      await prisma.bridalList.deleteMany({ where: { id: { in: createdListIds } } })
    }

    if (createdTierIds.length > 0) {
      await prisma.bridalTier.deleteMany({ where: { id: { in: createdTierIds } } })
    }

    if (createdProductIds.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: { in: createdProductIds } } })
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    }

    if (ownerUserId || restrictedUserId) {
      const userIds = [ownerUserId, restrictedUserId].filter(Boolean)
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
      await prisma.rolePermission.deleteMany({ where: { role: { key: `restricted-${runId}` } } })
      await prisma.role.deleteMany({ where: { key: `restricted-${runId}` } })
    }

    await app.close()
  })

  async function createBridalReservation(opts?: {
    status?: 'awaiting_deposit' | 'confirmed' | 'cancelled'
    bridalStatus?: 'awaiting_deposit' | 'locked' | 'delivery_agreed' | 'cancelled'
    lockedUntil?: Date | null
    agreedDeliveryDate?: Date | null
    qty?: number
    price?: number
    paidAmount?: number
  }) {
    const qty = opts?.qty ?? 2
    const itemPrice = opts?.price ?? price1
    const subtotal = qty * itemPrice
    const deliveryFee = 10_000
    const total = subtotal + deliveryFee
    const depositPct = 10
    const depositAmount = Math.round((total * depositPct) / 100)
    const paidAmount = opts?.paidAmount ?? depositAmount

    const list = await prisma.bridalList.create({
      data: {
        editToken: nanoid(32),
        shareToken: nanoid(32),
        status: opts?.bridalStatus ?? 'locked',
        rooms: [
          {
            key: 'kitchen',
            items: [{ productId: prod1Id, qty }],
          },
        ],
      },
    })
    createdListIds.push(list.id)

    const order = await prisma.order.create({
      data: {
        no: `SR-BR-${nanoid(6).toUpperCase()}`,
        type: 'bridal',
        status: opts?.status ?? 'confirmed',
        bridalStatus: opts?.bridalStatus ?? 'locked',
        customerName: `عروسة اختبار ${runId}`,
        customerPhone: '01012345678',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'حي الجامعة',
        subtotal,
        deliveryFee,
        total,
        depositPct,
        depositAmount,
        paidAmount,
        lockDays: 30,
        lockedUntil: opts?.lockedUntil !== undefined ? opts.lockedUntil : cairoEndOfDay(cairoToday()),
        agreedDeliveryDate: opts?.agreedDeliveryDate ?? null,
        paymentMethod: 'instapay',
        publicToken: nanoid(32),
        confirmToken: nanoid(32),
        bridalListId: list.id,
        items: {
          create: [
            {
              name: 'ثلاجة عروسة اختبار',
              modelCode: `AB-P1-${runId}`,
              qty,
              unitPrice: itemPrice,
              productId: prod1Id,
              taxRate: 14,
            },
          ],
        },
      },
    })
    createdOrderIds.push(order.id)
    return { order, list }
  }

  // 1. Permissions and CSRF
  describe('Permissions and CSRF protection', () => {
    it('rejects unauthenticated requests with 401 or 403', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/bridal/tiers')
        .set('X-Forwarded-For', nextIp())
        .expect((res) => {
          expect([401, 403]).toContain(res.status)
        })

      await request(app.getHttpServer())
        .get('/api/admin/bridal/expiring')
        .set('X-Forwarded-For', nextIp())
        .expect((res) => {
          expect([401, 403]).toContain(res.status)
        })
    })

    it('rejects admin without bridal.manage permission with 403 on tiers and settings', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/bridal/tiers')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .get('/api/admin/bridal/settings')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .put('/api/admin/bridal/settings')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ depositPct: 15, lockDays: 45 })
        .expect(403)
    })

    it('enforces CSRF token on POST/PUT mutations', async () => {
      const { order } = await createBridalReservation()

      await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/delivery-date`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send({ date: cairoToday() })
        .expect(403)

      await request(app.getHttpServer())
        .put('/api/admin/bridal/settings')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send({ depositPct: 15, lockDays: 45 })
        .expect(403)
    })
  })

  // 2. Delivery Date
  describe('POST /api/admin/orders/:id/delivery-date', () => {
    it('sets agreed delivery date, deducts stock with bridal_delivery_agreed reason, and updates statuses', async () => {
      // Set initial stock to 10
      await prisma.product.update({ where: { id: prod1Id }, data: { stock: 10 } })

      const { order, list } = await createBridalReservation({ qty: 3 })
      const deliveryDate = cairoToday()

      const res = await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/delivery-date`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ date: deliveryDate })
        .expect(200)

      expect(res.body.shortages).toEqual([])

      // Verify stock decreased from 10 to 7
      const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: prod1Id } })
      expect(updatedProduct.stock).toBe(7)

      // Verify stock movement
      const movement = await prisma.stockMovement.findFirst({
        where: { orderId: order.id, productId: prod1Id },
      })
      expect(movement).not.toBeNull()
      expect(movement?.qty).toBe(-3)
      expect(movement?.reason).toBe('bridal_delivery_agreed')

      // Verify order and list statuses
      const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
      expect(updatedOrder.bridalStatus).toBe('delivery_agreed')
      expect(updatedOrder.agreedDeliveryDate?.toISOString()).toContain(`${deliveryDate}T12:00:00`)

      const updatedList = await prisma.bridalList.findUniqueOrThrow({ where: { id: list.id } })
      expect(updatedList.status).toBe('delivery_agreed')

      // Double submit prevention: same call again returns 409
      await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/delivery-date`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ date: deliveryDate })
        .expect(409)

      // Stock was NOT deducted a second time
      const productAfterDouble = await prisma.product.findUniqueOrThrow({ where: { id: prod1Id } })
      expect(productAfterDouble.stock).toBe(7)
    })

    it('rejects delivery-date if order is not bridal or wrong status with 409', async () => {
      // Awaiting deposit order
      const { order } = await createBridalReservation({
        status: 'awaiting_deposit',
        bridalStatus: 'awaiting_deposit',
      })

      await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/delivery-date`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ date: cairoToday() })
        .expect(409)
    })
  })

  // 3. Cancel after delivery date restores stock
  describe('Cancel after agreed delivery date', () => {
    it('restores stock exactly and marks list cancelled', async () => {
      await prisma.product.update({ where: { id: prod1Id }, data: { stock: 10 } })

      const { order, list } = await createBridalReservation({ qty: 4 })

      // Agree delivery date (deducts 4 -> stock becomes 6)
      await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/delivery-date`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ date: cairoToday() })
        .expect(200)

      let prod = await prisma.product.findUniqueOrThrow({ where: { id: prod1Id } })
      expect(prod.stock).toBe(6)

      // Cancel order
      await request(app.getHttpServer())
        .patch(`/api/admin/orders/${order.id}/status`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ to: 'cancelled', reason: 'إلغاء بناء على طلب العميل' })
        .expect(200)

      // Verify stock restored back to 10
      prod = await prisma.product.findUniqueOrThrow({ where: { id: prod1Id } })
      expect(prod.stock).toBe(10)

      // Verify cancellation stock movement
      const cancelMovement = await prisma.stockMovement.findFirst({
        where: { orderId: order.id, reason: 'order_cancelled' },
      })
      expect(cancelMovement).not.toBeNull()
      expect(cancelMovement?.qty).toBe(4)

      // Verify list status cancelled
      const updatedList = await prisma.bridalList.findUniqueOrThrow({ where: { id: list.id } })
      expect(updatedList.status).toBe('cancelled')
    })
  })

  // 4. out_for_delivery guard
  describe('Manual status change guard for out_for_delivery', () => {
    it('blocks out_for_delivery with 409 when bridalStatus is not delivery_agreed', async () => {
      const { order } = await createBridalReservation({
        status: 'confirmed',
        bridalStatus: 'locked',
      })

      // Attempt to move to out_for_delivery before delivery date agreed
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/orders/${order.id}/status`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ to: 'out_for_delivery' })
        .expect(409)

      expect(res.body.message).toBe('لازم تحدد ميعاد التوصيل الأول')

      // Agree delivery date
      await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/delivery-date`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ date: cairoToday() })
        .expect(200)

      // Now out_for_delivery succeeds
      await request(app.getHttpServer())
        .patch(`/api/admin/orders/${order.id}/status`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ to: 'out_for_delivery' })
        .expect(200)

      const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
      expect(updated.status).toBe('out_for_delivery')
    })
  })

  // 5. Lock Extend
  describe('POST /api/admin/orders/:id/lock-extend', () => {
    it('validates date and updates lockedUntil to end of Cairo day', async () => {
      const { order } = await createBridalReservation()

      // Reject past date
      await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/lock-extend`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ until: '2020-01-01' })
        .expect(400)

      // Reject today (must be strictly after today Cairo)
      await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/lock-extend`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ until: cairoToday() })
        .expect(400)

      // Valid future date
      const futureDate = '2026-11-20'
      const res = await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/lock-extend`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ until: futureDate })
        .expect(200)

      const expectedEnd = cairoEndOfDay(futureDate)
      expect(new Date(res.body.lockedUntil).getTime()).toBe(expectedEnd.getTime())

      const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
      expect(updatedOrder.lockedUntil?.getTime()).toBe(expectedEnd.getTime())

      // OrderEvent created
      const event = await prisma.orderEvent.findFirst({
        where: { orderId: order.id, status: 'bridal_lock_extended' },
      })
      expect(event).not.toBeNull()
      expect(event?.note).toBe(futureDate)
    })
  })

  // 6. Reprice
  describe('POST /api/admin/orders/:id/reprice', () => {
    // The reprice test raises the catalog price; put it back so later tests see price1 again.
    afterEach(async () => {
      await prisma.product.update({ where: { id: prod1Id }, data: { price: price1 } })
    })

    it('updates items to current regular catalog prices, recalculates deposit, preserves paidAmount, and returns WhatsApp URL', async () => {
      // Product initially at price1 = 100,000 (1,000 EGP)
      await prisma.product.update({ where: { id: prod1Id }, data: { price: 100_000 } })

      // Create reservation: qty 2, oldSubtotal = 200,000, fee = 10,000, oldTotal = 210,000
      // depositPct = 10 -> oldDeposit = 21,000, paidAmount = 21,000
      const { order } = await createBridalReservation({
        qty: 2,
        price: 100_000,
        paidAmount: 21_000,
      })

      // Increase catalog product price to 140,000 (1,400 EGP)
      await prisma.product.update({ where: { id: prod1Id }, data: { price: 140_000 } })

      const res = await request(app.getHttpServer())
        .post(`/api/admin/orders/${order.id}/reprice`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body = res.body as BridalRepriceResult
      expect(body.oldTotal).toBe(210_000)
      expect(body.newTotal).toBe(290_000) // 2 * 140,000 + 10,000
      expect(body.difference).toBe(80_000)
      expect(body.whatsappUrl).toContain(order.no)
      expect(body.whatsappUrl).toContain(encodeURIComponent(formatEgpWithUnit(210_000)))
      expect(body.whatsappUrl).toContain(encodeURIComponent(formatEgpWithUnit(290_000)))

      // Check DB updates
      const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
      expect(updatedOrder.subtotal).toBe(280_000)
      expect(updatedOrder.total).toBe(290_000)
      expect(updatedOrder.depositAmount).toBe(29_000) // 10% of 290,000
      expect(updatedOrder.paidAmount).toBe(21_000) // Unchanged!
      expect(updatedOrder.lockedUntil).not.toBeNull()

      // OrderEvent created
      const event = await prisma.orderEvent.findFirst({
        where: { orderId: order.id, status: 'bridal_repriced' },
      })
      expect(event).not.toBeNull()
      expect(event?.note).toBe('210000 → 290000')
    })
  })

  // 7. Expiring List
  describe('GET /api/admin/bridal/expiring', () => {
    it('includes reservations expiring within 7 days or already expired, excludes ones beyond 7 days', async () => {
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000)
      const in3Days = new Date(Date.now() + 3 * 24 * 3600 * 1000)
      const in20Days = new Date(Date.now() + 20 * 24 * 3600 * 1000)

      const { order: oYesterday } = await createBridalReservation({ lockedUntil: yesterday })
      const { order: o3Days } = await createBridalReservation({ lockedUntil: in3Days })
      const { order: o20Days } = await createBridalReservation({ lockedUntil: in20Days })

      const res = await request(app.getHttpServer())
        .get('/api/admin/bridal/expiring')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const items = res.body.items as BridalExpiringItem[]
      const ids = items.map((i) => i.id)

      expect(ids).toContain(oYesterday.id)
      expect(ids).toContain(o3Days.id)
      expect(ids).not.toContain(o20Days.id)

      const itemYesterday = items.find((i) => i.id === oYesterday.id)
      expect(itemYesterday?.lockExpired).toBe(true)

      const item3Days = items.find((i) => i.id === o3Days.id)
      expect(item3Days?.lockExpired).toBe(false)
    })
  })

  // 8. Tiers GET / PUT roundtrip with flagged item
  describe('Tiers GET/PUT round trip with flagged item', () => {
    it('flags unavailable items, validates unknown products on update, and returns updated tier', async () => {
      // Create a test tier with one available product and one out-of-stock product
      const tier = await prisma.bridalTier.create({
        data: {
          name: `باقة عروسة اختبارية ${runId}`,
          slug: `tier-test-${runId}`,
          sort: 999,
          highlights: ['ميزة اختبار 1', 'ميزة اختبار 2'],
          rooms: [
            {
              key: 'kitchen',
              items: [
                { productId: prod1Id, qty: 1 },
                { productId: prodOosId, qty: 1 },
              ],
            },
          ],
        },
      })
      createdTierIds.push(tier.id)

      // GET tiers
      const getRes = await request(app.getHttpServer())
        .get('/api/admin/bridal/tiers')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const tiers = getRes.body.tiers as AdminBridalTier[]
      const found = tiers.find((t) => t.id === tier.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe(tier.name)

      const kitchenRoom = found?.rooms.find((r) => r.key === 'kitchen')
      expect(kitchenRoom).toBeDefined()

      const itemAvailable = kitchenRoom?.items.find((i) => i.productId === prod1Id)
      expect(itemAvailable?.flagged).toBe(false)

      const itemOos = kitchenRoom?.items.find((i) => i.productId === prodOosId)
      expect(itemOos?.flagged).toBe(true)

      // Total only sums available items
      expect(found?.total).toBe(price1)

      // PUT with unknown productId -> 400
      await request(app.getHttpServer())
        .put(`/api/admin/bridal/tiers/${tier.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: 'اسم محدث',
          highlights: ['ميزة جديدة'],
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: 'non-existent-product-id', qty: 1 }],
            },
          ],
        })
        .expect(400)

      // PUT with unknown tier -> 404
      await request(app.getHttpServer())
        .put('/api/admin/bridal/tiers/non-existent-tier-id')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: 'اسم محدث',
          highlights: ['ميزة جديدة'],
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: prod1Id, qty: 2 }],
            },
          ],
        })
        .expect(404)

      // PUT with valid data -> 200
      const putRes = await request(app.getHttpServer())
        .put(`/api/admin/bridal/tiers/${tier.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `باقة معدلة ${runId}`,
          highlights: ['ميزة جديدة 1', 'ميزة جديدة 2'],
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: prod1Id, qty: 2 }],
            },
          ],
        })
        .expect(200)

      expect(putRes.body.name).toBe(`باقة معدلة ${runId}`)
      expect(putRes.body.highlights).toEqual(['ميزة جديدة 1', 'ميزة جديدة 2'])
      expect(putRes.body.total).toBe(2 * price1)
    })
  })

  // 9. Settings PUT then reserve quote uses new deposit %
  describe('Settings PUT and public reserve quote interaction', () => {
    it('updates bridal settings and reflects new depositPct in public reserve quote', async () => {
      // Update settings to depositPct: 25, lockDays: 45
      await request(app.getHttpServer())
        .put('/api/admin/bridal/settings')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ depositPct: 25, lockDays: 45 })
        .expect(200)

      // GET settings
      const settingsRes = await request(app.getHttpServer())
        .get('/api/admin/bridal/settings')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(settingsRes.body.depositPct).toBe(25)
      expect(settingsRes.body.lockDays).toBe(45)

      // Create a draft bridal list
      const editToken = nanoid(32)
      const list = await prisma.bridalList.create({
        data: {
          editToken,
          shareToken: nanoid(32),
          status: 'draft',
          rooms: [
            {
              key: 'kitchen',
              items: [{ productId: prod1Id, qty: 1 }],
            },
          ],
        },
      })
      createdListIds.push(list.id)

      // Call public reserve quote
      const quoteRes = await request(app.getHttpServer())
        .get(`/api/bridal/reserve-quote/${editToken}`)
        .query({ governorate: 'الدقهلية', city: 'المنصورة' })
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(quoteRes.body.depositPct).toBe(25)
      expect(quoteRes.body.lockDays).toBe(45)
      expect(quoteRes.body.depositAmount).toBe(Math.round(quoteRes.body.total * 0.25))
    })
  })

  // 10. Orders list and detail bridal integration
  describe('Admin orders list type filter and detail bridal block', () => {
    it('filters orders by type, adds bridal fields on rows, and includes bridal block in detail', async () => {
      const { order: bridalOrder, list } = await createBridalReservation()

      // List with type=bridal
      const bridalListRes = await request(app.getHttpServer())
        .get('/api/admin/orders')
        .query({ type: 'bridal', q: bridalOrder.no })
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(bridalListRes.body.items).toHaveLength(1)
      const bridalRow = bridalListRes.body.items[0]
      expect(bridalRow.id).toBe(bridalOrder.id)
      expect(bridalRow.type).toBe('bridal')
      expect(bridalRow.bridalStatus).toBe('locked')
      expect(bridalRow.lockExpired).toBeDefined()
      expect(bridalRow.lockDaysLeft).toBeDefined()

      // List with type=order should NOT contain the bridal order
      const retailListRes = await request(app.getHttpServer())
        .get('/api/admin/orders')
        .query({ type: 'order', q: bridalOrder.no })
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(retailListRes.body.items).toHaveLength(0)

      // Get detail
      const detailRes = await request(app.getHttpServer())
        .get(`/api/admin/orders/${bridalOrder.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(detailRes.body.type).toBe('bridal')
      expect(detailRes.body.bridal).not.toBeNull()
      expect(detailRes.body.bridal.status).toBe('locked')
      expect(detailRes.body.bridal.lockDays).toBe(30)
      expect(detailRes.body.bridal.listShareToken).toBe(list.shareToken)
    })
  })
})
