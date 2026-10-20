import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type AdminPage,
  type AdminPageRow,
  type PageInput,
  type PublicPage,
  type PublicPageLink,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

interface StoredPage {
  id: string
  slug: string
  title: string
  body: string
  seoTitle: string | null
  seoDescription: string | null
  published: boolean
  createdAt: Date
  updatedAt: Date
}

describe('Content Pages API E2E (/api/pages + /api/admin/pages)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `pages-owner-${runId}@serag.test`
  const restrictedEmail = `pages-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  const restrictedRoleKey = `restricted-pages-${runId}`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let ownerCsrfToken = ''

  let restrictedUserId = ''
  let restrictedSessionCookie = ''
  let restrictedCsrfToken = ''

  const originalPages: StoredPage[] = []

  let aboutId = ''
  let returnsId = ''
  let faqId = ''

  let ipCounter = 1
  const nextIp = () => `10.44.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

  const publicList = async (): Promise<PublicPageLink[]> => {
    const res = await request(app.getHttpServer())
      .get('/api/pages')
      .set('X-Forwarded-For', nextIp())
      .expect(200)
    return res.body.items
  }

  const adminPage = async (id: string): Promise<AdminPage> => {
    const res = await request(app.getHttpServer())
      .get(`/api/admin/pages/${id}`)
      .set('Cookie', ownerSessionCookie)
      .set('X-Forwarded-For', nextIp())
      .expect(200)
    return res.body
  }

  const patchBody = (page: AdminPage, overrides: Partial<PageInput>): PageInput => ({
    title: page.title,
    body: page.body,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    published: page.published,
    ...overrides,
  })

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

    const allowedPerms = perms.filter((p) => p.key === PERMISSIONS.orders.read)
    for (const p of allowedPerms) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: p.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير المحتوى ${runId}`,
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

    const pages = await prisma.page.findMany()
    for (const page of pages) {
      originalPages.push({
        id: page.id,
        slug: page.slug,
        title: page.title,
        body: page.body,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        published: page.published,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })
    }

    const listRes = await request(app.getHttpServer())
      .get('/api/admin/pages')
      .set('Cookie', ownerSessionCookie)
      .set('X-Forwarded-For', nextIp())
      .expect(200)

    const rows: AdminPageRow[] = listRes.body.items
    const requireId = (slug: string): string => {
      const row = rows.find((r) => r.slug === slug)
      if (!row) throw new Error(`seeded page "${slug}" not found`)
      return row.id
    }
    aboutId = requireId('about')
    returnsId = requireId('returns')
    faqId = requireId('faq')
  })

  afterAll(async () => {
    await prisma.page.deleteMany({})
    for (const page of originalPages) {
      await prisma.page.create({
        data: {
          id: page.id,
          slug: page.slug,
          title: page.title,
          body: page.body,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          published: page.published,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        },
      })
    }

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
        .get('/api/admin/pages')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .patch(`/api/admin/pages/${returnsId}`)
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ title: 'مش مسموح', body: '<p>x</p>', seoTitle: null, seoDescription: null, published: true })
        .expect(403)

      const page = await adminPage(returnsId)
      await request(app.getHttpServer())
        .patch(`/api/admin/pages/${returnsId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send(patchBody(page, { title: 'بدون توكن' }))
        .expect(403)
    })
  })

  // ==========================================================================
  // Scenario 2: Sanitizing the rich text body
  // ==========================================================================
  describe('Scenario 2: Sanitizing the rich text body', () => {
    const dirtyBody =
      '<p onclick="x()" style="color:red">مرحبا <script>alert(1)</script><strong>مهم</strong></p><ul><li>بند</li></ul><a href="https://example.com">x</a><a href="javascript:alert(1)">y</a><img src="/uploads/content/a.png">'
    const newSeoTitle = `عنوان SEO جديد ${runId}`

    it('strips unsafe markup and exposes the sanitized page publicly', async () => {
      const page = await adminPage(returnsId)
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/admin/pages/${returnsId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(patchBody(page, { body: dirtyBody, seoTitle: newSeoTitle }))
        .expect(200)

      const updated: AdminPage = patchRes.body
      expect(updated.body).not.toContain('onclick')
      expect(updated.body).not.toContain('style')
      expect(updated.body).not.toContain('<script')
      expect(updated.body).not.toContain('javascript:')
      expect(updated.body).not.toContain('<img')
      expect(updated.body).toContain('<strong>مهم</strong>')
      expect(updated.body).toContain('<ul>')
      expect(updated.body).toContain('<li>بند</li>')

      const anchorMatch = updated.body.match(/<a [^>]*example\.com[^>]*>/)
      expect(anchorMatch, 'the external link should survive').not.toBeNull()
      const anchor = anchorMatch?.[0] ?? ''
      expect(anchor).toContain('target="_blank"')
      expect(anchor).toContain('rel="noopener noreferrer"')

      const publicRes = await request(app.getHttpServer())
        .get('/api/pages/returns')
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const publicPage: PublicPage = publicRes.body
      expect(publicPage.body).toBe(updated.body)
      expect(publicPage.seoTitle).toBe(newSeoTitle)
    })
  })

  // ==========================================================================
  // Scenario 3: Validation
  // ==========================================================================
  describe('Scenario 3: Validation', () => {
    it('rejects an empty title', async () => {
      const page = await adminPage(returnsId)
      await request(app.getHttpServer())
        .patch(`/api/admin/pages/${returnsId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(patchBody(page, { title: '' }))
        .expect(400)
    })
  })

  // ==========================================================================
  // Scenario 4: Unpublish and republish
  // ==========================================================================
  describe('Scenario 4: Unpublish and republish', () => {
    it('hides an unpublished page from the public endpoints', async () => {
      const faq = await adminPage(faqId)
      await request(app.getHttpServer())
        .patch(`/api/admin/pages/${faqId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(patchBody(faq, { published: false }))
        .expect(200)

      const notFoundRes = await request(app.getHttpServer())
        .get('/api/pages/faq')
        .set('X-Forwarded-For', nextIp())
        .expect(404)
      expect(notFoundRes.body.message).toContain('الصفحة دي مش موجودة')

      const hiddenSlugs = (await publicList()).map((item) => item.slug)
      expect(hiddenSlugs).not.toContain('faq')

      await request(app.getHttpServer())
        .patch(`/api/admin/pages/${faqId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(patchBody(faq, { published: true }))
        .expect(200)

      const visibleRes = await request(app.getHttpServer())
        .get('/api/pages/faq')
        .set('X-Forwarded-For', nextIp())
        .expect(200)
      const faqPage: PublicPage = visibleRes.body
      expect(faqPage.slug).toBe('faq')

      const visibleSlugs = (await publicList()).map((item) => item.slug)
      expect(visibleSlugs).toContain('faq')
    })
  })

  // ==========================================================================
  // Scenario 5: Public list ordering
  // ==========================================================================
  describe('Scenario 5: Public list ordering', () => {
    it('starts with about and never lists unpublished pages', async () => {
      const about = await adminPage(aboutId)
      await request(app.getHttpServer())
        .patch(`/api/admin/pages/${aboutId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(patchBody(about, { published: true }))
        .expect(200)

      const faq = await adminPage(faqId)
      await request(app.getHttpServer())
        .patch(`/api/admin/pages/${faqId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(patchBody(faq, { published: false }))
        .expect(200)

      const items = await publicList()
      expect(items[0]?.slug).toBe('about')
      expect(items.map((item) => item.slug)).not.toContain('faq')

      await request(app.getHttpServer())
        .patch(`/api/admin/pages/${faqId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(patchBody(faq, { published: true }))
        .expect(200)
    })
  })
})
