import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  cairoDateKey,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type DashboardSummary,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const ALL_COUNTER_IDS = [
  'newOrders',
  'awaitingPayment',
  'awaitingDeposit',
  'locksExpiring',
  'pendingReviews',
  'notifyReady',
  'lowStock',
] as const

describe('Admin Dashboard API E2E (/api/admin/dashboard)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `admin-dashboard-owner-${runId}@serag.test`
  const restrictedEmail = `admin-dashboard-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  const restrictedRoleKey = `restricted-dashboard-${runId}`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let restrictedUserId = ''
  let restrictedSessionCookie = ''

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

    for (const key of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      })
    }

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

    const restrictedRole = await prisma.role.create({
      data: { key: restrictedRoleKey, name: 'موظف مراجعات فقط' },
    })
    for (const p of perms.filter((perm) => perm.key === PERMISSIONS.reviews.moderate)) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: p.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير اللوحة ${runId}`,
        passwordHash,
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    })
    ownerUserId = ownerUser.id

    const restrictedUser = await prisma.user.create({
      data: {
        email: restrictedEmail,
        name: `موظف مراجعات ${runId}`,
        passwordHash,
        roles: { create: [{ roleId: restrictedRole.id }] },
      },
    })
    restrictedUserId = restrictedUser.id

    const ownerLogin = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: ownerEmail, password: testPassword })
      .expect(200)
    ownerSessionCookie = extractSessionCookie(ownerLogin.headers['set-cookie'])

    const restrictedLogin = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: restrictedEmail, password: testPassword })
      .expect(200)
    restrictedSessionCookie = extractSessionCookie(restrictedLogin.headers['set-cookie'])

    const cat = await prisma.category.findFirst({ orderBy: { sort: 'asc' } })
    if (!cat) throw new Error('No category found')
    categoryId = cat.id

    const br = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!br) throw new Error('No brand found')
    brandId = br.id
  })

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.whatsAppMessage.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.stockMovement.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    }

    if (createdProductIds.length > 0) {
      await prisma.notifyRequest.deleteMany({ where: { productId: { in: createdProductIds } } })
      await prisma.review.deleteMany({ where: { productId: { in: createdProductIds } } })
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    }

    const userIds = [ownerUserId, restrictedUserId].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
      await prisma.rolePermission.deleteMany({ where: { role: { key: restrictedRoleKey } } })
      await prisma.role.deleteMany({ where: { key: restrictedRoleKey } })
    }

    await app.close()
  })

  function extractSessionCookie(setCookie: string | string[] | undefined): string {
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    const sid = cookies.find((c) => c.startsWith('serag_sid='))
    return sid?.split(';')[0] ?? ''
  }

  async function createProduct(overrides: {
    stock?: number
    lowStockThreshold?: number
    availabilityMode?: 'auto' | 'on_request' | 'out'
    visible?: boolean
  }): Promise<string> {
    const product = await prisma.product.create({
      data: {
        modelCode: `DASH-${nanoid(8)}`,
        slug: `dash-${nanoid(8)}`,
        name: `منتج لوحة ${nanoid(6)}`,
        brandId,
        categoryId,
        price: 50_000,
        stock: overrides.stock ?? 10,
        lowStockThreshold: overrides.lowStockThreshold ?? 1,
        availabilityMode: overrides.availabilityMode ?? 'auto',
        visible: overrides.visible ?? true,
      },
    })
    createdProductIds.push(product.id)
    return product.id
  }

  async function createOrder(opts: {
    status: 'new' | 'awaiting_payment' | 'awaiting_deposit' | 'confirmed' | 'delivered'
    total: number
    type?: 'order' | 'bridal'
    bridalStatus?: 'locked' | null
    lockedUntil?: Date | null
    depositAmount?: number | null
    deliveredEventAt?: Date | null
  }): Promise<{ id: string; no: string }> {
    const no = `SR-DASH-${nanoid(8).toUpperCase()}`
    const order = await prisma.order.create({
      data: {
        no,
        type: opts.type ?? 'order',
        status: opts.status,
        customerName: `عميل لوحة ${runId}`,
        customerPhone: '01000000000',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجمهورية',
        subtotal: opts.total,
        discount: 0,
        deliveryFee: 0,
        total: opts.total,
        paymentMethod: 'cod',
        paidAmount: 0,
        depositAmount: opts.depositAmount ?? null,
        bridalStatus: opts.bridalStatus ?? null,
        lockedUntil: opts.lockedUntil ?? null,
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
      },
    })
    createdOrderIds.push(order.id)

    if (opts.deliveredEventAt) {
      await prisma.orderEvent.create({
        data: { orderId: order.id, status: 'delivered', at: opts.deliveredEventAt },
      })
    }

    return { id: order.id, no: order.no }
  }

  async function readSummary(cookie: string, range?: number): Promise<DashboardSummary> {
    const req = request(app.getHttpServer())
      .get('/api/admin/dashboard/summary')
      .set('Cookie', cookie)
    if (range !== undefined) req.query({ range })
    const res = await req.expect(200)
    return res.body as DashboardSummary
  }

  function counterCount(summary: DashboardSummary, id: string): number {
    const counter = summary.counters.find((c) => c.id === id)
    if (!counter) throw new Error(`counter ${id} not visible`)
    return counter.count
  }

  // ==========================================================================
  // Scenario 1: auth and validation
  // ==========================================================================
  it('rejects unauthenticated requests and out-of-range values', async () => {
    await request(app.getHttpServer()).get('/api/admin/dashboard/summary').expect(401)

    await request(app.getHttpServer())
      .get('/api/admin/dashboard/summary')
      .query({ range: 15 })
      .set('Cookie', ownerSessionCookie)
      .expect(400)

    const summary = await readSummary(ownerSessionCookie)
    expect(summary.range).toBe(30)
  })

  // ==========================================================================
  // Scenario 2: every counter moves by exactly one
  // ==========================================================================
  it('shows all seven counters and increments each seeded counter by one', async () => {
    const baseline = await readSummary(ownerSessionCookie, 30)
    expect(baseline.counters.map((c) => c.id).sort()).toEqual([...ALL_COUNTER_IDS].sort())

    const notificationProductId = await createProduct({ stock: 10, lowStockThreshold: 1 })
    await prisma.notifyRequest.create({
      data: {
        productId: notificationProductId,
        name: 'عميلة انتظار',
        phone: '01055556666',
        status: 'waiting',
      },
    })

    await createProduct({ stock: 1, lowStockThreshold: 3, availabilityMode: 'auto', visible: true })

    await createOrder({ status: 'new', total: 100_000 })
    await createOrder({ status: 'awaiting_payment', total: 120_000 })
    await createOrder({ status: 'awaiting_deposit', total: 140_000 })
    await createOrder({
      status: 'confirmed',
      type: 'bridal',
      bridalStatus: 'locked',
      lockedUntil: new Date(Date.now() + 3 * 86_400_000),
      total: 200_000,
    })

    const reviewProductId = await createProduct({ stock: 10, lowStockThreshold: 1 })
    await prisma.review.create({
      data: {
        productId: reviewProductId,
        name: 'مراجع منتظر',
        phone: '01077778888',
        stars: 5,
        text: 'منتج ممتاز ويستحق المراجعة فورا',
        status: 'pending',
      },
    })

    const after = await readSummary(ownerSessionCookie, 30)

    expect(counterCount(after, 'newOrders') - counterCount(baseline, 'newOrders')).toBe(1)
    expect(counterCount(after, 'awaitingPayment') - counterCount(baseline, 'awaitingPayment')).toBe(
      1,
    )
    expect(counterCount(after, 'awaitingDeposit') - counterCount(baseline, 'awaitingDeposit')).toBe(
      1,
    )
    expect(counterCount(after, 'locksExpiring') - counterCount(baseline, 'locksExpiring')).toBe(1)
    expect(counterCount(after, 'pendingReviews') - counterCount(baseline, 'pendingReviews')).toBe(1)
    expect(counterCount(after, 'notifyReady') - counterCount(baseline, 'notifyReady')).toBe(1)
    expect(counterCount(after, 'lowStock') - counterCount(baseline, 'lowStock')).toBe(1)
  })

  // ==========================================================================
  // Scenario 3: restricted admin sees only pendingReviews
  // ==========================================================================
  it('hides counters the admin cannot open', async () => {
    const summary = await readSummary(restrictedSessionCookie, 30)
    expect(summary.counters.map((c) => c.id)).toEqual(['pendingReviews'])
  })

  // ==========================================================================
  // Scenario 4: revenue, delivered orders, deposits
  // ==========================================================================
  it('counts revenue by delivery day and deposits separately', async () => {
    const before = await readSummary(ownerSessionCookie, 30)
    const today = cairoDateKey(new Date())
    const beforeToday = before.series.find((point) => point.date === today)
    expect(beforeToday).toBeDefined()

    const delivered = await createOrder({
      status: 'delivered',
      total: 1_000_000,
      deliveredEventAt: new Date(),
    })
    await createOrder({ status: 'confirmed', total: 500_000 })

    const depositOrder = await createOrder({
      status: 'confirmed',
      total: 300_000,
      depositAmount: 50_000,
    })
    await prisma.payment.create({
      data: {
        orderId: depositOrder.id,
        method: 'instapay',
        amount: 50_000,
        status: 'confirmed',
        at: new Date(),
      },
    })

    const after = await readSummary(ownerSessionCookie, 30)
    const afterToday = after.series.find((point) => point.date === today)
    if (!beforeToday || !afterToday) throw new Error('missing today series point')

    expect(afterToday.revenue - beforeToday.revenue).toBe(1_000_000)
    expect(afterToday.deliveredOrders - beforeToday.deliveredOrders).toBe(1)
    expect(afterToday.deposits - beforeToday.deposits).toBe(50_000)
    expect(after.totals.revenue - before.totals.revenue).toBe(1_000_000)

    expect(delivered.id).toBeTruthy()
  })

  // ==========================================================================
  // Scenario 5: old delivered event belongs to a wider range only
  // ==========================================================================
  it('includes a 40-day-old delivery in range=90 but not range=30', async () => {
    const oldEvent = new Date(Date.now() - 40 * 86_400_000)
    await createOrder({
      status: 'delivered',
      total: 400_000,
      deliveredEventAt: oldEvent,
    })

    const summary30 = await readSummary(ownerSessionCookie, 30)
    const summary90 = await readSummary(ownerSessionCookie, 90)

    expect(summary30.series).toHaveLength(30)
    expect(summary90.series).toHaveLength(90)

    const oldKey = cairoDateKey(oldEvent)
    expect(summary30.series.map((p) => p.date)).not.toContain(oldKey)
    expect(summary90.series.map((p) => p.date)).toContain(oldKey)
  })

  // ==========================================================================
  // Scenario 6: lockExpiring orders filter
  // ==========================================================================
  it('filters orders by expiring bridal locks', async () => {
    const expiring = await createOrder({
      status: 'confirmed',
      type: 'bridal',
      bridalStatus: 'locked',
      lockedUntil: new Date(Date.now() + 3 * 86_400_000),
      total: 250_000,
    })
    const far = await createOrder({
      status: 'confirmed',
      type: 'bridal',
      bridalStatus: 'locked',
      lockedUntil: new Date(Date.now() + 20 * 86_400_000),
      total: 260_000,
    })

    const expiringRes = await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ lockExpiring: 7, q: expiring.no })
      .set('Cookie', ownerSessionCookie)
      .expect(200)

    const expiringIds = (expiringRes.body.items as Array<{ id: string }>).map((item) => item.id)
    expect(expiringIds).toContain(expiring.id)

    const farRes = await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ lockExpiring: 7, q: far.no })
      .set('Cookie', ownerSessionCookie)
      .expect(200)

    const farIds = (farRes.body.items as Array<{ id: string }>).map((item) => item.id)
    expect(farIds).not.toContain(far.id)

    await request(app.getHttpServer())
      .get('/api/admin/orders')
      .query({ lockExpiring: 5 })
      .set('Cookie', ownerSessionCookie)
      .expect(400)
  })
})
