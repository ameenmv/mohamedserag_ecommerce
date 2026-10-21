import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type AdminGuide,
  type AdminGuideRow,
  type GuideCard,
  type GuideInput,
  type PublicGuide,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Content Guides API E2E (/api/guides + /api/admin/guides)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  const ownerEmail = `guides-owner-${runId}@serag.test`
  const restrictedEmail = `guides-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  const restrictedRoleKey = `restricted-guides-${runId}`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let ownerCsrfToken = ''

  let restrictedUserId = ''
  let restrictedSessionCookie = ''
  let restrictedCsrfToken = ''

  let categoryId = ''
  let categorySlug = ''
  let categoryName = ''
  let productIds: string[] = []

  let mainGuide: AdminGuide

  let ipCounter = 1
  const nextIp = () => `10.45.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  const guideBody = (overrides: Partial<GuideInput> = {}): GuideInput => ({
    slug: `guide-main-${runId}`,
    title: `دليل تجريبي ${runId}`,
    summary: 'ملخص تجريبي للدليل',
    cover: null,
    body: '<p>محتوى الدليل</p>',
    categoryIds: [],
    productIds: [],
    seoTitle: null,
    seoDescription: null,
    published: true,
    ...overrides,
  })

  const createGuide = async (body: GuideInput): Promise<AdminGuide> => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/guides')
      .set('Cookie', ownerSessionCookie)
      .set('x-csrf-token', ownerCsrfToken)
      .set('X-Forwarded-For', nextIp())
      .send(body)
      .expect(201)
    return res.body
  }

  const adminGuide = async (id: string): Promise<AdminGuide> => {
    const res = await request(app.getHttpServer())
      .get(`/api/admin/guides/${id}`)
      .set('Cookie', ownerSessionCookie)
      .set('X-Forwarded-For', nextIp())
      .expect(200)
    return res.body
  }

  const publicList = async (
    query = '',
  ): Promise<{ items: GuideCard[]; total: number; page: number; pageSize: number }> => {
    const res = await request(app.getHttpServer())
      .get(`/api/guides${query}`)
      .set('X-Forwarded-For', nextIp())
      .expect(200)
    return res.body
  }

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
      data: { key: restrictedRoleKey, name: 'موظف بدون صلاحية المحتوى' },
    })

    for (const p of perms.filter((perm) => perm.key === PERMISSIONS.orders.read)) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: p.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير الأدلة ${runId}`,
        passwordHash,
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    })
    ownerUserId = ownerUser.id

    const restrictedUser = await prisma.user.create({
      data: {
        email: restrictedEmail,
        name: `موظف مقيد ${runId}`,
        passwordHash,
        roles: { create: [{ roleId: restrictedRole.id }] },
      },
    })
    restrictedUserId = restrictedUser.id

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

    const category = await prisma.category.findFirst({
      where: { visible: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!category) throw new Error('no visible seeded category found')
    categoryId = category.id
    categorySlug = category.slug
    categoryName = category.name

    const products = await prisma.product.findMany({
      where: {
        visible: true,
        archivedAt: null,
        brand: { visible: true },
        category: { visible: true },
      },
      orderBy: { createdAt: 'asc' },
      take: 2,
    })
    if (products.length < 2) throw new Error('need two visible seeded products')
    const first = products[0]
    const second = products[1]
    if (!first || !second) throw new Error('need two visible seeded products')
    // Stored order is deliberately reversed to prove the API keeps it.
    productIds = [second.id, first.id]
  })

  afterAll(async () => {
    await prisma.guide.deleteMany({ where: { slug: { endsWith: `-${runId}` } } })

    const userIds = [ownerUserId, restrictedUserId].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
      await prisma.rolePermission.deleteMany({ where: { role: { key: restrictedRoleKey } } })
      await prisma.role.deleteMany({ where: { key: restrictedRoleKey } })
    }

    await app.close()
  })

  // ==========================================================================
  // Scenario 1: RBAC and CSRF protection
  // ==========================================================================
  describe('Scenario 1: RBAC and CSRF protection', () => {
    it('rejects a restricted admin and a CSRF-less mutation', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/guides')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .post('/api/admin/guides')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(guideBody({ slug: `guide-restricted-${runId}` }))
        .expect(403)

      await request(app.getHttpServer())
        .patch('/api/admin/guides/does-not-exist')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ published: false })
        .expect(403)

      await request(app.getHttpServer())
        .delete('/api/admin/guides/does-not-exist')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .post('/api/admin/guides')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send(guideBody({ slug: `guide-no-csrf-${runId}` }))
        .expect(403)
    })
  })

  // ==========================================================================
  // Scenario 2: Create and expose a published guide
  // ==========================================================================
  describe('Scenario 2: Create a published guide', () => {
    it('creates it and serves products in stored order plus its category', async () => {
      mainGuide = await createGuide(
        guideBody({
          slug: `guide-main-${runId}`,
          categoryIds: [categoryId],
          productIds,
        }),
      )

      expect(mainGuide.slug).toBe(`guide-main-${runId}`)
      expect(mainGuide.published).toBe(true)
      expect(mainGuide.publishedAt).not.toBeNull()
      expect(mainGuide.categories).toEqual([
        { id: categoryId, slug: categorySlug, name: categoryName },
      ])
      expect(mainGuide.products.map((product) => product.id)).toEqual(productIds)

      const detailRes = await request(app.getHttpServer())
        .get(`/api/guides/guide-main-${runId}`)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const detail: PublicGuide = detailRes.body
      expect(detail.products.map((product) => product.id)).toEqual(productIds)
      expect(detail.categories).toContainEqual({ slug: categorySlug, name: categoryName })
      expect(detail.publishedAt).toBe(mainGuide.publishedAt)

      const list = await publicList()
      expect(list.items.map((item) => item.slug)).toContain(`guide-main-${runId}`)
    })
  })

  // ==========================================================================
  // Scenario 3: Validation and conflicts
  // ==========================================================================
  describe('Scenario 3: Validation and conflicts', () => {
    it('rejects a duplicate slug with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/guides')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(guideBody({ slug: `guide-main-${runId}` }))
        .expect(409)
      expect(res.body.message).toContain('الرابط ده مستخدم')
    })

    it('rejects an unknown product id with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/guides')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(
          guideBody({
            slug: `guide-badproduct-${runId}`,
            productIds: [productIds[0] ?? '', 'missing-product-id'],
          }),
        )
        .expect(400)
      expect(res.body.message).toContain('في منتج مش موجود')
    })

    it('rejects a bad slug and a foreign cover', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/guides')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(guideBody({ slug: 'Bad Slug' }))
        .expect(400)

      await request(app.getHttpServer())
        .post('/api/admin/guides')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(
          guideBody({
            slug: `guide-badcover-${runId}`,
            cover: 'https://evil.example/x.png',
          }),
        )
        .expect(400)
    })
  })

  // ==========================================================================
  // Scenario 4: Sanitizing the rich text body
  // ==========================================================================
  describe('Scenario 4: Sanitizing the rich text body', () => {
    it('keeps only uploaded images and strips scripts and handlers', async () => {
      const dirtyBody =
        '<p onclick="x()">نص</p><img src="https://evil.example/x.png"><img src="/uploads/content/a.png" alt="a"><script>alert(1)</script>'

      const created = await createGuide(
        guideBody({ slug: `guide-clean-${runId}`, body: dirtyBody }),
      )

      expect(created.body).not.toContain('onclick')
      expect(created.body).not.toContain('<script')
      expect(created.body).not.toContain('evil.example')
      expect(created.body).toContain('/uploads/content/a.png')
    })
  })

  // ==========================================================================
  // Scenario 5: Unpublish and republish
  // ==========================================================================
  describe('Scenario 5: Unpublish and republish', () => {
    it('hides an unpublished guide while keeping its first publishedAt', async () => {
      const originalPublishedAt = mainGuide.publishedAt

      await request(app.getHttpServer())
        .patch(`/api/admin/guides/${mainGuide.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ published: false })
        .expect(200)

      const notFoundRes = await request(app.getHttpServer())
        .get(`/api/guides/guide-main-${runId}`)
        .set('X-Forwarded-For', nextIp())
        .expect(404)
      expect(notFoundRes.body.message).toContain('الدليل ده مش موجود')

      const hiddenSlugs = (await publicList()).items.map((item) => item.slug)
      expect(hiddenSlugs).not.toContain(`guide-main-${runId}`)

      const hiddenAdmin = await adminGuide(mainGuide.id)
      expect(hiddenAdmin.published).toBe(false)
      expect(hiddenAdmin.publishedAt).toBe(originalPublishedAt)

      const republished = await request(app.getHttpServer())
        .patch(`/api/admin/guides/${mainGuide.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ published: true })
        .expect(200)

      expect(republished.body.publishedAt).toBe(originalPublishedAt)

      await request(app.getHttpServer())
        .get(`/api/guides/guide-main-${runId}`)
        .set('X-Forwarded-For', nextIp())
        .expect(200)
    })
  })

  // ==========================================================================
  // Scenario 6: Public pagination
  // ==========================================================================
  describe('Scenario 6: Public pagination', () => {
    it('pages results and rejects an oversized pageSize', async () => {
      const firstPage = await publicList('?pageSize=1&page=1')
      expect(firstPage.items).toHaveLength(1)
      expect(firstPage.pageSize).toBe(1)
      expect(firstPage.total).toBeGreaterThanOrEqual(1)

      await request(app.getHttpServer())
        .get('/api/guides?pageSize=100')
        .set('X-Forwarded-For', nextIp())
        .expect(400)
    })
  })

  // ==========================================================================
  // Scenario 7: Delete
  // ==========================================================================
  describe('Scenario 7: Delete', () => {
    it('deletes a guide and returns 404 afterwards', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/admin/guides?q=guide-clean')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const rows: AdminGuideRow[] = listRes.body.items
      const cleanRow = rows.find((row) => row.slug === `guide-clean-${runId}`)
      if (!cleanRow) throw new Error('sanitized guide not found')

      await request(app.getHttpServer())
        .delete(`/api/admin/guides/${cleanRow.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(204)

      await request(app.getHttpServer())
        .get(`/api/admin/guides/${cleanRow.id}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(404)
    })
  })
})
