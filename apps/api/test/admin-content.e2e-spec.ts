import * as fs from 'node:fs'
import * as path from 'node:path'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  HOME_SECTION_IDS,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type AdminHomeState,
  type HomeContent,
  type HomeLayout,
  type HomeVersionRow,
  type PublicHome,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { Prisma } from '../src/generated/prisma/client.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import { resolveUploadsDir } from '../src/admin-catalog/admin-catalog.util.js'
import { parseStoredHome } from '../src/content/home-content.js'

interface StoredVersion {
  id: string
  page: string
  status: 'draft' | 'published'
  data: Prisma.JsonValue
  layout: Prisma.JsonValue
  label: string | null
  publishedAt: Date | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
}

const tinyPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const toInputJson = (value: Prisma.JsonValue): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue

const cloneDraft = (state: AdminHomeState): { sections: HomeContent; layout: HomeLayout } => ({
  sections: structuredClone(state.draft.sections),
  layout: structuredClone(state.draft.layout),
})

describe('Admin Content API E2E (/api/admin/content + /api/content/home)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `admin-content-owner-${runId}@serag.test`
  const restrictedEmail = `admin-content-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  const restrictedRoleKey = `restricted-content-${runId}`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let ownerCsrfToken = ''

  let restrictedUserId = ''
  let restrictedSessionCookie = ''
  let restrictedCsrfToken = ''

  const originalHomeVersions: StoredVersion[] = []
  const uploadedFilesToCleanup: string[] = []

  let changedTitle = ''

  let ipCounter = 1
  const nextIp = () => `10.9.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

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

    const allowedPerms = perms.filter(
      (p) => p.key === PERMISSIONS.orders.read || p.key === PERMISSIONS.orders.update,
    )
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

    const rows = await prisma.contentVersion.findMany({
      where: { page: 'home' },
      orderBy: [{ createdAt: 'asc' }],
    })
    for (const row of rows) {
      originalHomeVersions.push({
        id: row.id,
        page: row.page,
        status: row.status,
        data: row.data,
        layout: row.layout,
        label: row.label,
        publishedAt: row.publishedAt,
        userId: row.userId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
    }
  })

  afterAll(async () => {
    for (const file of uploadedFilesToCleanup) {
      await fs.promises.unlink(file).catch(() => undefined)
    }

    await prisma.contentVersion.deleteMany({ where: { page: 'home' } })
    for (const row of originalHomeVersions) {
      let userId = row.userId
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
        if (!user) userId = null
      }
      await prisma.contentVersion.create({
        data: {
          id: row.id,
          page: row.page,
          status: row.status,
          data: toInputJson(row.data),
          layout: toInputJson(row.layout),
          label: row.label,
          publishedAt: row.publishedAt,
          userId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      })
    }

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
  // Scenario 1: RBAC and CSRF protection
  // ==========================================================================
  describe('Scenario 1: RBAC and CSRF protection', () => {
    it('returns 403 for a restricted admin on every content endpoint', async () => {
      const ownerState = await request(app.getHttpServer())
        .get('/api/admin/content/home')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const validBody = {
        sections: ownerState.body.draft.sections,
        layout: ownerState.body.draft.layout,
      }

      await request(app.getHttpServer())
        .get('/api/admin/content/home')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .put('/api/admin/content/home/draft')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(validBody)
        .expect(403)

      await request(app.getHttpServer())
        .post('/api/admin/content/home/publish')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({})
        .expect(403)

      await request(app.getHttpServer())
        .get('/api/admin/content/home/versions')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .post('/api/admin/content/images')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .attach('file', tinyPngBuffer, 'pixel.png')
        .expect(403)
    })

    it('refuses a content mutation without a CSRF token', async () => {
      const ownerState = await request(app.getHttpServer())
        .get('/api/admin/content/home')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      await request(app.getHttpServer())
        .put('/api/admin/content/home/draft')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send({ sections: ownerState.body.draft.sections, layout: ownerState.body.draft.layout })
        .expect(403)
    })
  })

  // ==========================================================================
  // Scenario 2: Public home content
  // ==========================================================================
  describe('Scenario 2: Public home content', () => {
    it('returns all sections and links without leaking admin fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/content/home')
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body: PublicHome = res.body
      expect(body.sections.hero.title.length).toBeGreaterThan(0)
      expect(body.layout.order.length).toBe(HOME_SECTION_IDS.length)
      expect(new Set(body.layout.order).size).toBe(HOME_SECTION_IDS.length)
      for (const id of HOME_SECTION_IDS) {
        expect(body.layout.order).toContain(id)
      }
      expect(body.publishedAt === null || typeof body.publishedAt === 'string').toBe(true)
      expect(body).not.toHaveProperty('label')
      expect(body).not.toHaveProperty('userId')
      expect(body).not.toHaveProperty('draft')
      expect(body.sections).not.toHaveProperty('label')
    })
  })

  // ==========================================================================
  // Scenario 3: Draft saving and validation
  // ==========================================================================
  describe('Scenario 3: Draft saving and validation', () => {
    it('saves a single change and keeps the public home unchanged', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/content/home/discard')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const publicBefore = await request(app.getHttpServer())
        .get('/api/content/home')
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const stateRes = await request(app.getHttpServer())
        .get('/api/admin/content/home')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const state: AdminHomeState = stateRes.body
      expect(state.changes).toBe(0)

      const body = cloneDraft(state)
      changedTitle = `عنوان الهيرو الجديد ${runId}`
      body.sections.hero.title = changedTitle

      const putRes = await request(app.getHttpServer())
        .put('/api/admin/content/home/draft')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(body)
        .expect(200)

      expect(putRes.body.changes).toBe(1)

      const publicAfter = await request(app.getHttpServer())
        .get('/api/content/home')
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(publicAfter.body.sections.hero.title).toBe(publicBefore.body.sections.hero.title)
    })

    it('rejects an incomplete layout, empty hero title, and unsafe link', async () => {
      const stateRes = await request(app.getHttpServer())
        .get('/api/admin/content/home')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const state: AdminHomeState = stateRes.body

      const badLayout = cloneDraft(state)
      badLayout.layout.order = badLayout.layout.order.slice(0, -1)
      await request(app.getHttpServer())
        .put('/api/admin/content/home/draft')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(badLayout)
        .expect(400)

      const emptyTitle = cloneDraft(state)
      emptyTitle.sections.hero.title = ''
      await request(app.getHttpServer())
        .put('/api/admin/content/home/draft')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(emptyTitle)
        .expect(400)

      const unsafeLink = cloneDraft(state)
      unsafeLink.sections.hero.cta.href = 'javascript:alert(1)'
      await request(app.getHttpServer())
        .put('/api/admin/content/home/draft')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(unsafeLink)
        .expect(400)
    })
  })

  // ==========================================================================
  // Scenario 4: Publish flow
  // ==========================================================================
  describe('Scenario 4: Publish flow', () => {
    it('publishes the draft, exposes it publicly, and lists the version first', async () => {
      const publishLabel = `نشر ${runId}`
      const res = await request(app.getHttpServer())
        .post('/api/admin/content/home/publish')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ label: publishLabel })
        .expect(200)

      const state: AdminHomeState = res.body
      expect(state.changes).toBe(0)
      expect(state.published.label).toBe(publishLabel)
      expect(state.draft.updatedAt).toBeNull()

      const publicRes = await request(app.getHttpServer())
        .get('/api/content/home')
        .set('X-Forwarded-For', nextIp())
        .expect(200)
      expect(publicRes.body.sections.hero.title).toBe(changedTitle)

      const versionsRes = await request(app.getHttpServer())
        .get('/api/admin/content/home/versions')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const items: HomeVersionRow[] = versionsRes.body.items
      expect(items[0]?.label).toBe(publishLabel)
      expect(items[0]?.current).toBe(true)
    })

    it('refuses publishing when there are no changes', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/content/home/publish')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({})
        .expect(409)

      expect(res.body.message).toContain('مفيش تعديلات للنشر')
    })
  })

  // ==========================================================================
  // Scenario 5: Hiding a section
  // ==========================================================================
  describe('Scenario 5: Hiding a section', () => {
    it('reflects a hidden section in the published layout', async () => {
      const stateRes = await request(app.getHttpServer())
        .get('/api/admin/content/home')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const state: AdminHomeState = stateRes.body
      const body = cloneDraft(state)
      body.layout.hidden = [...body.layout.hidden.filter((id) => id !== 'tradersTeaser'), 'tradersTeaser']

      const putRes = await request(app.getHttpServer())
        .put('/api/admin/content/home/draft')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(body)
        .expect(200)
      expect(putRes.body.changes).toBe(1)

      await request(app.getHttpServer())
        .post('/api/admin/content/home/publish')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ label: `إخفاء ${runId}` })
        .expect(200)

      const publicRes = await request(app.getHttpServer())
        .get('/api/content/home')
        .set('X-Forwarded-For', nextIp())
        .expect(200)
      expect(publicRes.body.layout.hidden).toContain('tradersTeaser')
    })
  })

  // ==========================================================================
  // Scenario 6: Discard draft
  // ==========================================================================
  describe('Scenario 6: Discard draft', () => {
    it('discards a draft so it matches the published content again', async () => {
      const stateRes = await request(app.getHttpServer())
        .get('/api/admin/content/home')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body = cloneDraft(stateRes.body)
      body.sections.hero.title = `تعديل مؤقت ${runId}`
      await request(app.getHttpServer())
        .put('/api/admin/content/home/draft')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(body)
        .expect(200)

      const res = await request(app.getHttpServer())
        .post('/api/admin/content/home/discard')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(res.body.changes).toBe(0)
      expect(res.body.draft.updatedAt).toBeNull()
      expect(res.body.draft.sections).toEqual(res.body.published.sections)
      expect(res.body.draft.layout).toEqual(res.body.published.layout)
    })
  })

  // ==========================================================================
  // Scenario 7: Restore a previous version
  // ==========================================================================
  describe('Scenario 7: Restore a previous version', () => {
    it('copies a previous version into the draft without touching the public home', async () => {
      const versionsRes = await request(app.getHttpServer())
        .get('/api/admin/content/home/versions')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const items: HomeVersionRow[] = versionsRes.body.items
      expect(items.length).toBeGreaterThanOrEqual(2)
      const target = items[1]
      if (!target) throw new Error('expected a previous version to restore')

      const targetRow = await prisma.contentVersion.findUnique({ where: { id: target.id } })
      if (!targetRow) throw new Error('expected the restored version row to exist')
      const parsedTarget = parseStoredHome(targetRow.data, targetRow.layout)

      const publicBefore = await request(app.getHttpServer())
        .get('/api/content/home')
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const res = await request(app.getHttpServer())
        .post(`/api/admin/content/home/versions/${target.id}/restore`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const state: AdminHomeState = res.body
      expect(state.draft.sections).toEqual(parsedTarget.sections)
      expect(state.draft.layout).toEqual(parsedTarget.layout)
      expect(state.draft.sections.hero.title).toBe(changedTitle)

      const publicAfter = await request(app.getHttpServer())
        .get('/api/content/home')
        .set('X-Forwarded-For', nextIp())
        .expect(200)
      expect(publicAfter.body).toEqual(publicBefore.body)
    })
  })

  // ==========================================================================
  // Scenario 8: History pruning
  // ==========================================================================
  describe('Scenario 8: History pruning', () => {
    it('keeps only the newest 20 published versions', async () => {
      const stateRes = await request(app.getHttpServer())
        .get('/api/admin/content/home')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      let state: AdminHomeState = stateRes.body

      for (let i = 0; i < 21; i += 1) {
        const body = cloneDraft(state)
        body.sections.announce.text = `إعلان ${runId} رقم ${i}`

        const putRes = await request(app.getHttpServer())
          .put('/api/admin/content/home/draft')
          .set('Cookie', ownerSessionCookie)
          .set('x-csrf-token', ownerCsrfToken)
          .set('X-Forwarded-For', nextIp())
          .send(body)
          .expect(200)

        state = putRes.body

        const pubRes = await request(app.getHttpServer())
          .post('/api/admin/content/home/publish')
          .set('Cookie', ownerSessionCookie)
          .set('x-csrf-token', ownerCsrfToken)
          .set('X-Forwarded-For', nextIp())
          .send({ label: `إصدار ${i} - ${runId}` })
          .expect(200)

        state = pubRes.body
      }

      const versionsRes = await request(app.getHttpServer())
        .get('/api/admin/content/home/versions')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      expect(versionsRes.body.items.length).toBe(20)
    }, 30_000)
  })

  // ==========================================================================
  // Scenario 9: Content image upload
  // ==========================================================================
  describe('Scenario 9: Content image upload', () => {
    it('stores a valid PNG under /uploads/content and rejects a non-image', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/content/images')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .attach('file', tinyPngBuffer, 'pixel.png')
        .expect(201)

      const url: string = res.body.url
      expect(url).toMatch(/^\/uploads\/content\/\d{4}-\d{2}\/.+\.png$/)

      const filePath = path.join(resolveUploadsDir(), url.replace(/^\/?uploads\//, ''))
      uploadedFilesToCleanup.push(filePath)
      expect(fs.existsSync(filePath)).toBe(true)

      await request(app.getHttpServer())
        .post('/api/admin/content/images')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .attach('file', Buffer.from('this is not a valid png image'), 'notes.png')
        .expect(400)
    })
  })
})
