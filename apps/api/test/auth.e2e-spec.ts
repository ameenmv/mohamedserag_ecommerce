import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ALL_PERMISSIONS, OWNER_ROLE_KEY } from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('Admin Auth E2E (/api/admin/auth)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let userId = ''
  let roleId = ''
  const testEmail = `admin-${nanoid(8).toLowerCase()}@serag.test`
  const testPassword = nanoid(20)
  const wrongPassword = nanoid(20)

  let sessionCookie = ''
  let csrfToken = ''

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    const permissionIds: string[] = []
    for (const key of ALL_PERMISSIONS) {
      const perm = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      })
      permissionIds.push(perm.id)
    }

    const role = await prisma.role.upsert({
      where: { key: OWNER_ROLE_KEY },
      update: { name: 'مدير' },
      create: { key: OWNER_ROLE_KEY, name: 'مدير' },
    })
    roleId = role.id

    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      })
    }

    const passwordHash = await argon2.hash(testPassword)
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'أحمد سراج',
        passwordHash,
        active: true,
        roles: {
          create: [{ roleId: role.id }],
        },
      },
    })
    userId = user.id
  })

  afterAll(async () => {
    if (prisma && userId) {
      await prisma.auditLog.deleteMany({ where: { userId } })
      await prisma.session.deleteMany({ where: { userId } })
      await prisma.userRole.deleteMany({ where: { userId } })
      await prisma.user.deleteMany({ where: { id: userId } })
    }
    if (prisma && roleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId } })
    }
    if (app) {
      await app.close()
    }
  })

  it('rejects wrong password with 401 and generic Arabic message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: testEmail, password: wrongPassword })
      .expect(401)

    expect(res.body).toMatchObject({
      message: 'البريد أو كلمة المرور غير صحيحة',
    })
  })

  it('rejects unknown email with the same 401 generic message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: `unknown-${nanoid(6)}@serag.test`, password: wrongPassword })
      .expect(401)

    expect(res.body).toMatchObject({
      message: 'البريد أو كلمة المرور غير صحيحة',
    })
  })

  it('logs in with valid credentials, sets httpOnly serag_sid cookie, and returns user, permissions, and csrfToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: `  ${testEmail.toUpperCase()}  `, password: testPassword })
      .expect(200)

    const setCookieHeader = res.headers['set-cookie']
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : []
    const seragCookie = cookies.find((c) => c.startsWith('serag_sid='))
    expect(seragCookie).toBeDefined()
    expect(seragCookie).toContain('HttpOnly')
    expect(seragCookie).toContain('SameSite=Lax')

    sessionCookie = seragCookie?.split(';')[0] ?? ''
    expect(sessionCookie).toMatch(/^serag_sid=.+/)

    expect(res.body.user).toEqual({
      id: userId,
      name: 'أحمد سراج',
      email: testEmail,
    })
    expect(typeof res.body.csrfToken).toBe('string')
    expect(res.body.csrfToken.length).toBe(32)
    expect(res.body.permissions).toEqual(expect.arrayContaining([...ALL_PERMISSIONS]))
    csrfToken = res.body.csrfToken

    const loginAudit = await prisma.auditLog.findFirst({
      where: { userId, action: 'auth.login' },
    })
    expect(loginAudit).not.toBeNull()
  })

  it('returns 401 on GET /api/admin/auth/me without a session cookie', async () => {
    await request(app.getHttpServer()).get('/api/admin/auth/me').expect(401)
  })

  it('returns 200 on GET /api/admin/auth/me with a valid session cookie', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/auth/me')
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(res.body).toEqual({
      user: {
        id: userId,
        name: 'أحمد سراج',
        email: testEmail,
      },
      permissions: expect.arrayContaining([...ALL_PERMISSIONS]),
      csrfToken,
    })
  })

  it('rejects POST /api/admin/auth/logout without x-csrf-token with 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/auth/logout')
      .set('Cookie', sessionCookie)
      .expect(403)

    expect(res.body).toMatchObject({
      message: 'انتهت الجلسة، حدّث الصفحة',
    })
  })

  it('logs out with 204 when x-csrf-token is valid, and subsequent GET /api/admin/auth/me returns 401', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/auth/logout')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .expect(204)

    const logoutAudit = await prisma.auditLog.findFirst({
      where: { userId, action: 'auth.logout' },
    })
    expect(logoutAudit).not.toBeNull()

    await request(app.getHttpServer())
      .get('/api/admin/auth/me')
      .set('Cookie', sessionCookie)
      .expect(401)
  })
})
