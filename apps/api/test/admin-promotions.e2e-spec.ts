import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { ALL_PERMISSIONS, OWNER_ROLE_KEY, PERMISSIONS } from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Admin Promotions API E2E (/api/admin/flash-sales, /api/admin/coupons)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `admin-promo-owner-${runId}@serag.test`
  const restrictedEmail = `admin-promo-restricted-${runId}@serag.test`
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
  let prod1Slug = ''
  let prod1Name = ''
  let prod1ModelCode = ''
  const prod1Price = 100_000 // 1,000 EGP

  let prod2Id = ''
  let prod2Slug = ''
  let prod2Name = ''
  let prod2ModelCode = ''
  const prod2Price = 200_000 // 2,000 EGP

  let prodArchivedId = ''

  const createdProductIds: string[] = []
  const createdSaleIds: string[] = []
  const createdCouponIds: string[] = []
  const createdOrderIds: string[] = []

  let ipCounter = 1
  const nextIp = () => `10.4.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

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

    // Restricted role (orders permissions only, WITHOUT promotions.manage)
    const restrictedRoleKey = `restricted-${runId}`
    const restrictedRole = await prisma.role.create({
      data: { key: restrictedRoleKey, name: 'موظف بدون صلاحيات العروض' },
    })

    const nonPromoPerms = perms.filter(
      (p) => p.key === PERMISSIONS.orders.read || p.key === PERMISSIONS.orders.update,
    )
    for (const p of nonPromoPerms) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: p.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)

    // Create Owner user
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير عروض ${runId}`,
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
        name: `موظف بدون عروض ${runId}`,
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
    const ownerCookies = Array.isArray(ownerSetCookie)
      ? ownerSetCookie
      : ownerSetCookie
        ? [ownerSetCookie]
        : []
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
    const restrictedCookies = Array.isArray(restrictedSetCookie)
      ? restrictedSetCookie
      : restrictedSetCookie
        ? [restrictedSetCookie]
        : []
    const restrictedSid = restrictedCookies.find((c: string) => c.startsWith('serag_sid='))
    restrictedSessionCookie = restrictedSid?.split(';')[0] ?? ''
    restrictedCsrfToken = loginRestrictedRes.body.csrfToken

    // Category and Brand
    const cat = await prisma.category.findFirst({ orderBy: { sort: 'asc' } })
    if (!cat) throw new Error('No category found')
    categoryId = cat.id

    const br = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!br) throw new Error('No brand found')
    brandId = br.id

    // Products
    prod1Slug = `prod1-promo-${runId}`
    prod1Name = `غسالة عروض ${runId}`
    prod1ModelCode = `WM-${runId}`
    const p1 = await prisma.product.create({
      data: {
        modelCode: prod1ModelCode,
        slug: prod1Slug,
        name: prod1Name,
        brandId,
        categoryId,
        price: prod1Price,
        stock: 20,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    prod1Id = p1.id
    createdProductIds.push(p1.id)

    prod2Slug = `prod2-promo-${runId}`
    prod2Name = `ثلاجة عروض ${runId}`
    prod2ModelCode = `RF-${runId}`
    const p2 = await prisma.product.create({
      data: {
        modelCode: prod2ModelCode,
        slug: prod2Slug,
        name: prod2Name,
        brandId,
        categoryId,
        price: prod2Price,
        stock: 20,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    prod2Id = p2.id
    createdProductIds.push(p2.id)

    const pArchived = await prisma.product.create({
      data: {
        modelCode: `ARCH-${runId}`,
        slug: `prod-arch-${runId}`,
        name: `منتج مؤرشف ${runId}`,
        brandId,
        categoryId,
        price: 150_000,
        stock: 10,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        archivedAt: new Date(),
        taxRate: 14,
      },
    })
    prodArchivedId = pArchived.id
    createdProductIds.push(pArchived.id)
  })

  afterAll(async () => {
    // Delete in reverse dependency order
    if (createdOrderIds.length > 0) {
      await prisma.orderEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.stockMovement.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.couponRedemption.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    }

    if (createdCouponIds.length > 0) {
      await prisma.couponRedemption.deleteMany({ where: { couponId: { in: createdCouponIds } } })
      await prisma.coupon.deleteMany({ where: { id: { in: createdCouponIds } } })
    }

    if (createdSaleIds.length > 0) {
      await prisma.flashSaleItem.deleteMany({ where: { flashSaleId: { in: createdSaleIds } } })
      await prisma.flashSale.deleteMany({ where: { id: { in: createdSaleIds } } })
    }

    if (createdProductIds.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: { in: createdProductIds } } })
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    }

    if (ownerUserId || restrictedUserId) {
      const userIds = [ownerUserId, restrictedUserId].filter(Boolean)
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
      await prisma.rolePermission.deleteMany({ where: { role: { key: `restricted-${runId}` } } })
      await prisma.role.deleteMany({ where: { key: `restricted-${runId}` } })
    }

    await app.close()
  })

  // ==========================================================================
  // Scenario 1: Permissions and CSRF Protection
  // ==========================================================================
  describe('Scenario 1: RBAC & CSRF Protection', () => {
    it('returns 403 for restricted admin without promotions.manage on list and create for flash sales', async () => {
      // List
      await request(app.getHttpServer())
        .get('/api/admin/flash-sales')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // Create
      const now = Date.now()
      await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض مرفوض ${runId}`,
          startsAt: new Date(now + 1000).toISOString(),
          endsAt: new Date(now + 10_000).toISOString(),
          items: [{ productId: prod1Id, salePrice: 50_000 }],
        })
        .expect(403)
    })

    it('returns 403 for restricted admin without promotions.manage on list and create for coupons', async () => {
      // List
      await request(app.getHttpServer())
        .get('/api/admin/coupons')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // Create
      await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          code: `RESTR_${runId.toUpperCase()}`,
          type: 'percent',
          value: 10,
        })
        .expect(403)
    })

    it('refuses admin mutations when x-csrf-token is missing', async () => {
      const now = Date.now()

      // Flash sale mutation without CSRF
      const flashRes = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض بدون توكن ${runId}`,
          startsAt: new Date(now + 1000).toISOString(),
          endsAt: new Date(now + 10_000).toISOString(),
          items: [{ productId: prod1Id, salePrice: 50_000 }],
        })
        .expect(403)

      expect(flashRes.body).toMatchObject({
        message: 'انتهت الجلسة، حدّث الصفحة',
      })

      // Coupon mutation without CSRF
      const couponRes = await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send({
          code: `NOCSRF_${runId.toUpperCase()}`,
          type: 'percent',
          value: 10,
        })
        .expect(403)

      expect(couponRes.body).toMatchObject({
        message: 'انتهت الجلسة، حدّث الصفحة',
      })
    })
  })

  // ==========================================================================
  // Scenario 2: Flash Sale CRUD & Details
  // ==========================================================================
  let runningSaleId = ''
  let scheduledSaleId = ''

  describe('Scenario 2: Flash Sale Create, List & Detail', () => {
    it('creates a running flash sale and scheduled flash sale, listed with correct status and detail item attributes', async () => {
      const now = Date.now()

      // 1. Create Running Flash Sale (starts 1 hour ago, ends in 2 hours)
      const runningStartsAt = new Date(now - 3600_000).toISOString()
      const runningEndsAt = new Date(now + 7200_000).toISOString()
      const runningRes = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض فلاش نشط ${runId}`,
          startsAt: runningStartsAt,
          endsAt: runningEndsAt,
          items: [{ productId: prod1Id, salePrice: 70_000 }],
        })
        .expect(201)

      runningSaleId = runningRes.body.id
      createdSaleIds.push(runningSaleId)

      expect(runningRes.body).toMatchObject({
        id: runningSaleId,
        name: `عرض فلاش نشط ${runId}`,
        status: 'running',
        itemCount: 1,
        items: [
          {
            productId: prod1Id,
            productName: prod1Name,
            modelCode: prod1ModelCode,
            regularPrice: prod1Price,
            salePrice: 70_000,
          },
        ],
      })

      // 2. Create Scheduled Flash Sale (starts tomorrow, ends day after tomorrow)
      const scheduledStartsAt = new Date(now + 3600_000 * 24).toISOString()
      const scheduledEndsAt = new Date(now + 3600_000 * 48).toISOString()
      const scheduledRes = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض فلاش مجدول ${runId}`,
          startsAt: scheduledStartsAt,
          endsAt: scheduledEndsAt,
          items: [{ productId: prod2Id, salePrice: 150_000 }],
        })
        .expect(201)

      scheduledSaleId = scheduledRes.body.id
      createdSaleIds.push(scheduledSaleId)
      expect(scheduledRes.body.status).toBe('scheduled')

      // 3. List Flash Sales filtered by runId
      const listRes = await request(app.getHttpServer())
        .get(`/api/admin/flash-sales?q=${runId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(listRes.body.total).toBeGreaterThanOrEqual(2)
      const listRunning = listRes.body.items.find(
        (i: { id: string }) => i.id === runningSaleId,
      )
      const listScheduled = listRes.body.items.find(
        (i: { id: string }) => i.id === scheduledSaleId,
      )

      expect(listRunning).toBeDefined()
      expect(listRunning.status).toBe('running')
      expect(listRunning.itemCount).toBe(1)

      expect(listScheduled).toBeDefined()
      expect(listScheduled.status).toBe('scheduled')
      expect(listScheduled.itemCount).toBe(1)

      // 4. Detail endpoint
      const detailRes = await request(app.getHttpServer())
        .get(`/api/admin/flash-sales/${runningSaleId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(detailRes.body.id).toBe(runningSaleId)
      expect(detailRes.body.status).toBe('running')
      expect(detailRes.body.items).toEqual([
        {
          productId: prod1Id,
          productName: prod1Name,
          modelCode: prod1ModelCode,
          regularPrice: prod1Price,
          salePrice: 70_000,
        },
      ])
    })
  })

  // ==========================================================================
  // Scenario 3: Sale Price and Date Validations
  // ==========================================================================
  describe('Scenario 3: Validation Rules', () => {
    it('rejects salePrice >= regular price with 400', async () => {
      const now = Date.now()

      // Sale price equal to regular price (100,000)
      const resEqual = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض سعر مساوي ${runId}`,
          startsAt: new Date(now + 3600_000 * 50).toISOString(),
          endsAt: new Date(now + 3600_000 * 52).toISOString(),
          items: [{ productId: prod1Id, salePrice: prod1Price }],
        })
        .expect(400)

      expect(resEqual.body.message).toContain(
        `سعر العرض لازم يكون أقل من السعر الأصلي: ${prod1Name}`,
      )

      // Sale price higher than regular price
      const resHigher = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض سعر أعلى ${runId}`,
          startsAt: new Date(now + 3600_000 * 50).toISOString(),
          endsAt: new Date(now + 3600_000 * 52).toISOString(),
          items: [{ productId: prod1Id, salePrice: prod1Price + 10_000 }],
        })
        .expect(400)

      expect(resHigher.body.message).toContain(
        `سعر العرض لازم يكون أقل من السعر الأصلي: ${prod1Name}`,
      )
    })

    it('rejects endsAt <= startsAt with 400', async () => {
      const now = Date.now()

      // endsAt before startsAt
      await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض تواريخ معكوسة ${runId}`,
          startsAt: new Date(now + 3600_000 * 10).toISOString(),
          endsAt: new Date(now + 3600_000 * 5).toISOString(),
          items: [{ productId: prod1Id, salePrice: 50_000 }],
        })
        .expect(400)

      // endsAt equal to startsAt
      const sameTime = new Date(now + 3600_000 * 10).toISOString()
      await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض تواريخ متطابقة ${runId}`,
          startsAt: sameTime,
          endsAt: sameTime,
          items: [{ productId: prod1Id, salePrice: 50_000 }],
        })
        .expect(400)
    })

    it('rejects archived product with 400', async () => {
      const now = Date.now()
      const res = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض منتج مؤرشف ${runId}`,
          startsAt: new Date(now + 3600_000 * 50).toISOString(),
          endsAt: new Date(now + 3600_000 * 52).toISOString(),
          items: [{ productId: prodArchivedId, salePrice: 50_000 }],
        })
        .expect(400)

      expect(res.body.message).toContain('مؤرشف')
    })
  })

  // ==========================================================================
  // Scenario 4: Overlap Rules
  // ==========================================================================
  describe('Scenario 4: Overlap Detection', () => {
    it('refuses overlapping sale with 409 OVERLAP naming the product, allows non-overlapping window, and PUT onto itself', async () => {
      const now = Date.now()

      // 1. Overlapping window for prod1 (runningSale is [now - 1h, now + 2h])
      // New window: [now, now + 3h] intersects runningSale
      const overlapRes = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض متداخل ${runId}`,
          startsAt: new Date(now).toISOString(),
          endsAt: new Date(now + 3600_000 * 3).toISOString(),
          items: [{ productId: prod1Id, salePrice: 60_000 }],
        })
        .expect(409)

      expect(overlapRes.body).toMatchObject({
        code: 'OVERLAP',
        message: expect.stringContaining(prod1Name),
        products: [{ id: prod1Id, name: prod1Name }],
      })

      // 2. Non-overlapping window for prod1: [now + 10h, now + 12h]
      const nonOverlapRes = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض غير متداخل ${runId}`,
          startsAt: new Date(now + 3600_000 * 10).toISOString(),
          endsAt: new Date(now + 3600_000 * 12).toISOString(),
          items: [{ productId: prod1Id, salePrice: 60_000 }],
        })
        .expect(201)

      createdSaleIds.push(nonOverlapRes.body.id)

      // 3. PUT of runningSale onto its own window does NOT conflict with itself
      const putRes = await request(app.getHttpServer())
        .put(`/api/admin/flash-sales/${runningSaleId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض فلاش نشط محدث ${runId}`,
          startsAt: new Date(now - 3600_000).toISOString(),
          endsAt: new Date(now + 7200_000).toISOString(),
          items: [{ productId: prod1Id, salePrice: 65_000 }],
        })
        .expect(200)

      expect(putRes.body.name).toBe(`عرض فلاش نشط محدث ${runId}`)
      expect(putRes.body.items[0].salePrice).toBe(65_000)
    })
  })

  // ==========================================================================
  // Scenario 5: End Now Action
  // ==========================================================================
  describe('Scenario 5: End Flash Sale Now', () => {
    it('rejects end on scheduled sale with 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/admin/flash-sales/${scheduledSaleId}/end`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(409)

      expect(res.body.message).toBe('العرض لسه مبدأش — احذفه بدل ما تنهيه')
    })

    it('ends a running sale, sets status ended, immediately removes public flash price, and rejects ending again', async () => {
      // 1. Verify public product endpoint returns active flash
      const publicBefore = await request(app.getHttpServer())
        .get(`/api/products/${prod1Slug}`)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(publicBefore.body.price).toBe(65_000)
      expect(publicBefore.body.flash).toMatchObject({
        salePrice: 65_000,
        endsAt: expect.any(String),
      })

      // 2. End now
      const endRes = await request(app.getHttpServer())
        .post(`/api/admin/flash-sales/${runningSaleId}/end`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(endRes.body.status).toBe('ended')

      // 3. Verify public product endpoint immediately returns regular price with flash = null
      const publicAfter = await request(app.getHttpServer())
        .get(`/api/products/${prod1Slug}`)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(publicAfter.body.price).toBe(prod1Price) // 100,000
      expect(publicAfter.body.flash).toBeNull()

      // 4. Ending again returns 409
      const endAgain = await request(app.getHttpServer())
        .post(`/api/admin/flash-sales/${runningSaleId}/end`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(409)

      expect(endAgain.body.message).toBe('العرض خلص بالفعل')
    })

    it('deletes flash sale with 204 No Content', async () => {
      const now = Date.now()
      const toDelete = await request(app.getHttpServer())
        .post('/api/admin/flash-sales')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `عرض للحذف ${runId}`,
          startsAt: new Date(now + 3600_000 * 20).toISOString(),
          endsAt: new Date(now + 3600_000 * 22).toISOString(),
          items: [{ productId: prod1Id, salePrice: 50_000 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/api/admin/flash-sales/${toDelete.body.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(204)

      await request(app.getHttpServer())
        .get(`/api/admin/flash-sales/${toDelete.body.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(404)
    })
  })

  // ==========================================================================
  // Scenario 6: Coupon Creation & Normalization
  // ==========================================================================
  describe('Scenario 6: Coupon Creation Rules', () => {
    it('normalizes lowercase code to uppercase, rejects duplicate code with 409, and rejects percent > 90 with 400', async () => {
      const lowerCode = `disc_${runId}`
      const upperCode = `DISC_${runId.toUpperCase()}`

      // 1. Lowercase code input is transformed to uppercase
      const createRes = await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          code: lowerCode,
          type: 'percent',
          value: 15,
          active: true,
        })
        .expect(201)

      createdCouponIds.push(createRes.body.id)
      expect(createRes.body.code).toBe(upperCode)

      // 2. Duplicate code in different case rejected with 409
      const dupRes = await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          code: upperCode,
          type: 'percent',
          value: 20,
        })
        .expect(409)

      expect(dupRes.body.message).toBe('الكود ده موجود بالفعل')

      // 3. Percent 95 is rejected with 400
      await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          code: `PCT95_${runId.toUpperCase()}`,
          type: 'percent',
          value: 95,
        })
        .expect(400)
    })
  })

  // ==========================================================================
  // Scenario 7: Coupon List Usage Stats after Order Placement
  // ==========================================================================
  let orderCouponId = ''
  let orderCouponCode = ''

  describe('Scenario 7: Coupon List Usage Stats', () => {
    it('displays activeUses and totalDiscount after an order is placed with the coupon', async () => {
      orderCouponCode = `ORDCP_${runId.toUpperCase()}`

      // 1. Create a 10% coupon
      const couponRes = await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          code: orderCouponCode,
          type: 'percent',
          value: 10,
          active: true,
        })
        .expect(201)

      orderCouponId = couponRes.body.id
      createdCouponIds.push(orderCouponId)

      // 2. Place an order with this coupon (prod2: 200,000 piastres, 10% discount = 20,000)
      const orderItems = [{ productId: prod2Id, qty: 1 }]
      const quoteRes = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: orderItems,
          governorate: 'الدقهلية',
          city: 'المنصورة',
          paymentMethod: 'cod',
          couponCode: orderCouponCode,
        })
        .expect(200)
      expect(quoteRes.body.discount).toBe(20_000)

      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: orderItems,
          customer: {
            name: `عميل طلب ${runId}`,
            phone: '01011112222',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            address: 'شارع الجيش',
          },
          paymentMethod: 'cod',
          couponCode: orderCouponCode,
          idempotencyKey: `admin-promo-${runId}-${nanoid(8)}`.replace(/[^A-Za-z0-9_-]/g, ''),
          expectedTotal: quoteRes.body.total,
        })
        .expect(201)

      const dbOrder = await prisma.order.findUnique({
        where: { no: orderRes.body.no },
      })
      expect(dbOrder?.discount).toBe(20_000)
      if (dbOrder) {
        createdOrderIds.push(dbOrder.id)
      }

      // 3. Check Coupon List via Admin API
      const listRes = await request(app.getHttpServer())
        .get(`/api/admin/coupons?q=${orderCouponCode}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const row = listRes.body.items.find(
        (i: { id: string }) => i.id === orderCouponId,
      )
      expect(row).toBeDefined()
      expect(row.code).toBe(orderCouponCode)
      expect(row.activeUses).toBe(1)
      expect(row.totalDiscount).toBe(20_000)
    })
  })

  // ==========================================================================
  // Scenario 8: Delete vs Deactivate
  // ==========================================================================
  describe('Scenario 8: Coupon Deletion / Deactivation', () => {
    it('deletes coupon without redemptions and returns 200 { deleted: true }', async () => {
      const unusedCode = `UNUSD_${runId.toUpperCase()}`
      const createRes = await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          code: unusedCode,
          type: 'fixed',
          value: 5000,
          active: true,
        })
        .expect(201)

      const unusedId = createRes.body.id

      // Delete
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/admin/coupons/${unusedId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(deleteRes.body).toEqual({ deleted: true })

      // GET returns 404
      await request(app.getHttpServer())
        .get(`/api/admin/coupons/${unusedId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(404)
    })

    it('deactivates coupon with redemptions and returns 200 { deactivated: true }', async () => {
      // Deleting orderCouponId (which has 1 active redemption)
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/admin/coupons/${orderCouponId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(deleteRes.body).toEqual({ deactivated: true })

      // Row still exists in DB with active = false and status = inactive
      const getRes = await request(app.getHttpServer())
        .get(`/api/admin/coupons/${orderCouponId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(getRes.body.active).toBe(false)
      expect(getRes.body.status).toBe('inactive')

      // Public cart quote now rejects this coupon
      const quoteRes = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: prod2Id, qty: 1 }],
          couponCode: orderCouponCode,
        })
        .expect(200)

      expect(quoteRes.body.coupon.status).toBe('rejected')
    })
  })

  // ==========================================================================
  // Scenario 9: Audit Logging
  // ==========================================================================
  describe('Scenario 9: Mutation Audit Logging', () => {
    it('writes audit log rows for flash sale and coupon mutations', async () => {
      const flashAudit = await prisma.auditLog.findFirst({
        where: {
          userId: ownerUserId,
          entity: 'flash_sale',
          action: 'flash_sale.create',
        },
      })
      expect(flashAudit).not.toBeNull()
      expect(flashAudit?.entityId).toBeDefined()

      const couponAudit = await prisma.auditLog.findFirst({
        where: {
          userId: ownerUserId,
          entity: 'coupon',
          action: 'coupon.create',
        },
      })
      expect(couponAudit).not.toBeNull()
      expect(couponAudit?.entityId).toBeDefined()
    })
  })
})
