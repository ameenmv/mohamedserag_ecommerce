import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type AdminReviewListResponse,
  type AdminReviewRow,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Admin Reviews API E2E (/api/admin/reviews)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `admin-reviews-owner-${runId}@serag.test`
  const restrictedEmail = `admin-reviews-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  const restrictedRoleKey = `restricted-reviews-${runId}`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let ownerCsrfToken = ''

  let restrictedUserId = ''
  let restrictedSessionCookie = ''
  let restrictedCsrfToken = ''

  let prodToshibaId = ''
  let prodToshibaName = ''
  let prodToshibaSlug = ''

  let prodCarrierId = ''
  let prodOlympicId = ''
  let prodFreshId = ''
  let prodTefalId = ''

  let revPending1Id = ''
  let revPending2Id = ''
  let revPending3Id = ''

  let revOlympicAppOldId = ''
  let revOlympicAppNewId = ''
  let revOlympicRejOldId = ''
  let revOlympicRejNewId = ''

  let revVerifiedBuyerId = ''
  let revNotVerifiedBuyerId = ''
  let revForReplyId = ''
  let revForDeleteId = ''

  const verifiedBuyerPhone = '01033330001'
  const notVerifiedBuyerPhone = '01033330002'
  const deleteReviewPhone = '01055550001'

  const createdProductIds: string[] = []
  const createdOrderIds: string[] = []

  let ipCounter = 1
  const nextIp = () => `10.7.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // 1. Ensure all permissions exist in database
    for (const key of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      })
    }

    // 2. Owner role with all permissions
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

    // 3. Restricted role (WITHOUT reviews.moderate)
    const restrictedRole = await prisma.role.create({
      data: { key: restrictedRoleKey, name: 'موظف بدون صلاحية المراجعات' },
    })

    const allowedPerms = perms.filter(
      (p) => p.key === PERMISSIONS.orders.read || p.key === PERMISSIONS.orders.update,
    )
    for (const p of allowedPerms) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: p.id },
      })
    }

    // 4. Create Owner User
    const passwordHash = await argon2.hash(testPassword)
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير المراجعات ${runId}`,
        passwordHash,
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    })
    ownerUserId = ownerUser.id

    // 5. Create Restricted User
    const restrictedUser = await prisma.user.create({
      data: {
        email: restrictedEmail,
        name: `موظف مقيد ${runId}`,
        passwordHash,
        roles: { create: [{ roleId: restrictedRole.id }] },
      },
    })
    restrictedUserId = restrictedUser.id

    // 6. Login Owner
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

    // 7. Login Restricted
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

    // 8. Lookup Category and Brand
    const cat = await prisma.category.findFirst({ orderBy: { sort: 'asc' } })
    if (!cat) throw new Error('No category found')
    const categoryId = cat.id

    const br = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!br) throw new Error('No brand found')
    const brandId = br.id

    // 9. Seed Products
    prodToshibaName = `غسالة توشيبا فوق أوتوماتيك ${runId}`
    prodToshibaSlug = `toshiba-washer-${runId}`
    const pToshiba = await prisma.product.create({
      data: {
        modelCode: `REV-TOSH-${runId}`,
        slug: prodToshibaSlug,
        name: prodToshibaName,
        brandId,
        categoryId,
        price: 120_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prodToshibaId = pToshiba.id
    createdProductIds.push(pToshiba.id)

    const pCarrier = await prisma.product.create({
      data: {
        modelCode: `REV-CARR-${runId}`,
        slug: `carrier-ac-${runId}`,
        name: `تكييف كاريير أوبتيماكس ${runId}`,
        brandId,
        categoryId,
        price: 250_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prodCarrierId = pCarrier.id
    createdProductIds.push(pCarrier.id)

    const pOlympic = await prisma.product.create({
      data: {
        modelCode: `REV-OLYM-${runId}`,
        slug: `olympic-heater-${runId}`,
        name: `سخان أوليمبيك كهرباء ${runId}`,
        brandId,
        categoryId,
        price: 80_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prodOlympicId = pOlympic.id
    createdProductIds.push(pOlympic.id)

    const pFresh = await prisma.product.create({
      data: {
        modelCode: `REV-FRSH-${runId}`,
        slug: `fresh-cooker-${runId}`,
        name: `بوتاجاز فريش بروفيشنال ${runId}`,
        brandId,
        categoryId,
        price: 90_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prodFreshId = pFresh.id
    createdProductIds.push(pFresh.id)

    const pTefal = await prisma.product.create({
      data: {
        modelCode: `REV-TEF-${runId}`,
        slug: `tefal-iron-${runId}`,
        name: `مكواة بخار تيفال ${runId}`,
        brandId,
        categoryId,
        price: 40_000,
        stock: 10,
        visible: true,
        taxRate: 14,
      },
    })
    prodTefalId = pTefal.id
    createdProductIds.push(pTefal.id)

    // 10. Seed Reviews
    const baseTime = new Date('2026-05-10T12:00:00.000Z')

    // Toshiba pending reviews (distinct createdAt to test oldest first)
    const revP1 = await prisma.review.create({
      data: {
        productId: prodToshibaId,
        name: 'أحمد محمود',
        phone: '01011110001',
        stars: 5,
        text: 'غسالة ممتازة وتستحق كل مليم دفع فيها وأنصح بها بشدة',
        status: 'pending',
        createdAt: new Date(baseTime.getTime() + 10_000),
        updatedAt: new Date(baseTime.getTime() + 10_000),
      },
    })
    revPending1Id = revP1.id

    const revP2 = await prisma.review.create({
      data: {
        productId: prodToshibaId,
        name: 'محمد خالد',
        phone: '01011110002',
        stars: 3,
        text: 'الغسالة جيدة ولكن صوتها مرتفع قليلا أثناء العصر السريع',
        status: 'pending',
        createdAt: new Date(baseTime.getTime() + 20_000),
        updatedAt: new Date(baseTime.getTime() + 20_000),
      },
    })
    revPending2Id = revP2.id

    // Carrier pending review
    const revP3 = await prisma.review.create({
      data: {
        productId: prodCarrierId,
        name: 'سارة عبد الله',
        phone: '01011110003',
        stars: 5,
        text: 'التكييف رائع جدا وتبريده ممتاز في حر الصيف الشديد',
        status: 'pending',
        createdAt: new Date(baseTime.getTime() + 30_000),
        updatedAt: new Date(baseTime.getTime() + 30_000),
      },
    })
    revPending3Id = revP3.id

    // Toshiba approved & rejected reviews
    await prisma.review.create({
      data: {
        productId: prodToshibaId,
        name: 'طارق حسام',
        phone: '01011110004',
        stars: 5,
        text: 'منتج ممتاز جدا وخدمة التوصيل كانت سريعة ومحترمة',
        status: 'approved',
        createdAt: new Date(baseTime.getTime() + 5_000),
        updatedAt: new Date(baseTime.getTime() + 5_000),
      },
    })

    await prisma.review.create({
      data: {
        productId: prodToshibaId,
        name: 'ياسر علي',
        phone: '01011110005',
        stars: 1,
        text: 'المنتج به عيب صناعة وخدمة العملاء لم تتعاون معي بالشكل المطلوب',
        status: 'rejected',
        createdAt: new Date(baseTime.getTime() + 5_000),
        updatedAt: new Date(baseTime.getTime() + 5_000),
      },
    })

    // Olympic approved reviews (ordering test by updatedAt desc)
    const revOlyAppOld = await prisma.review.create({
      data: {
        productId: prodOlympicId,
        name: 'حسين إبراهيم',
        phone: '01022220001',
        stars: 4,
        text: 'سخان مياه ممتاز وسريع جدا في تسخين المياه خلال الشتاء',
        status: 'approved',
        createdAt: new Date(baseTime.getTime() + 1_000),
        updatedAt: new Date(baseTime.getTime() + 10_000),
      },
    })
    revOlympicAppOldId = revOlyAppOld.id

    const revOlyAppNew = await prisma.review.create({
      data: {
        productId: prodOlympicId,
        name: 'كريم عادل',
        phone: '01022220002',
        stars: 5,
        text: 'سخان أوليمبيك خامات عالية جدا وجودة ممتازة وضمان موثوق',
        status: 'approved',
        createdAt: new Date(baseTime.getTime() + 2_000),
        updatedAt: new Date(baseTime.getTime() + 50_000),
      },
    })
    revOlympicAppNewId = revOlyAppNew.id

    // Olympic rejected reviews (ordering test by updatedAt desc)
    const revOlyRejOld = await prisma.review.create({
      data: {
        productId: prodOlympicId,
        name: 'محمود سامي',
        phone: '01022220003',
        stars: 2,
        text: 'السخان يستهلك كهرباء كثيرة ولا يحتفظ بالحرارة لفترة طويلة',
        status: 'rejected',
        createdAt: new Date(baseTime.getTime() + 1_000),
        updatedAt: new Date(baseTime.getTime() + 10_000),
      },
    })
    revOlympicRejOldId = revOlyRejOld.id

    const revOlyRejNew = await prisma.review.create({
      data: {
        productId: prodOlympicId,
        name: 'عمر شريف',
        phone: '01022220004',
        stars: 1,
        text: 'تجربة سيئة جدا والسخان بدأ يسرب مياه بعد أسبوعين فقط من التركيب',
        status: 'rejected',
        createdAt: new Date(baseTime.getTime() + 2_000),
        updatedAt: new Date(baseTime.getTime() + 50_000),
      },
    })
    revOlympicRejNewId = revOlyRejNew.id

    // Fresh reviews for verified buyer re-check test
    const revVB = await prisma.review.create({
      data: {
        productId: prodFreshId,
        name: 'سامح خليل',
        phone: verifiedBuyerPhone,
        stars: 5,
        text: 'بوتاجاز ممتاز جدا وشعلات قوية وفرن واسع جدا وتوزيع حرارة رائع',
        status: 'pending',
        verifiedBuyer: false,
        createdAt: new Date(baseTime.getTime() + 15_000),
        updatedAt: new Date(baseTime.getTime() + 15_000),
      },
    })
    revVerifiedBuyerId = revVB.id

    // Create delivered order containing prodFreshId for verifiedBuyerPhone
    const deliveredOrder = await prisma.order.create({
      data: {
        no: `SR-REV-DELIV-${runId}`,
        status: 'delivered',
        customerPhone: verifiedBuyerPhone,
        customerName: 'سامح خليل',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع المشاية السفلية',
        subtotal: 90_000,
        total: 90_000,
        paymentMethod: 'cod',
        publicToken: nanoid(24),
        confirmToken: nanoid(24),
        items: {
          create: [
            {
              productId: prodFreshId,
              name: pFresh.name,
              modelCode: pFresh.modelCode,
              qty: 1,
              unitPrice: 90_000,
              taxRate: 14,
            },
          ],
        },
      },
    })
    createdOrderIds.push(deliveredOrder.id)

    // Fresh review without delivered order
    const revNVB = await prisma.review.create({
      data: {
        productId: prodFreshId,
        name: 'هاني فريد',
        phone: notVerifiedBuyerPhone,
        stars: 4,
        text: 'بوتاجاز شكله أنيق ومميز ولكن لم أشتره من هذا الموقع إطلاقا',
        status: 'pending',
        verifiedBuyer: false,
        createdAt: new Date(baseTime.getTime() + 16_000),
        updatedAt: new Date(baseTime.getTime() + 16_000),
      },
    })
    revNotVerifiedBuyerId = revNVB.id

    // Review for reply test
    const revReply = await prisma.review.create({
      data: {
        productId: prodCarrierId,
        name: 'حاتم جمال',
        phone: '01044440001',
        stars: 5,
        text: 'جهاز تكييف كاريير ممتاز وهادئ جدا واستهلاك الكهرباء موفر للغاية',
        status: 'approved',
        createdAt: new Date(baseTime.getTime() + 25_000),
        updatedAt: new Date(baseTime.getTime() + 25_000),
      },
    })
    revForReplyId = revReply.id

    // Review for delete test
    const revDelete = await prisma.review.create({
      data: {
        productId: prodTefalId,
        name: 'نبيل سعيد',
        phone: deleteReviewPhone,
        stars: 4,
        text: 'مكواة بخار تيفال أصلية وقوية وسهلة الاستخدام وتكوي بسرعة فائقة',
        status: 'pending',
        createdAt: new Date(baseTime.getTime() + 35_000),
        updatedAt: new Date(baseTime.getTime() + 35_000),
      },
    })
    revForDeleteId = revDelete.id
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

    // 4. Delete audit logs, sessions, user roles, users, and roles
    const userIds = [ownerUserId, restrictedUserId].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
      await prisma.rolePermission.deleteMany({
        where: { role: { key: restrictedRoleKey } },
      })
      await prisma.role.deleteMany({ where: { key: restrictedRoleKey } })
    }

    await app.close()
  })

  // ==========================================================================
  // Scenario 1: Authorization and CSRF
  // ==========================================================================
  describe('Scenario 1: RBAC and CSRF Protection', () => {
    it('returns 403 for restricted admin on list, pending-count, and approve', async () => {
      // 1. List
      await request(app.getHttpServer())
        .get('/api/admin/reviews')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // 2. Pending count
      await request(app.getHttpServer())
        .get('/api/admin/reviews/pending-count')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // 3. Approve
      await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revPending1Id}/approve`)
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(403)
    })

    it('refuses mutations without or with invalid CSRF token', async () => {
      // Missing CSRF token
      await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revPending1Id}/approve`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // Invalid CSRF token
      await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revPending1Id}/approve`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', 'invalid-token-xyz')
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // Missing CSRF token on delete
      await request(app.getHttpServer())
        .delete(`/api/admin/reviews/${revPending1Id}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)
    })
  })

  // ==========================================================================
  // Scenario 2: List defaults, counts, filtering, and paging
  // ==========================================================================
  describe('Scenario 2: List defaults, counts, filtering, and paging', () => {
    it('defaults to status pending, oldest first, and returns accurate counts and row shapes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/reviews')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body: AdminReviewListResponse = res.body
      expect(body.page).toBe(1)
      expect(body.pageSize).toBe(20)
      expect(body.counts.pending).toBeGreaterThanOrEqual(3)
      expect(body.counts.approved).toBeGreaterThanOrEqual(1)
      expect(body.counts.rejected).toBeGreaterThanOrEqual(1)
      expect(body.total).toBe(body.counts.pending)

      // All items must be pending
      for (const item of body.items) {
        expect(item.status).toBe('pending')
      }

      // Check oldest first order among seeded pending reviews (revPending1 < revPending2 < revPending3)
      const p1Index = body.items.findIndex((i) => i.id === revPending1Id)
      const p2Index = body.items.findIndex((i) => i.id === revPending2Id)
      const p3Index = body.items.findIndex((i) => i.id === revPending3Id)

      expect(p1Index).toBeGreaterThanOrEqual(0)
      expect(p2Index).toBeGreaterThan(p1Index)
      expect(p3Index).toBeGreaterThan(p2Index)

      // Verify row shape
      const firstRow = body.items[p1Index]
      expect(firstRow).toBeDefined()
      expect(firstRow).toMatchObject({
        id: revPending1Id,
        name: 'أحمد محمود',
        phone: '01011110001',
        stars: 5,
        status: 'pending',
        reply: null,
        verifiedBuyer: false,
        product: {
          id: prodToshibaId,
          name: prodToshibaName,
          slug: prodToshibaSlug,
        },
      })
      expect(typeof firstRow?.createdAt).toBe('string')
      expect(typeof firstRow?.updatedAt).toBe('string')
    })

    it('filters by q (case-insensitive product name contains) and reflects in counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/reviews?status=pending&q=توشيبا')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body: AdminReviewListResponse = res.body
      const returnedIds = body.items.map((i) => i.id)

      expect(returnedIds).toContain(revPending1Id)
      expect(returnedIds).toContain(revPending2Id)
      expect(returnedIds).not.toContain(revPending3Id)

      // Counts for "توشيبا" under all statuses: pending = 2, approved = 1, rejected = 1
      expect(body.counts.pending).toBe(2)
      expect(body.counts.approved).toBe(1)
      expect(body.counts.rejected).toBe(1)
      expect(body.total).toBe(2)
    })

    it('filters by stars and reflects in counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/reviews?status=pending&q=توشيبا&stars=5')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body: AdminReviewListResponse = res.body
      const returnedIds = body.items.map((i) => i.id)

      expect(returnedIds).toContain(revPending1Id)
      expect(returnedIds).not.toContain(revPending2Id) // revPending2 is 3 stars

      // 5-star counts for Toshiba: pending = 1, approved = 1, rejected = 0
      expect(body.counts.pending).toBe(1)
      expect(body.counts.approved).toBe(1)
      expect(body.counts.rejected).toBe(0)
      expect(body.total).toBe(1)
    })

    it('supports pagination with pageSize=1 and page=2', async () => {
      // Page 1
      const resPage1 = await request(app.getHttpServer())
        .get('/api/admin/reviews?status=pending&q=توشيبا&pageSize=1&page=1')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(resPage1.body.items).toHaveLength(1)
      expect(resPage1.body.items[0].id).toBe(revPending1Id)
      expect(resPage1.body.page).toBe(1)
      expect(resPage1.body.pageSize).toBe(1)
      expect(resPage1.body.total).toBe(2)

      // Page 2
      const resPage2 = await request(app.getHttpServer())
        .get('/api/admin/reviews?status=pending&q=توشيبا&pageSize=1&page=2')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(resPage2.body.items).toHaveLength(1)
      expect(resPage2.body.items[0].id).toBe(revPending2Id)
      expect(resPage2.body.page).toBe(2)
      expect(resPage2.body.pageSize).toBe(1)
      expect(resPage2.body.total).toBe(2)
    })
  })

  // ==========================================================================
  // Scenario 3: Approved and rejected tabs order by updatedAt desc
  // ==========================================================================
  describe('Scenario 3: Approved and rejected tabs order by updatedAt desc', () => {
    it('orders approved reviews by updatedAt desc', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/reviews?status=approved&q=أوليمبيك')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body: AdminReviewListResponse = res.body
      expect(body.items.length).toBeGreaterThanOrEqual(2)

      const ids = body.items.map((i) => i.id)
      const newIndex = ids.indexOf(revOlympicAppNewId)
      const oldIndex = ids.indexOf(revOlympicAppOldId)

      expect(newIndex).toBeGreaterThanOrEqual(0)
      expect(oldIndex).toBeGreaterThan(newIndex)
    })

    it('orders rejected reviews by updatedAt desc', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/reviews?status=rejected&q=أوليمبيك')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body: AdminReviewListResponse = res.body
      expect(body.items.length).toBeGreaterThanOrEqual(2)

      const ids = body.items.map((i) => i.id)
      const newIndex = ids.indexOf(revOlympicRejNewId)
      const oldIndex = ids.indexOf(revOlympicRejOldId)

      expect(newIndex).toBeGreaterThanOrEqual(0)
      expect(oldIndex).toBeGreaterThan(newIndex)
    })
  })

  // ==========================================================================
  // Scenario 4: Approve transition & verified buyer re-check
  // ==========================================================================
  describe('Scenario 4: Approve transition & verified buyer re-check', () => {
    it('approves review and sets verifiedBuyer=true when customer phone has a delivered order with product', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revVerifiedBuyerId}/approve`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const row: AdminReviewRow = res.body
      expect(row.id).toBe(revVerifiedBuyerId)
      expect(row.status).toBe('approved')
      expect(row.verifiedBuyer).toBe(true)
    })

    it('approves review and leaves verifiedBuyer=false when customer phone has no delivered order', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revNotVerifiedBuyerId}/approve`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const row: AdminReviewRow = res.body
      expect(row.id).toBe(revNotVerifiedBuyerId)
      expect(row.status).toBe('approved')
      expect(row.verifiedBuyer).toBe(false)
    })

    it('is idempotent on already approved review, still returning 200 with row', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revVerifiedBuyerId}/approve`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(res.body.id).toBe(revVerifiedBuyerId)
      expect(res.body.status).toBe('approved')
      expect(res.body.verifiedBuyer).toBe(true)
    })

    it('returns 404 for non-existent review id on approve', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/reviews/non-existent-review-id/approve')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      expect(res.body.message).toContain('التقييم غير موجود')
    })
  })

  // ==========================================================================
  // Scenario 5: Reject from pending and unpublish (approve then reject)
  // ==========================================================================
  describe('Scenario 5: Reject and Unpublish', () => {
    it('rejects a pending review', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revPending3Id}/reject`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(res.body.id).toBe(revPending3Id)
      expect(res.body.status).toBe('rejected')
    })

    it('unpublishes an approved review by setting status to rejected', async () => {
      // revNotVerifiedBuyer was approved in Scenario 4
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revNotVerifiedBuyerId}/reject`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(res.body.id).toBe(revNotVerifiedBuyerId)
      expect(res.body.status).toBe('rejected')
    })

    it('is idempotent on repeated reject, returning 200 with row', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revPending3Id}/reject`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(res.body.id).toBe(revPending3Id)
      expect(res.body.status).toBe('rejected')
    })

    it('returns 404 for non-existent review id on reject', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/reviews/non-existent-review-id/reject')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      expect(res.body.message).toContain('التقييم غير موجود')
    })
  })

  // ==========================================================================
  // Scenario 6: Public reply
  // ==========================================================================
  describe('Scenario 6: Public reply (set, update, clear, validation)', () => {
    it('sets a trimmed public reply', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revForReplyId}/reply`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ reply: '   شكراً لك على تقييمك الممتاز لمجموعتنا   ' })
        .expect(200)

      expect(res.body.id).toBe(revForReplyId)
      expect(res.body.reply).toBe('شكراً لك على تقييمك الممتاز لمجموعتنا')
    })

    it('updates an existing public reply', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revForReplyId}/reply`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ reply: 'رد متجر سراج الجديد والمحدث' })
        .expect(200)

      expect(res.body.reply).toBe('رد متجر سراج الجديد والمحدث')
    })

    it('clears reply when given empty string, whitespace, or null', async () => {
      // Empty string -> null
      const resEmpty = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revForReplyId}/reply`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ reply: '' })
        .expect(200)

      expect(resEmpty.body.reply).toBeNull()

      // Whitespace -> null
      const resWhitespace = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revForReplyId}/reply`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ reply: '     ' })
        .expect(200)

      expect(resWhitespace.body.reply).toBeNull()

      // Null -> null
      const resNull = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revForReplyId}/reply`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ reply: null })
        .expect(200)

      expect(resNull.body.reply).toBeNull()
    })

    it('refuses reply longer than 500 characters with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revForReplyId}/reply`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ reply: 'a'.repeat(501) })
        .expect(400)
    })

    it('returns 404 for non-existent review id on reply', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/reviews/non-existent-review-id/reply')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ reply: 'تجربة' })
        .expect(404)

      expect(res.body.message).toContain('التقييم غير موجود')
    })
  })

  // ==========================================================================
  // Scenario 7: Delete and re-submission
  // ==========================================================================
  describe('Scenario 7: Delete review and free phone for re-submission', () => {
    it('deletes review returning 204, subsequent approve returns 404, and phone can re-submit', async () => {
      // 1. Delete review -> 204
      await request(app.getHttpServer())
        .delete(`/api/admin/reviews/${revForDeleteId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(204)

      // 2. Subsequent approve returns 404
      const approveRes = await request(app.getHttpServer())
        .patch(`/api/admin/reviews/${revForDeleteId}/approve`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      expect(approveRes.body.message).toContain('التقييم غير موجود')

      // 3. Same phone can now re-submit a review for the same product via POST /api/reviews -> 201
      const reSubmitRes = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: prodTefalId,
          name: 'نبيل سعيد مرة أخرى',
          phone: deleteReviewPhone,
          stars: 5,
          text: 'تقييم جديد تماما بعد حذف القديم بنجاح والخدمة ممتازة',
        })
        .expect(201)

      expect(reSubmitRes.body).toEqual({ ok: true })
    })

    it('returns 404 when deleting an already deleted or non-existent review', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/admin/reviews/${revForDeleteId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      expect(res.body.message).toContain('التقييم غير موجود')
    })
  })

  // ==========================================================================
  // Scenario 8: Pending count endpoint
  // ==========================================================================
  describe('Scenario 8: Pending count endpoint', () => {
    it('returns the exact count of pending reviews', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/reviews/pending-count')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const dbPendingCount = await prisma.review.count({
        where: { status: 'pending' },
      })

      expect(res.body).toEqual({ count: dbPendingCount })
    })
  })

  // ==========================================================================
  // Scenario 9: Mutation audit logging and PII masking
  // ==========================================================================
  describe('Scenario 9: Mutation audit logging and PII masking', () => {
    it('writes audit records for approve and delete, masking raw phone numbers', async () => {
      // 1. Audit for approve
      const approveAudit = await prisma.auditLog.findFirst({
        where: {
          entity: 'review',
          action: 'review.approve',
          entityId: revVerifiedBuyerId,
          userId: ownerUserId,
        },
      })

      expect(approveAudit).not.toBeNull()
      expect(approveAudit?.entityId).toBe(revVerifiedBuyerId)

      // Verified buyer phone was '01033330001'
      // Masking should mask the middle digits: 010******01
      const after = approveAudit?.after as Record<string, unknown>
      expect(after).toBeDefined()
      expect(after.phone).toBe('010******01')
      expect(after.phone).not.toBe(verifiedBuyerPhone)

      // 2. Audit for delete
      const deleteAudit = await prisma.auditLog.findFirst({
        where: {
          entity: 'review',
          action: 'review.delete',
          entityId: revForDeleteId,
          userId: ownerUserId,
        },
      })

      expect(deleteAudit).not.toBeNull()
      expect(deleteAudit?.entityId).toBe(revForDeleteId)
    })
  })
})
