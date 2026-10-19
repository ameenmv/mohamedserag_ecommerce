import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type AdminNotifyMarkSentResponse,
  type AdminNotifyProductDetail,
  type AdminNotifyProductRow,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Notify-me API E2E (/api/notify-me, /api/admin/notify-me)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `admin-notify-owner-${runId}@serag.test`
  const restrictedEmail = `admin-notify-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let ownerCsrfToken = ''

  let restrictedUserId = ''
  let restrictedSessionCookie = ''
  let restrictedCsrfToken = ''

  let categoryId = ''
  let brandId = ''

  let outOfStockProdId = ''
  let outOfStockProdName = ''

  let modeOutProdId = ''
  let modeOutProdName = ''

  let inStockProdId = ''
  let onRequestProdId = ''
  let hiddenProdId = ''
  let archivedProdId = ''
  let restockedProdId = ''

  const createdProductIds: string[] = []
  const testPhones: string[] = [
    '01012345678',
    '01012345679',
    '01011112222',
    '01099998888',
    '01055554444',
  ]

  let ipCounter = 1
  const nextIp = () => `10.5.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

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

    // Restricted role (WITHOUT notify.manage)
    const restrictedRoleKey = `restricted-notify-${runId}`
    const restrictedRole = await prisma.role.create({
      data: { key: restrictedRoleKey, name: 'موظف بدون صلاحيات الإشعارات' },
    })

    const nonNotifyPerms = perms.filter(
      (p) => p.key === PERMISSIONS.orders.read || p.key === PERMISSIONS.orders.update,
    )
    for (const p of nonNotifyPerms) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: p.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)

    // Create Owner user
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير الإشعارات ${runId}`,
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
        name: `موظف بدون إشعارات ${runId}`,
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

    // 1. Out-of-stock product (stock 0, auto mode)
    outOfStockProdName = `غسالة نافذة ${runId}`
    const p1 = await prisma.product.create({
      data: {
        modelCode: `NOTIFY-OOS-${runId}`,
        slug: `notify-oos-${runId}`,
        name: outOfStockProdName,
        brandId,
        categoryId,
        price: 120_000,
        stock: 0,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    outOfStockProdId = p1.id
    createdProductIds.push(p1.id)

    // 2. Mode 'out' product (stock 10, mode out)
    modeOutProdName = `ثلاجة غير متوفرة ${runId}`
    const p2 = await prisma.product.create({
      data: {
        modelCode: `NOTIFY-MODEOUT-${runId}`,
        slug: `notify-modeout-${runId}`,
        name: modeOutProdName,
        brandId,
        categoryId,
        price: 250_000,
        stock: 10,
        lowStockThreshold: 1,
        availabilityMode: 'out',
        visible: true,
        taxRate: 14,
      },
    })
    modeOutProdId = p2.id
    createdProductIds.push(p2.id)

    // 3. In-stock product (stock 5, mode auto)
    const p3 = await prisma.product.create({
      data: {
        modelCode: `NOTIFY-INSTOCK-${runId}`,
        slug: `notify-instock-${runId}`,
        name: `بوتاجاز متوفر ${runId}`,
        brandId,
        categoryId,
        price: 90_000,
        stock: 5,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    inStockProdId = p3.id
    createdProductIds.push(p3.id)

    // 4. On-request product (stock 0, mode on_request)
    const p4 = await prisma.product.create({
      data: {
        modelCode: `NOTIFY-ONREQ-${runId}`,
        slug: `notify-onreq-${runId}`,
        name: `تكييف بالطلب ${runId}`,
        brandId,
        categoryId,
        price: 300_000,
        stock: 0,
        lowStockThreshold: 1,
        availabilityMode: 'on_request',
        visible: true,
        taxRate: 14,
      },
    })
    onRequestProdId = p4.id
    createdProductIds.push(p4.id)

    // 5. Hidden product (visible false)
    const p5 = await prisma.product.create({
      data: {
        modelCode: `NOTIFY-HIDDEN-${runId}`,
        slug: `notify-hidden-${runId}`,
        name: `شاشة مخفية ${runId}`,
        brandId,
        categoryId,
        price: 180_000,
        stock: 0,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: false,
        taxRate: 14,
      },
    })
    hiddenProdId = p5.id
    createdProductIds.push(p5.id)

    // 6. Archived product (archivedAt set)
    const p6 = await prisma.product.create({
      data: {
        modelCode: `NOTIFY-ARCH-${runId}`,
        slug: `notify-arch-${runId}`,
        name: `ميكروويف مؤرشف ${runId}`,
        brandId,
        categoryId,
        price: 70_000,
        stock: 0,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        archivedAt: new Date(),
        taxRate: 14,
      },
    })
    archivedProdId = p6.id
    createdProductIds.push(p6.id)

    // 7. Restocked product (starts with stock 0, will be restocked in tests)
    const p7 = await prisma.product.create({
      data: {
        modelCode: `NOTIFY-RESTOCK-${runId}`,
        slug: `notify-restock-${runId}`,
        name: `سخان متجدد ${runId}`,
        brandId,
        categoryId,
        price: 60_000,
        stock: 0,
        lowStockThreshold: 1,
        availabilityMode: 'auto',
        visible: true,
        taxRate: 14,
      },
    })
    restockedProdId = p7.id
    createdProductIds.push(p7.id)
  })

  afterAll(async () => {
    // 1. Delete WhatsApp messages created during tests
    await prisma.whatsAppMessage.deleteMany({
      where: {
        orderId: null,
        templateKey: 'notify_back_in_stock',
        to: { in: testPhones },
      },
    })

    // 2. Delete notify requests
    if (createdProductIds.length > 0) {
      await prisma.notifyRequest.deleteMany({
        where: { productId: { in: createdProductIds } },
      })
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      })
    }

    // 3. Delete users, roles, audit logs, and sessions
    if (ownerUserId || restrictedUserId) {
      const userIds = [ownerUserId, restrictedUserId].filter(Boolean)
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
      await prisma.rolePermission.deleteMany({
        where: { role: { key: `restricted-notify-${runId}` } },
      })
      await prisma.role.deleteMany({ where: { key: `restricted-notify-${runId}` } })
    }

    await app.close()
  })

  // ==========================================================================
  // Scenario 1: Public request on out-of-stock and mode 'out' products
  // ==========================================================================
  describe('Scenario 1: Out-of-stock product and mode out product requests', () => {
    it('accepts Arabic-digit mobile number, normalizes phone, and saves entry with status waiting', async () => {
      // 1. Request on out-of-stock product with Arabic digits «٠١٠١٢٣٤٥٦٧٨»
      const res1 = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: outOfStockProdId,
          name: 'أحمد علي',
          phone: '٠١٠١٢٣٤٥٦٧٨',
        })
        .expect(201)

      expect(res1.body).toEqual({ ok: true })

      const row1 = await prisma.notifyRequest.findUnique({
        where: {
          productId_phone: {
            productId: outOfStockProdId,
            phone: '01012345678',
          },
        },
      })
      expect(row1).not.toBeNull()
      expect(row1?.phone).toBe('01012345678')
      expect(row1?.name).toBe('أحمد علي')
      expect(row1?.status).toBe('waiting')
      expect(row1?.sentAt).toBeNull()

      // 2. Request on mode 'out' product with Arabic digits «٠١٠١٢٣٤٥٦٧٩»
      const res2 = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: modeOutProdId,
          name: 'سارة محمد',
          phone: '٠١٠١٢٣٤٥٦٧٩',
        })
        .expect(201)

      expect(res2.body).toEqual({ ok: true })

      const row2 = await prisma.notifyRequest.findUnique({
        where: {
          productId_phone: {
            productId: modeOutProdId,
            phone: '01012345679',
          },
        },
      })
      expect(row2).not.toBeNull()
      expect(row2?.phone).toBe('01012345679')
      expect(row2?.name).toBe('سارة محمد')
      expect(row2?.status).toBe('waiting')
    })
  })

  // ==========================================================================
  // Scenario 2: Repeat request on same product and phone
  // ==========================================================================
  describe('Scenario 2: Repeat request upsert and reset', () => {
    it('maintains exactly one row, updates name, sets newer updatedAt, and resets sent entry back to waiting', async () => {
      const pastDate = new Date(Date.now() - 60_000)

      // Simulate that the entry from Scenario 1 was previously sent
      await prisma.notifyRequest.update({
        where: {
          productId_phone: {
            productId: outOfStockProdId,
            phone: '01012345678',
          },
        },
        data: {
          status: 'sent',
          sentAt: pastDate,
          updatedAt: pastDate,
        },
      })

      // Repeat request with updated name
      const repeatRes = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: outOfStockProdId,
          name: 'أحمد علي المحدث',
          phone: '01012345678',
        })
        .expect(201)

      expect(repeatRes.body).toEqual({ ok: true })

      // Verify exactly one row exists
      const totalCount = await prisma.notifyRequest.count({
        where: {
          productId: outOfStockProdId,
          phone: '01012345678',
        },
      })
      expect(totalCount).toBe(1)

      // Verify row state
      const updatedRow = await prisma.notifyRequest.findUniqueOrThrow({
        where: {
          productId_phone: {
            productId: outOfStockProdId,
            phone: '01012345678',
          },
        },
      })
      expect(updatedRow.name).toBe('أحمد علي المحدث')
      expect(updatedRow.status).toBe('waiting')
      expect(updatedRow.sentAt).toBeNull()
      expect(updatedRow.updatedAt.getTime()).toBeGreaterThan(pastDate.getTime())
    })
  })

  // ==========================================================================
  // Scenario 3: Validation and refusal rules (409, 404, 400)
  // ==========================================================================
  describe('Scenario 3: Product status and phone validations', () => {
    it('returns 409 for in-stock product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: inStockProdId,
          name: 'عميل متاح',
          phone: '01011112222',
        })
        .expect(409)

      expect(res.body.message).toBe('المنتج متوفر دلوقتي')
    })

    it('returns 409 for on_request product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: onRequestProdId,
          name: 'عميل طلب',
          phone: '01011112222',
        })
        .expect(409)

      expect(res.body.message).toBe('المنتج متوفر دلوقتي')
    })

    it('returns 404 for hidden product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: hiddenProdId,
          name: 'عميل مخفي',
          phone: '01011112222',
        })
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })

    it('returns 404 for archived product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: archivedProdId,
          name: 'عميل مؤرشف',
          phone: '01011112222',
        })
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })

    it('returns 404 for non-existent product ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: 'non-existent-product-id',
          name: 'عميل وهمي',
          phone: '01011112222',
        })
        .expect(404)

      expect(res.body.message).toBe('المنتج مش موجود')
    })

    it('returns 400 for invalid phone number', async () => {
      await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: outOfStockProdId,
          name: 'عميل رقم خطأ',
          phone: '012345',
        })
        .expect(400)
    })
  })

  // ==========================================================================
  // Scenario 4: Honeypot protection
  // ==========================================================================
  describe('Scenario 4: Honeypot silently ignored', () => {
    it('returns 201 when website honeypot is filled and does not persist anything', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', nextIp())
        .send({
          productId: outOfStockProdId,
          name: 'بوت سبام',
          phone: '01099998888',
          website: 'https://spambot.example.com',
        })
        .expect(201)

      expect(res.body).toEqual({ ok: true })

      const spamCheck = await prisma.notifyRequest.findUnique({
        where: {
          productId_phone: {
            productId: outOfStockProdId,
            phone: '01099998888',
          },
        },
      })
      expect(spamCheck).toBeNull()
    })
  })

  // ==========================================================================
  // Scenario 5: Rate Limiting / Throttle
  // ==========================================================================
  describe('Scenario 5: Throttling', () => {
    it('returns 429 on the 6th request within a minute from the same IP', async () => {
      const throttleIp = `192.168.77.${Math.floor(Math.random() * 200) + 10}`

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/notify-me')
          .set('X-Forwarded-For', throttleIp)
          .send({
            productId: outOfStockProdId,
            name: `عميل معدل ${i}`,
            phone: `0100000000${i}`,
            website: 'spam-bot-trap',
          })
          .expect(201)
      }

      await request(app.getHttpServer())
        .post('/api/notify-me')
        .set('X-Forwarded-For', throttleIp)
        .send({
          productId: outOfStockProdId,
          name: 'عميل تجاوز الحد',
          phone: '01000000009',
          website: 'spam-bot-trap',
        })
        .expect(429)
    })
  })

  // ==========================================================================
  // Scenario 6: Admin waiting list
  // ==========================================================================
  describe('Scenario 6: Admin waiting lists and ordering', () => {
    it('returns 403 for restricted admin, and lists products back-in-stock first for owner', async () => {
      // 1. Restricted admin without notify.manage gets 403
      await request(app.getHttpServer())
        .get('/api/admin/notify-me')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // 2. Setup a waiting entry on restockedProd, then restock it (stock > 0)
      await prisma.notifyRequest.create({
        data: {
          productId: restockedProdId,
          name: 'عميل المنتج المتوفر',
          phone: '01055554444',
          status: 'waiting',
        },
      })

      await prisma.product.update({
        where: { id: restockedProdId },
        data: { stock: 8 },
      })

      // 3. Owner retrieves the list
      const listRes = await request(app.getHttpServer())
        .get('/api/admin/notify-me')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const items = listRes.body as AdminNotifyProductRow[]
      const restockedRow = items.find((r) => r.product.id === restockedProdId)
      const outOfStockRow = items.find((r) => r.product.id === outOfStockProdId)

      expect(restockedRow).toBeDefined()
      expect(restockedRow?.product.available).toBe(true)
      expect(restockedRow?.product.stock).toBe(8)
      expect(restockedRow?.waiting).toBe(1)
      expect(restockedRow?.sent).toBe(0)

      expect(outOfStockRow).toBeDefined()
      expect(outOfStockRow?.product.available).toBe(false)
      expect(outOfStockRow?.waiting).toBe(1)

      // Verify restocked product (available: true, waiting > 0) sorts before out-of-stock product
      const restockedIndex = items.findIndex((r) => r.product.id === restockedProdId)
      const outOfStockIndex = items.findIndex((r) => r.product.id === outOfStockProdId)
      expect(restockedIndex).toBeLessThan(outOfStockIndex)
    })
  })

  // ==========================================================================
  // Scenario 7: Admin product detail
  // ==========================================================================
  describe('Scenario 7: Admin waiting list entries detail', () => {
    it('returns 403 for restricted admin, 404 for unknown product, and lists entries with phone and status', async () => {
      // 1. Restricted admin gets 403
      await request(app.getHttpServer())
        .get(`/api/admin/notify-me/${outOfStockProdId}`)
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // 2. Unknown product gets 404
      await request(app.getHttpServer())
        .get('/api/admin/notify-me/non-existent-product-id')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      // 3. Owner retrieves detail
      const detailRes = await request(app.getHttpServer())
        .get(`/api/admin/notify-me/${outOfStockProdId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const detail = detailRes.body as AdminNotifyProductDetail
      expect(detail.product.id).toBe(outOfStockProdId)
      expect(detail.product.available).toBe(false)
      expect(detail.entries.length).toBeGreaterThanOrEqual(1)

      const entry = detail.entries.find((e) => e.phone === '01012345678')
      expect(entry).toBeDefined()
      expect(entry?.name).toBe('أحمد علي المحدث')
      expect(entry?.status).toBe('waiting')
      expect(entry?.sentAt).toBeNull()
    })
  })

  // ==========================================================================
  // Scenario 8: PATCH mark sent, WhatsApp message logging & CSRF
  // ==========================================================================
  let targetEntryId = ''

  describe('Scenario 8: PATCH mark sent and WhatsApp URL generation', () => {
    it('refuses without CSRF, returns 409 when out of stock, and marks sent with WhatsApp URL upon restock', async () => {
      const dbEntry = await prisma.notifyRequest.findUniqueOrThrow({
        where: {
          productId_phone: {
            productId: outOfStockProdId,
            phone: '01012345678',
          },
        },
      })
      targetEntryId = dbEntry.id

      // 1. Restricted admin gets 403
      await request(app.getHttpServer())
        .patch(`/api/admin/notify-me/${targetEntryId}`)
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // 2. Owner without CSRF token is refused with 403
      await request(app.getHttpServer())
        .patch(`/api/admin/notify-me/${targetEntryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      // 3. While product is still out of stock (stock 0) -> 409
      const patchOutRes = await request(app.getHttpServer())
        .patch(`/api/admin/notify-me/${targetEntryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(409)

      expect(patchOutRes.body.message).toBe('المنتج لسه مش متوفر')

      // 4. Restock the product (stock > 0)
      await prisma.product.update({
        where: { id: outOfStockProdId },
        data: { stock: 12 },
      })

      // 5. PATCH after restocking -> 200 with wa.me link and status sent
      const patchSuccessRes = await request(app.getHttpServer())
        .patch(`/api/admin/notify-me/${targetEntryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const patchData = patchSuccessRes.body as AdminNotifyMarkSentResponse
      expect(patchData.whatsappUrl).toMatch(/^https:\/\/wa\.me\/201012345678\?text=/)
      expect(decodeURIComponent(patchData.whatsappUrl)).toContain(outOfStockProdName)
      expect(patchData.entry.status).toBe('sent')
      expect(patchData.entry.sentAt).not.toBeNull()

      // 6. Verify entry in database is updated to sent
      const updatedEntry = await prisma.notifyRequest.findUniqueOrThrow({
        where: { id: targetEntryId },
      })
      expect(updatedEntry.status).toBe('sent')
      expect(updatedEntry.sentAt).not.toBeNull()

      // 7. Verify whatsAppMessage record exists with templateKey notify_back_in_stock
      const waMsg = await prisma.whatsAppMessage.findFirst({
        where: {
          templateKey: 'notify_back_in_stock',
          to: '01012345678',
        },
      })
      expect(waMsg).not.toBeNull()
      expect(waMsg?.orderId).toBeNull()
      expect(waMsg?.channel).toBe('link')
      expect(waMsg?.status).toBe('opened')
      expect(waMsg?.userId).toBe(ownerUserId)
      expect(waMsg?.variables).toMatchObject({
        customerName: 'أحمد علي المحدث',
        productName: outOfStockProdName,
      })

      // 8. Unknown ID returns 404
      await request(app.getHttpServer())
        .patch('/api/admin/notify-me/non-existent-notify-id')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      // 9. Re-sending on an already sent entry is allowed and creates a new message log
      const resendRes = await request(app.getHttpServer())
        .patch(`/api/admin/notify-me/${targetEntryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(resendRes.body.entry.status).toBe('sent')
    })
  })

  // ==========================================================================
  // Scenario 9: Audit log written for PATCH
  // ==========================================================================
  describe('Scenario 9: Audit log', () => {
    it('creates an audit log record for notify_request.markSent', async () => {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entity: 'notify_request',
          entityId: targetEntryId,
          userId: ownerUserId,
        },
      })

      expect(auditLog).not.toBeNull()
      expect(auditLog?.action).toBe('notify_request.markSent')
      expect(auditLog?.after).toBeDefined()
    })
  })
})
