import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type BestSellerRow,
  type BridalFunnelReport,
  type CouponReportRow,
  type FlashSaleReportRow,
  type RepeatCustomersReport,
  type RevenueReport,
  type SplitRow,
  type SplitsReport,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const FROM = '2020-03-01'
const TO = '2020-03-07'
const RANGE_QUERY = { from: FROM, to: TO }

describe('Admin Reports API E2E (/api/admin/reports)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `admin-reports-owner-${runId}@serag.test`
  const restrictedEmail = `admin-reports-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  const restrictedRoleKey = `restricted-reports-${runId}`

  let ownerSessionCookie = ''
  let restrictedSessionCookie = ''

  let categoryIdA = ''
  let categoryIdB = ''
  let brandIdA = ''
  let brandIdB = ''
  let productAId = ''
  let productBId = ''
  let productFlashId = ''
  let productOutsideId = ''
  let couponId = ''
  let couponCode = ''
  let flashSaleMainId = ''
  let flashSaleEmptyId = ''
  let bridalListId = ''

  const createdOrderIds: string[] = []
  const createdProductIds: string[] = []
  const createdCategoryIds: string[] = []
  const createdBrandIds: string[] = []

  const phoneBase = 15_500_000_000 + (Date.now() % 9_999_999)
  const phoneP1 = String(phoneBase)
  const phoneP2 = String(phoneBase + 1)
  const phoneP3 = String(phoneBase + 2)
  const phoneP4 = String(phoneBase + 3)

  let repeatBaseline: RepeatCustomersReport

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
    await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير التقارير ${runId}`,
        passwordHash,
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    })
    await prisma.user.create({
      data: {
        email: restrictedEmail,
        name: `موظف مراجعات ${runId}`,
        passwordHash,
        roles: { create: [{ roleId: restrictedRole.id }] },
      },
    })

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

    repeatBaseline = await getReport<RepeatCustomersReport>(
      '/repeat-customers',
      ownerSessionCookie,
      RANGE_QUERY,
    )

    await seedDataset()
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

    if (bridalListId) await prisma.bridalList.deleteMany({ where: { id: bridalListId } })

    if (flashSaleMainId || flashSaleEmptyId) {
      await prisma.flashSaleItem.deleteMany({
        where: { flashSaleId: { in: [flashSaleMainId, flashSaleEmptyId].filter(Boolean) } },
      })
      await prisma.flashSale.deleteMany({
        where: { id: { in: [flashSaleMainId, flashSaleEmptyId].filter(Boolean) } },
      })
    }

    if (couponId) await prisma.coupon.deleteMany({ where: { id: couponId } })

    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    }
    if (createdCategoryIds.length > 0) {
      await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } })
    }
    if (createdBrandIds.length > 0) {
      await prisma.brand.deleteMany({ where: { id: { in: createdBrandIds } } })
    }

    const users = await prisma.user.findMany({
      where: { email: { in: [ownerEmail, restrictedEmail] } },
      select: { id: true },
    })
    const userIds = users.map((user) => user.id)
    if (userIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    }
    await prisma.rolePermission.deleteMany({ where: { role: { key: restrictedRoleKey } } })
    await prisma.role.deleteMany({ where: { key: restrictedRoleKey } })

    await app.close()
  })

  function extractSessionCookie(setCookie: string | string[] | undefined): string {
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    const sid = cookies.find((c) => c.startsWith('serag_sid='))
    return sid?.split(';')[0] ?? ''
  }

  function getReport<T>(path: string, cookie: string, query?: Record<string, string>) {
    const req = request(app.getHttpServer()).get(`/api/admin/reports${path}`).set('Cookie', cookie)
    if (query) req.query(query)
    return req.expect(200).then((res) => res.body as T)
  }

  function findRow(rows: SplitRow[], id: string): SplitRow {
    const row = rows.find((r) => r.id === id)
    if (!row) throw new Error(`split row ${id} missing`)
    return row
  }

  // ==========================================================================
  // Fixture: two categories, two brands, four products, coupon, flash sales,
  // bridal list, five orders (four delivered, one open) in 2020-03-01..03-07
  // ==========================================================================
  async function seedDataset(): Promise<void> {
    const catA = await prisma.category.create({
      data: { name: `قسم أجهزة ${runId}`, slug: `rpt-cat-a-${runId}`, sort: 900 },
    })
    const catB = await prisma.category.create({
      data: { name: `قسم تحضير ${runId}`, slug: `rpt-cat-b-${runId}`, sort: 901 },
    })
    categoryIdA = catA.id
    categoryIdB = catB.id
    createdCategoryIds.push(catA.id, catB.id)

    const brandA = await prisma.brand.create({
      data: { name: `ماركة أ ${runId}`, slug: `rpt-brand-a-${runId}`, sort: 900 },
    })
    const brandB = await prisma.brand.create({
      data: { name: `ماركة ب ${runId}`, slug: `rpt-brand-b-${runId}`, sort: 901 },
    })
    brandIdA = brandA.id
    brandIdB = brandB.id
    createdBrandIds.push(brandA.id, brandB.id)

    const productA = await prisma.product.create({
      data: {
        modelCode: `RPT-A-${runId}`,
        slug: `rpt-a-${runId}`,
        name: `غسالة تجريبية ${runId}`,
        brandId: brandA.id,
        categoryId: catA.id,
        price: 100_000,
        stock: 10,
      },
    })
    const productB = await prisma.product.create({
      data: {
        modelCode: `RPT-B-${runId}`,
        slug: `rpt-b-${runId}`,
        name: `قلاية تجريبية ${runId}`,
        brandId: brandB.id,
        categoryId: catB.id,
        price: 50_000,
        stock: 10,
      },
    })
    const productFlash = await prisma.product.create({
      data: {
        modelCode: `RPT-F-${runId}`,
        slug: `rpt-f-${runId}`,
        name: `مكواة عرض ${runId}`,
        brandId: brandA.id,
        categoryId: catA.id,
        price: 80_000,
        stock: 5,
      },
    })
    const productOutside = await prisma.product.create({
      data: {
        modelCode: `RPT-O-${runId}`,
        slug: `rpt-o-${runId}`,
        name: `منتج خارج الفترة ${runId}`,
        brandId: brandA.id,
        categoryId: catA.id,
        price: 20_000,
        stock: 4,
      },
    })
    productAId = productA.id
    productBId = productB.id
    productFlashId = productFlash.id
    productOutsideId = productOutside.id
    createdProductIds.push(productA.id, productB.id, productFlash.id, productOutside.id)

    const coupon = await prisma.coupon.create({
      data: {
        code: `RPT${runId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`,
        type: 'fixed',
        value: 10_000,
        active: true,
      },
    })
    couponId = coupon.id
    couponCode = coupon.code

    const flashMain = await prisma.flashSale.create({
      data: {
        name: `عرض تجريبي ${runId}`,
        startsAt: new Date('2020-03-01T00:00:00Z'),
        endsAt: new Date('2020-03-31T22:59:59Z'),
        items: { create: [{ productId: productFlash.id, salePrice: 60_000 }] },
      },
    })
    flashSaleMainId = flashMain.id

    const flashEmpty = await prisma.flashSale.create({
      data: {
        name: `عرض بدون مبيعات ${runId}`,
        startsAt: new Date('2020-02-20T00:00:00Z'),
        endsAt: new Date('2020-03-03T00:00:00Z'),
        items: { create: [{ productId: productB.id, salePrice: 45_000 }] },
      },
    })
    flashSaleEmptyId = flashEmpty.id

    const bridalList = await prisma.bridalList.create({
      data: {
        editToken: nanoid(24),
        shareToken: nanoid(24),
        status: 'locked',
        customerName: `عروس تجريبية ${runId}`,
        customerPhone: phoneP2,
        createdAt: new Date('2020-03-04T08:00:00Z'),
      },
    })
    bridalListId = bridalList.id

    // O1: delivered 2020-03-03, coupon discount 10_000, COD, Mansoura
    const o1 = await prisma.order.create({
      data: {
        no: `SR-RPT-${nanoid(8).toUpperCase()}`,
        type: 'order',
        status: 'delivered',
        customerName: `عميل تقرير 1 ${runId}`,
        customerPhone: phoneP1,
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجمهورية',
        subtotal: 250_000,
        discount: 10_000,
        deliveryFee: 10_000,
        total: 250_000,
        paymentMethod: 'cod',
        couponId: coupon.id,
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        createdAt: new Date('2020-03-02T10:00:00Z'),
        items: {
          create: [
            {
              productId: productA.id,
              name: productA.name,
              modelCode: productA.modelCode,
              qty: 2,
              unitPrice: 100_000,
            },
            {
              productId: productB.id,
              name: productB.name,
              modelCode: productB.modelCode,
              qty: 1,
              unitPrice: 50_000,
            },
          ],
        },
      },
    })
    createdOrderIds.push(o1.id)
    await prisma.orderEvent.create({
      data: { orderId: o1.id, status: 'delivered', at: new Date('2020-03-03T10:00:00Z') },
    })

    // O2: same phone as O1 (repeat customer), delivered 2020-03-06, COD, Mansoura
    const o2 = await prisma.order.create({
      data: {
        no: `SR-RPT-${nanoid(8).toUpperCase()}`,
        type: 'order',
        status: 'delivered',
        customerName: `عميل تقرير 1 ${runId}`,
        customerPhone: phoneP1,
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجمهورية',
        subtotal: 150_000,
        discount: 0,
        deliveryFee: 10_000,
        total: 160_000,
        paymentMethod: 'cod',
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        createdAt: new Date('2020-03-05T09:00:00Z'),
        items: {
          create: [
            {
              productId: productB.id,
              name: productB.name,
              modelCode: productB.modelCode,
              qty: 3,
              unitPrice: 50_000,
            },
          ],
        },
      },
    })
    createdOrderIds.push(o2.id)
    await prisma.orderEvent.create({
      data: { orderId: o2.id, status: 'delivered', at: new Date('2020-03-06T10:00:00Z') },
    })

    // O3: bridal reservation at flash price, delivered 2020-03-05, Instapay,Dakahlia
    const o3 = await prisma.order.create({
      data: {
        no: `SR-RPT-${nanoid(8).toUpperCase()}`,
        type: 'bridal',
        status: 'delivered',
        bridalStatus: 'locked',
        bridalListId: bridalList.id,
        customerName: `عروس تجريبية ${runId}`,
        customerPhone: phoneP2,
        governorate: 'الدقهلية',
        city: 'ميت خميس',
        zoneId: 'dakahlia',
        address: 'شارع الترعة',
        subtotal: 120_000,
        discount: 0,
        deliveryFee: 15_000,
        total: 135_000,
        paymentMethod: 'instapay',
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        createdAt: new Date('2020-03-04T09:00:00Z'),
        items: {
          create: [
            {
              productId: productFlash.id,
              name: productFlash.name,
              modelCode: productFlash.modelCode,
              qty: 2,
              unitPrice: 60_000,
            },
          ],
        },
      },
    })
    createdOrderIds.push(o3.id)
    await prisma.orderEvent.create({
      data: { orderId: o3.id, status: 'delivered', at: new Date('2020-03-05T12:00:00Z') },
    })
    await prisma.payment.create({
      data: {
        orderId: o3.id,
        method: 'instapay',
        amount: 135_000,
        status: 'confirmed',
        at: new Date('2020-03-04T10:00:00Z'),
      },
    })
    await prisma.payment.create({
      data: {
        orderId: o3.id,
        method: 'cod',
        amount: 1_000,
        status: 'rejected',
        at: new Date('2020-03-03T10:00:00Z'),
      },
    })

    // O4: open order using the coupon inside the window — must not count anywhere
    const o4 = await prisma.order.create({
      data: {
        no: `SR-RPT-${nanoid(8).toUpperCase()}`,
        type: 'order',
        status: 'new',
        customerName: `عميل تقرير 2 ${runId}`,
        customerPhone: phoneP3,
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجمهورية',
        subtotal: 100_000,
        discount: 10_000,
        deliveryFee: 10_000,
        total: 100_000,
        paymentMethod: 'cod',
        couponId: coupon.id,
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        createdAt: new Date('2020-03-04T11:00:00Z'),
        items: {
          create: [
            {
              productId: productA.id,
              name: productA.name,
              modelCode: productA.modelCode,
              qty: 1,
              unitPrice: 100_000,
            },
          ],
        },
      },
    })
    createdOrderIds.push(o4.id)

    // O5: delivered 2020-02-25, before the window — only visible in all-time stats
    const o5 = await prisma.order.create({
      data: {
        no: `SR-RPT-${nanoid(8).toUpperCase()}`,
        type: 'order',
        status: 'delivered',
        customerName: `عميل تقرير 3 ${runId}`,
        customerPhone: phoneP4,
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجمهورية',
        subtotal: 20_000,
        discount: 0,
        deliveryFee: 0,
        total: 20_000,
        paymentMethod: 'cod',
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        createdAt: new Date('2020-02-24T10:00:00Z'),
        items: {
          create: [
            {
              productId: productOutside.id,
              name: productOutside.name,
              modelCode: productOutside.modelCode,
              qty: 1,
              unitPrice: 20_000,
            },
          ],
        },
      },
    })
    createdOrderIds.push(o5.id)
    await prisma.orderEvent.create({
      data: { orderId: o5.id, status: 'delivered', at: new Date('2020-02-25T10:00:00Z') },
    })
  }

  // ==========================================================================
  // Scenario 1: auth, permissions and query validation
  // ==========================================================================
  it('rejects unauthenticated, restricted and invalid requests', async () => {
    await request(app.getHttpServer()).get('/api/admin/reports/revenue').expect(401)
    await request(app.getHttpServer())
      .get('/api/admin/reports/revenue/export')
      .query(RANGE_QUERY)
      .expect(401)

    await request(app.getHttpServer())
      .get('/api/admin/reports/revenue')
      .query(RANGE_QUERY)
      .set('Cookie', restrictedSessionCookie)
      .expect(403)

    await request(app.getHttpServer())
      .get('/api/admin/reports/revenue')
      .query({ from: TO, to: FROM })
      .set('Cookie', ownerSessionCookie)
      .expect(400)

    await request(app.getHttpServer())
      .get('/api/admin/reports/revenue')
      .query({ from: '2020-02-30', to: TO })
      .set('Cookie', ownerSessionCookie)
      .expect(400)

    await request(app.getHttpServer())
      .get('/api/admin/reports/revenue')
      .query({ ...RANGE_QUERY, groupBy: 'hour' })
      .set('Cookie', ownerSessionCookie)
      .expect(400)

    await request(app.getHttpServer())
      .get('/api/admin/reports/revenue')
      .set('Cookie', ownerSessionCookie)
      .expect(400)

    await request(app.getHttpServer())
      .get('/api/admin/reports/not-a-report/export')
      .query(RANGE_QUERY)
      .set('Cookie', ownerSessionCookie)
      .expect(400)
  })

  it('accepts preset ranges and resolves them to concrete dates', async () => {
    const report = await getReport<RevenueReport>('/revenue', ownerSessionCookie, {
      preset: '7d',
    })
    expect(report.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(report.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(report.from < report.to).toBe(true)
    expect(report.buckets).toHaveLength(7)
    expect(report.groupBy).toBe('day')
  })

  // ==========================================================================
  // Scenario 2: revenue per Cairo delivery day
  // ==========================================================================
  it('aggregates revenue by delivery day with exact totals', async () => {
    const report = await getReport<RevenueReport>('/revenue', ownerSessionCookie, RANGE_QUERY)

    expect(report.from).toBe(FROM)
    expect(report.to).toBe(TO)
    expect(report.buckets).toHaveLength(7)
    expect(report.totals).toEqual({
      revenue: 545_000,
      orders: 3,
      aov: Math.round(545_000 / 3),
    })

    const byKey = new Map(report.buckets.map((bucket) => [bucket.key, bucket]))
    expect(byKey.get('2020-03-01')).toMatchObject({ revenue: 0, orders: 0 })
    expect(byKey.get('2020-03-03')).toMatchObject({ revenue: 250_000, orders: 1 })
    expect(byKey.get('2020-03-05')).toMatchObject({ revenue: 135_000, orders: 1 })
    expect(byKey.get('2020-03-06')).toMatchObject({ revenue: 160_000, orders: 1 })
    expect(byKey.get('2020-02-25')).toBeUndefined()
  })

  it('groups the same revenue into week buckets', async () => {
    const report = await getReport<RevenueReport>('/revenue', ownerSessionCookie, {
      ...RANGE_QUERY,
      groupBy: 'week',
    })
    expect(report.groupBy).toBe('week')
    expect(report.totals.revenue).toBe(545_000)
    // 2020-03-01 (Sunday) starts the week of Saturday 2020-02-29; 2020-03-07 starts a new one.
    expect(report.buckets).toHaveLength(2)
    expect(report.buckets[0]).toMatchObject({ key: '2020-02-29', revenue: 545_000, orders: 3 })
    expect(report.buckets[1]).toMatchObject({ key: '2020-03-07', revenue: 0, orders: 0 })
  })

  // ==========================================================================
  // Scenario 3: splits sum exactly to revenue (R4)
  // ==========================================================================
  it('splits delivered revenue by category, brand, payment, zone and type', async () => {
    const report = await getReport<SplitsReport>('/splits', ownerSessionCookie, RANGE_QUERY)

    const categorySum = report.byCategory.reduce((acc, row) => acc + row.revenue, 0)
    const brandSum = report.byBrand.reduce((acc, row) => acc + row.revenue, 0)
    expect(categorySum).toBe(545_000)
    expect(brandSum).toBe(545_000)

    expect(findRow(report.byCategory, categoryIdA)).toMatchObject({
      label: `قسم أجهزة ${runId}`,
      revenue: 312_000,
      orders: 2,
    })
    expect(findRow(report.byCategory, categoryIdB)).toMatchObject({
      label: `قسم تحضير ${runId}`,
      revenue: 198_000,
      orders: 2,
    })
    expect(findRow(report.byCategory, 'delivery')).toMatchObject({
      label: 'رسوم التوصيل',
      revenue: 35_000,
      orders: 3,
    })

    expect(findRow(report.byBrand, brandIdA).revenue).toBe(312_000)
    expect(findRow(report.byBrand, brandIdB).revenue).toBe(198_000)

    expect(findRow(report.byPaymentMethod, 'cod')).toMatchObject({
      label: 'الدفع عند الاستلام',
      revenue: 410_000,
      orders: 2,
    })
    expect(findRow(report.byPaymentMethod, 'instapay')).toMatchObject({
      label: 'إنستا باي',
      revenue: 135_000,
      orders: 1,
    })

    expect(findRow(report.byZone, 'mansoura')).toMatchObject({
      label: 'المنصورة',
      revenue: 410_000,
      orders: 2,
    })
    expect(findRow(report.byZone, 'dakahlia')).toMatchObject({
      label: 'مراكز الدقهلية',
      revenue: 135_000,
      orders: 1,
    })

    expect(findRow(report.byType, 'order')).toMatchObject({
      label: 'طلبات',
      revenue: 410_000,
      orders: 2,
    })
    expect(findRow(report.byType, 'bridal')).toMatchObject({
      label: 'حجوزات عرايس',
      revenue: 135_000,
      orders: 1,
    })
  })

  // ==========================================================================
  // Scenario 4: best sellers (FR-008)
  // ==========================================================================
  it('ranks delivered products by units then revenue', async () => {
    const report = await getReport<{ items: BestSellerRow[] }>(
      '/best-sellers',
      ownerSessionCookie,
      RANGE_QUERY,
    )

    expect(report.items.map((item) => item.productId)).toEqual([
      productBId,
      productAId,
      productFlashId,
    ])
    expect(report.items[0]).toMatchObject({ units: 4, revenue: 200_000 })
    expect(report.items[1]).toMatchObject({ units: 2, revenue: 200_000 })
    expect(report.items[2]).toMatchObject({ units: 2, revenue: 120_000 })
    expect(report.items.some((item) => item.productId === productOutsideId)).toBe(false)
  })

  // ==========================================================================
  // Scenario 5: coupons on delivered orders only (FR-009)
  // ==========================================================================
  it('counts only delivered coupon usage', async () => {
    const report = await getReport<{ items: CouponReportRow[] }>(
      '/coupons',
      ownerSessionCookie,
      RANGE_QUERY,
    )

    expect(report.items).toHaveLength(1)
    expect(report.items[0]).toMatchObject({
      couponId,
      code: couponCode,
      uses: 1,
      discount: 10_000,
      revenue: 250_000,
    })
  })

  // ==========================================================================
  // Scenario 6: flash sales overlap + matching lines (R5)
  // ==========================================================================
  it('reports overlapping flash sales with units and approximate discount', async () => {
    const report = await getReport<{ items: FlashSaleReportRow[] }>(
      '/flash-sales',
      ownerSessionCookie,
      RANGE_QUERY,
    )

    expect(report.items).toHaveLength(2)
    const main = report.items.find((item) => item.flashSaleId === flashSaleMainId)
    expect(main).toMatchObject({ units: 2, revenue: 120_000, discount: 40_000 })
    const empty = report.items.find((item) => item.flashSaleId === flashSaleEmptyId)
    expect(empty).toMatchObject({ units: 0, revenue: 0, discount: 0 })
  })

  // ==========================================================================
  // Scenario 7: bridal funnel (FR-010)
  // ==========================================================================
  it('counts bridal lists, paid reservations and deliveries in the window', async () => {
    const report = await getReport<BridalFunnelReport>(
      '/bridal-funnel',
      ownerSessionCookie,
      RANGE_QUERY,
    )

    expect(report).toEqual({
      listsCreated: 1,
      reservationsPaid: 1,
      delivered: 1,
      listToReservationPct: 100,
      reservationToDeliveredPct: 100,
    })
  })

  // ==========================================================================
  // Scenario 8: repeat customers, counts only (FR-011, R6)
  // ==========================================================================
  it('reports repeat-customer counts without any phone numbers', async () => {
    const report = await getReport<RepeatCustomersReport>(
      '/repeat-customers',
      ownerSessionCookie,
      RANGE_QUERY,
    )

    // All-time counts depend on seed data, so assert them as deltas vs the
    // baseline read in beforeAll; the fixed 2020 window pins the period ones.
    expect(report.periodCustomers).toBe(2)
    expect(report.periodRepeat).toBe(1)
    expect(report.periodRepeatPct).toBe(50)
    expect(report.customers - repeatBaseline.customers).toBe(3)
    expect(report.repeatCustomers - repeatBaseline.repeatCustomers).toBe(1)

    const raw = JSON.stringify(report)
    expect(raw).not.toContain(phoneP1)
    expect(raw).not.toContain(phoneP2)
    expect(raw).not.toContain(phoneP4)
  })

  // ==========================================================================
  // Scenario 9: CSV export (FR-012)
  // ==========================================================================
  it('exports revenue as BOM-prefixed CSV with an attachment filename', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/reports/revenue/export')
      .query(RANGE_QUERY)
      .set('Cookie', ownerSessionCookie)
      .expect(200)

    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toContain(
      'filename="serag-revenue-2020-03-01-2020-03-07.csv"',
    )
    expect(res.text.charCodeAt(0)).toBe(0xfeff)
    expect(res.text).toContain('الفترة')
    expect(res.text).toContain('الإجمالي')
    expect(res.text).toContain('5450.00')
  })

  it('neutralises formula-like product names in the best-sellers CSV', async () => {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productBId } })
    await prisma.product.update({
      where: { id: productBId },
      data: { name: '=HYPERLINK("http://evil.test","اضغط")' },
    })
    try {
      const res = await request(app.getHttpServer())
        .get('/api/admin/reports/best-sellers/export')
        .query(RANGE_QUERY)
        .set('Cookie', ownerSessionCookie)
        .expect(200)
      // The cell is quoted (it contains commas/quotes) and starts with ' so Excel shows it as text
      expect(res.text).toContain(`"'=HYPERLINK(""http://evil.test"",""اضغط"")"`)
      expect(res.text).not.toMatch(/(^|,)=HYPERLINK/m)
    } finally {
      await prisma.product.update({ where: { id: productBId }, data: { name: product.name } })
    }
  })

  it('exports splits and bridal funnel CSVs', async () => {
    const splits = await request(app.getHttpServer())
      .get('/api/admin/reports/splits/export')
      .query(RANGE_QUERY)
      .set('Cookie', ownerSessionCookie)
      .expect(200)
    expect(splits.text).toContain('التقسيم')
    expect(splits.text).toContain('القسم')
    expect(splits.text).toContain('رسوم التوصيل')

    const funnel = await request(app.getHttpServer())
      .get('/api/admin/reports/bridal-funnel/export')
      .query(RANGE_QUERY)
      .set('Cookie', ownerSessionCookie)
      .expect(200)
    expect(funnel.text).toContain('المرحلة')
    expect(funnel.text).toContain('قوائم اتعملت')
  })
})
