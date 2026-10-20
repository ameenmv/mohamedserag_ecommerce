import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  DEFAULT_TEMPLATES,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  SETTINGS_SECTIONS,
  type AdminSettingsResponse,
  type SettingsSection,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { Prisma } from '../src/generated/prisma/client.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

interface SettingsSectionState {
  value: unknown
  version: string | null
  warnings: string[]
}

interface StoredSetting {
  key: string
  value: Prisma.JsonValue
  createdAt: Date
  updatedAt: Date
}

const toInputJson = (value: Prisma.JsonValue): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue

describe('Admin Settings API E2E (/api/admin/settings)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const ownerEmail = `admin-settings-owner-${runId}@serag.test`
  const restrictedEmail = `admin-settings-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  const restrictedRoleKey = `restricted-settings-${runId}`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let ownerCsrfToken = ''

  let restrictedUserId = ''
  let restrictedSessionCookie = ''
  let restrictedCsrfToken = ''

  let categoryId = ''
  let brandId = ''

  const originalSettings: StoredSetting[] = []
  const createdProductIds: string[] = []

  let ipCounter = 1
  const nextIp = () => `10.11.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

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
      data: { key: restrictedRoleKey, name: 'موظف بدون صلاحية الإعدادات' },
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
        name: `مدير الإعدادات ${runId}`,
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

    const ownerLogin = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({ email: ownerEmail, password: testPassword })
      .expect(200)
    ownerSessionCookie = extractSessionCookie(ownerLogin.headers['set-cookie'])
    ownerCsrfToken = ownerLogin.body.csrfToken

    const restrictedLogin = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({ email: restrictedEmail, password: testPassword })
      .expect(200)
    restrictedSessionCookie = extractSessionCookie(restrictedLogin.headers['set-cookie'])
    restrictedCsrfToken = restrictedLogin.body.csrfToken

    const cat = await prisma.category.findFirst({ orderBy: { sort: 'asc' } })
    if (!cat) throw new Error('No category found')
    categoryId = cat.id

    const br = await prisma.brand.findFirst({ orderBy: { sort: 'asc' } })
    if (!br) throw new Error('No brand found')
    brandId = br.id

    // Only the sections this suite edits are captured and restored; other keys (bridal…) stay untouched
    const settings = await prisma.setting.findMany({ where: { key: { in: [...SETTINGS_SECTIONS] } } })
    for (const row of settings) {
      originalSettings.push({
        key: row.key,
        value: row.value,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
    }
  })

  afterAll(async () => {
    await prisma.setting.deleteMany({ where: { key: { in: [...SETTINGS_SECTIONS] } } })
    for (const row of originalSettings) {
      await prisma.setting.create({
        data: {
          key: row.key,
          value: toInputJson(row.value),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      })
    }

    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
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

  function extractSessionCookie(setCookie: string | string[] | undefined): string {
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    const sid = cookies.find((c) => c.startsWith('serag_sid='))
    return sid?.split(';')[0] ?? ''
  }

  async function getSection(section: SettingsSection): Promise<SettingsSectionState> {
    const res = await request(app.getHttpServer())
      .get('/api/admin/settings')
      .set('Cookie', ownerSessionCookie)
      .set('X-Forwarded-For', nextIp())
      .expect(200)
    const body: AdminSettingsResponse = res.body
    const state = body.sections[section]
    if (!state) throw new Error(`Missing section ${section}`)
    return state
  }

  function putSection(
    section: string,
    value: unknown,
    version: string | null,
  ) {
    return request(app.getHttpServer())
      .put(`/api/admin/settings/${section}`)
      .set('Cookie', ownerSessionCookie)
      .set('x-csrf-token', ownerCsrfToken)
      .set('X-Forwarded-For', nextIp())
      .send({ value, version })
  }

  // ==========================================================================
  // Scenario 1: GET returns every section
  // ==========================================================================
  describe('Scenario 1: GET returns all sections', () => {
    it('returns the 7 settings sections with value, version and warnings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/settings')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body: AdminSettingsResponse = res.body
      expect(Object.keys(body.sections).sort()).toEqual([...SETTINGS_SECTIONS].sort())
      for (const section of SETTINGS_SECTIONS) {
        const state = body.sections[section]
        expect(state).toHaveProperty('value')
        expect(state).toHaveProperty('version')
        expect(Array.isArray(state.warnings)).toBe(true)
      }
      expect(body.sections.payments.value).toBeDefined()
      expect(body.sections.store.value).toBeDefined()
    })
  })

  // ==========================================================================
  // Scenario 2: Validation per section
  // ==========================================================================
  describe('Scenario 2: Validation per section', () => {
    it('rejects a bad store phone with a field error', async () => {
      const store = await getSection('store')
      const value = { ...(store.value as Record<string, unknown>), phone: '12345' }
      const res = await putSection('store', value, store.version).expect(400)
      expect(res.body.errors.phone).toBeDefined()
    })

    it('rejects payments with no enabled method', async () => {
      const payments = await getSection('payments')
      const value = {
        methods: {
          cod: { enabled: false, name: 'الدفع عند الاستلام' },
          instapay: { enabled: false, name: 'إنستا باي' },
          vodafone_cash: { enabled: false, name: 'فودافون كاش' },
          fawry: { enabled: false, name: 'فوري' },
        },
      }
      const res = await putSection('payments', value, payments.version).expect(400)
      expect(res.body.errors.methods).toBeDefined()
    })

    it('rejects a governorate placed in two zones', async () => {
      const zones = await getSection('zones')
      const value = [
        { id: 'z1', name: 'الأولى', fee: 5000, places: [{ governorate: 'الدقهلية' }] },
        { id: 'z2', name: 'التانية', fee: 6000, places: [{ governorate: 'الدقهلية' }] },
      ]
      const res = await putSection('zones', value, zones.version).expect(400)
      expect(res.body.errors['1.places']).toBeDefined()
    })

    it('rejects a zero deposit percentage', async () => {
      const cod = await getSection('codDeposit')
      const res = await putSection('codDeposit', { threshold: 300000, pct: 0 }, cod.version).expect(400)
      expect(res.body.errors.pct).toBeDefined()
    })

    it('rejects a low-stock threshold of 1000', async () => {
      const lowStock = await getSection('lowStock')
      const res = await putSection('lowStock', { defaultThreshold: 1000 }, lowStock.version).expect(400)
      expect(res.body.errors.defaultThreshold).toBeDefined()
    })

    it('rejects a single-word synonym group', async () => {
      const synonyms = await getSection('searchSynonyms')
      const res = await putSection('searchSynonyms', [['تلاجة']], synonyms.version).expect(400)
      expect(res.body.errors['0']).toBeDefined()
    })

    it('rejects a template with an unknown variable', async () => {
      const templates = await getSection('templates')
      const value = { ...DEFAULT_TEMPLATES, order_confirmed: 'أهلاً {{customerName}} {{bogus}}' }
      const res = await putSection('templates', value, templates.version).expect(400)
      expect(res.body.errors.order_confirmed).toBeDefined()
    })
  })

  // ==========================================================================
  // Scenario 3: Valid saves and public readers
  // ==========================================================================
  describe('Scenario 3: Valid saves reflect in public readers', () => {
    it('saves payments with a disabled method and reflects it in checkout', async () => {
      const payments = await getSection('payments')
      const value = {
        methods: {
          cod: { enabled: false, name: 'الدفع عند الاستلام', hint: 'ادفع نقداً' },
          instapay: { enabled: true, name: 'إنستا باي', account: 'serag@instapay' },
          vodafone_cash: { enabled: false, name: 'فودافون كاش' },
          fawry: { enabled: false, name: 'فوري' },
        },
      }
      const res = await putSection('payments', value, payments.version).expect(200)
      expect(typeof res.body.version).toBe('string')
      expect(res.body.version).not.toBe(payments.version)

      const checkout = await request(app.getHttpServer())
        .get('/api/settings/checkout')
        .set('X-Forwarded-For', nextIp())
        .expect(200)
      const methods = checkout.body.paymentMethods.map((m: { method: string }) => m.method)
      expect(methods).toContain('instapay')
      expect(methods).not.toContain('cod')
    })

    it('saves zones with a changed fee and reflects it in the cart quote', async () => {
      const zones = await getSection('zones')
      const value = [
        {
          id: 'mansoura',
          name: 'المنصورة',
          fee: 12345,
          places: [
            { governorate: 'الدقهلية', city: 'المنصورة' },
          ],
        },
        { id: 'egypt', name: 'باقي مصر', fee: 40000, places: [{ governorate: 'القاهرة' }] },
      ]
      const res = await putSection('zones', value, zones.version).expect(200)
      expect(typeof res.body.version).toBe('string')

      const product = await prisma.product.findFirst({
        where: { visible: true, archivedAt: null },
        select: { id: true, price: true },
      })
      if (!product) throw new Error('No product available for quote')

      const quote = await request(app.getHttpServer())
        .post('/api/cart/quote')
        .set('X-Forwarded-For', nextIp())
        .send({
          items: [{ productId: product.id, qty: 1 }],
          governorate: 'الدقهلية',
          city: 'المنصورة',
        })
        .expect(200)
      expect(quote.body.zone.fee).toBe(12345)
      expect(quote.body.deliveryFee).toBe(12345)
    })

    it('saves store info and reflects the new phone publicly', async () => {
      const store = await getSection('store')
      const value = {
        name: 'معرض سراج التجريبي',
        phone: '01012345678',
        whatsapp: '01098765432',
        tradersWhatsapp: '',
        address: 'المنصورة، شارع الجمهورية',
        hours: 'من 10 ص لـ 10 م',
      }
      await putSection('store', value, store.version).expect(200)

      const publicStore = await request(app.getHttpServer())
        .get('/api/settings/store')
        .set('X-Forwarded-For', nextIp())
        .expect(200)
      expect(publicStore.body.phone).toBe('01012345678')
      expect(publicStore.body.name).toBe('معرض سراج التجريبي')
    })

    it('writes an audit row with the phone masked', async () => {
      const row = await prisma.auditLog.findFirst({
        where: { userId: ownerUserId, entity: 'settings' },
        orderBy: { at: 'desc' },
      })
      if (!row) throw new Error('expected an audit row for settings')
      const after = row.after as { value?: { phone?: string } }
      expect(after.value?.phone).toBe('010******78')
    })
  })

  // ==========================================================================
  // Scenario 4: Concurrency
  // ==========================================================================
  describe('Scenario 4: Concurrency', () => {
    it('returns 409 with the latest value when the version is stale', async () => {
      const lowStock = await getSection('lowStock')
      await putSection('lowStock', { defaultThreshold: 5 }, lowStock.version).expect(200)

      const res = await putSection('lowStock', { defaultThreshold: 7 }, lowStock.version).expect(409)
      expect(res.body.message).toBe('الإعدادات اتغيرت من مكان تاني')
      expect(res.body.latest).toBeDefined()
      expect(res.body.latest.value).toEqual({ defaultThreshold: 5 })
      expect(typeof res.body.latest.version).toBe('string')
    })
  })

  // ==========================================================================
  // Scenario 5: RBAC and CSRF
  // ==========================================================================
  describe('Scenario 5: RBAC and CSRF', () => {
    it('returns 403 for an admin without settings.manage', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/settings')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .put('/api/admin/settings/lowStock')
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ value: { defaultThreshold: 4 }, version: null })
        .expect(403)
    })

    it('refuses a save without a CSRF token', async () => {
      const lowStock = await getSection('lowStock')
      await request(app.getHttpServer())
        .put('/api/admin/settings/lowStock')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send({ value: { defaultThreshold: 4 }, version: lowStock.version })
        .expect(403)
    })
  })

  // ==========================================================================
  // Scenario 6: Template preview
  // ==========================================================================
  describe('Scenario 6: Template preview', () => {
    it('renders the template and reports unknown variables', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/settings/templates/preview')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'order_confirmed', template: 'أهلاً {{customerName}}، {{bogus}}' })
        .expect(200)

      expect(res.body.text).toContain('أحمد محمد')
      expect(res.body.text).toContain('{{bogus}}')
      expect(res.body.unknownVariables).toEqual(['bogus'])
    })
  })

  // ==========================================================================
  // Scenario 7: Low-stock default applies to new products
  // ==========================================================================
  describe('Scenario 7: Low-stock default', () => {
    it('applies the saved low-stock default when a product omits a threshold', async () => {
      const lowStock = await getSection('lowStock')
      await putSection('lowStock', { defaultThreshold: 9 }, lowStock.version).expect(200)

      const created = await request(app.getHttpServer())
        .post('/api/admin/products')
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send({
          name: `منتج إعدادات ${runId}`,
          modelCode: `SET-${runId}-1`,
          brandId,
          categoryId,
          price: 100000,
          stock: 5,
          visible: true,
        })
        .expect(201)

      createdProductIds.push(created.body.id)
      expect(created.body.lowStockThreshold).toBe(9)
    })
  })
})
