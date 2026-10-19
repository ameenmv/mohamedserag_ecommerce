import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import {
  ALL_PERMISSIONS,
  OWNER_ROLE_KEY,
  PERMISSIONS,
  type AdminQuizRow,
  type AdminQuizState,
  type PublicQuiz,
  type QuizDefinitionOutput,
  type QuizResultsResponse,
} from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { nanoid } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

function buildQuiz(): QuizDefinitionOutput {
  return {
    questions: [
      {
        id: 'family',
        text: 'الفيرزا بتاعتك إيه؟',
        answers: [
          { id: 'fam-small', text: 'شقة صغيرة' },
          { id: 'fam-large', text: 'أسرة كبيرة' },
        ],
      },
      {
        id: 'power',
        text: 'مهم توفر كهرباء؟',
        answers: [
          { id: 'pow-saves', text: 'آه، يفرق معايا' },
          { id: 'pow-no', text: 'مش فارقة' },
        ],
      },
      {
        id: 'space',
        text: 'المكان إزاي؟',
        answers: [
          { id: 'space-wide', text: 'ركن واسع' },
          { id: 'space-narrow', text: 'مطبخ ضيق' },
        ],
      },
    ],
    rules: [
      { answerId: 'fam-large', field: 'capacity_l', op: 'gte', value: 450, points: 3, reason: 'سعة كبيرة للأسرة' },
      { answerId: 'fam-small', field: 'capacity_l', op: 'lte', value: 300, points: 2, reason: 'سعة صغيرة للشقة' },
      { answerId: 'pow-saves', field: 'inverter', op: 'isTrue', value: true, points: 1, reason: 'انفرتر موفر للكهرباء' },
    ],
  }
}

const BIG_REASON = 'سعة كبيرة للأسرة'
const NO_QUIZ_MESSAGE = 'مفيش اختبار للقسم ده'
const MISSING_CATEGORY_MESSAGE = 'القسم ده مش موجود'
const INVALID_RULES_MESSAGE = 'في قواعد مش مظبوطة'

describe('Quiz API E2E (/api/quiz + /api/admin/quiz)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid(8).toLowerCase()
  const categorySlug = `quiz-cat-${runId}`
  const ownerEmail = `quiz-owner-${runId}@serag.test`
  const restrictedEmail = `quiz-restricted-${runId}@serag.test`
  const testPassword = `pass-${runId}-secret`
  const restrictedRoleKey = `restricted-quiz-${runId}`

  let ownerUserId = ''
  let ownerSessionCookie = ''
  let ownerCsrfToken = ''
  let restrictedUserId = ''
  let restrictedSessionCookie = ''
  let restrictedCsrfToken = ''

  let specTemplateId = ''
  let categoryId = ''
  let brandId = ''
  let bigId = ''
  let midId = ''
  let smallId = ''
  let outId = ''
  const orderIds: string[] = []

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

    for (const key of ALL_PERMISSIONS) {
      await prisma.permission.upsert({ where: { key }, update: {}, create: { key, label: key } })
    }

    const ownerRole = await prisma.role.upsert({
      where: { key: OWNER_ROLE_KEY },
      update: { name: 'مدير كامل' },
      create: { key: OWNER_ROLE_KEY, name: 'مدير كامل' },
    })

    const perms = await prisma.permission.findMany()
    for (const permission of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: permission.id },
      })
    }

    const restrictedRole = await prisma.role.create({
      data: { key: restrictedRoleKey, name: 'موظف بدون صلاحية المحتوى' },
    })
    const allowedPerms = perms.filter(
      (permission) =>
        permission.key === PERMISSIONS.orders.read || permission.key === PERMISSIONS.orders.update,
    )
    for (const permission of allowedPerms) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: permission.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: `مدير الاختبار ${runId}`,
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

    const loginOwner = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({ email: ownerEmail, password: testPassword })
      .expect(200)
    const ownerSetCookie = loginOwner.headers['set-cookie']
    const ownerCookies = Array.isArray(ownerSetCookie)
      ? ownerSetCookie
      : ownerSetCookie
        ? [ownerSetCookie]
        : []
    ownerSessionCookie = ownerCookies.find((c: string) => c.startsWith('serag_sid='))?.split(';')[0] ?? ''
    ownerCsrfToken = loginOwner.body.csrfToken

    const loginRestricted = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({ email: restrictedEmail, password: testPassword })
      .expect(200)
    const restrictedSetCookie = loginRestricted.headers['set-cookie']
    const restrictedCookies = Array.isArray(restrictedSetCookie)
      ? restrictedSetCookie
      : restrictedSetCookie
        ? [restrictedSetCookie]
        : []
    restrictedSessionCookie =
      restrictedCookies.find((c: string) => c.startsWith('serag_sid='))?.split(';')[0] ?? ''
    restrictedCsrfToken = loginRestricted.body.csrfToken

    const template = await prisma.specTemplate.create({
      data: {
        name: `قالب اختبار الاختيار ${runId}`,
        fields: [
          { key: 'capacity_l', label: 'السعة', type: 'number', filterable: true, comparable: true },
          { key: 'inverter', label: 'انفرتر', type: 'boolean', filterable: true, comparable: true },
        ],
      },
    })
    specTemplateId = template.id

    const category = await prisma.category.create({
      data: {
        name: `قسم اختبار الاختيار ${runId}`,
        slug: categorySlug,
        visible: true,
        sort: 999,
        specTemplateId,
      },
    })
    categoryId = category.id

    const brand = await prisma.brand.create({
      data: { name: `ماركة الاختيار ${runId}`, slug: `quiz-brand-${runId}`, visible: true },
    })
    brandId = brand.id

    const createProduct = async (
      suffix: string,
      price: number,
      stock: number,
      specs: Record<string, string | number | boolean>,
    ): Promise<string> => {
      const product = await prisma.product.create({
        data: {
          slug: `quiz-${runId}-${suffix}`,
          modelCode: `QUIZ-${runId}-${suffix}`.toUpperCase(),
          name: `منتج الاختيار ${suffix} ${runId}`,
          brandId,
          categoryId,
          price,
          stock,
          lowStockThreshold: 1,
          availabilityMode: 'auto',
          visible: true,
          taxRate: 14,
          specs,
          images: { create: [{ url: `https://example.com/quiz-${runId}-${suffix}.jpg`, sort: 0 }] },
        },
      })
      return product.id
    }

    bigId = await createProduct('big', 2_000_000, 10, { capacity_l: 500, inverter: true })
    midId = await createProduct('mid', 1_800_000, 7, { capacity_l: 350, inverter: true })
    smallId = await createProduct('small', 1_500_000, 5, { capacity_l: 250, inverter: false })
    outId = await createProduct('out', 2_200_000, 0, { capacity_l: 600, inverter: true })

    const order = await prisma.order.create({
      data: {
        no: `SR-QUIZ-${runId}`,
        type: 'order',
        status: 'delivered',
        customerName: 'عميل اختبار الاختيار',
        customerPhone: '01099999999',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'شارع الجيش',
        subtotal: 20_000_000,
        deliveryFee: 10_000,
        total: 20_010_000,
        paymentMethod: 'cod',
        publicToken: `quiz-pub-${runId}`,
        confirmToken: `quiz-conf-${runId}`,
        items: {
          create: [
            { productId: bigId, name: 'منتج كبير', modelCode: `QUIZ-${runId}-BIG`, qty: 3, unitPrice: 2_000_000 },
            { productId: midId, name: 'منتج وسط', modelCode: `QUIZ-${runId}-MID`, qty: 5, unitPrice: 1_800_000 },
            { productId: smallId, name: 'منتج صغير', modelCode: `QUIZ-${runId}-SMALL`, qty: 1, unitPrice: 1_500_000 },
          ],
        },
        events: {
          create: [
            {
              status: 'delivered',
              note: 'تم التسليم قبل 10 أيام',
              at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
    orderIds.push(order.id)
  })

  afterAll(async () => {
    if (orderIds.length > 0) {
      await prisma.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => undefined)
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => undefined)
      await prisma.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => undefined)
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => undefined)
    }

    if (categoryId) {
      await prisma.quizRule.deleteMany({ where: { categoryId } }).catch(() => undefined)
      const productIds = [bigId, midId, smallId, outId].filter(Boolean)
      if (productIds.length > 0) {
        await prisma.productImage.deleteMany({ where: { productId: { in: productIds } } }).catch(() => undefined)
        await prisma.product.deleteMany({ where: { id: { in: productIds } } }).catch(() => undefined)
      }
      await prisma.category.deleteMany({ where: { id: categoryId } }).catch(() => undefined)
    }
    if (specTemplateId) {
      await prisma.specTemplate.deleteMany({ where: { id: specTemplateId } }).catch(() => undefined)
    }
    if (brandId) {
      await prisma.brand.deleteMany({ where: { id: brandId } }).catch(() => undefined)
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
  // Scenario 1: RBAC, CSRF and the no-quiz state
  // ==========================================================================
  describe('Scenario 1: RBAC, CSRF and no-quiz 404', () => {
    it('returns 404 for a public GET when the category has no quiz', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/quiz/${categorySlug}`)
        .set('X-Forwarded-For', nextIp())
        .expect(404)
      expect(res.body.message).toBe(NO_QUIZ_MESSAGE)
    })

    it('lists the category as quiz-less for the owner', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/quiz')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const items: AdminQuizRow[] = res.body.items
      const row = items.find((item) => item.categoryId === categoryId)
      expect(row).toBeDefined()
      expect(row?.hasQuiz).toBe(false)
      expect(row?.questionCount).toBe(0)

      const stateRes = await request(app.getHttpServer())
        .get(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(200)
      const state: AdminQuizState = stateRes.body
      expect(state.definition).toBeNull()
      expect(state.specFields.map((field) => field.key)).toEqual(['capacity_l', 'inverter'])
    })

    it('refuses a restricted admin and a CSRF-less mutation', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/quiz')
        .set('Cookie', restrictedSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(403)

      await request(app.getHttpServer())
        .put(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', restrictedSessionCookie)
        .set('x-csrf-token', restrictedCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(buildQuiz())
        .expect(403)

      await request(app.getHttpServer())
        .put(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .send(buildQuiz())
        .expect(403)
    })
  })

  // ==========================================================================
  // Scenario 2: Admin saves a quiz and validation rejects bad rules
  // ==========================================================================
  describe('Scenario 2: Admin save and validation', () => {
    it('saves a valid quiz', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(buildQuiz())
        .expect(200)

      const state: AdminQuizState = res.body
      expect(state.definition?.questions).toHaveLength(3)
      expect(state.warnings).toEqual([])
    })

    it('rejects a rule on an unknown field and gte on a boolean field', async () => {
      const unknownField = buildQuiz()
      unknownField.rules[0] = {
        answerId: 'fam-large',
        field: 'ghost_field',
        op: 'gte',
        value: 1,
        points: 2,
        reason: 'حقل وهمي',
      }
      const unknownRes = await request(app.getHttpServer())
        .put(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(unknownField)
        .expect(400)
      expect(unknownRes.body.message).toBe(INVALID_RULES_MESSAGE)
      expect(JSON.stringify(unknownRes.body.errors)).toContain('ghost_field')

      const badOperator = buildQuiz()
      badOperator.rules[2] = {
        answerId: 'pow-saves',
        field: 'inverter',
        op: 'gte',
        value: 1,
        points: 1,
        reason: 'مقارنة غلط على منطقي',
      }
      const opRes = await request(app.getHttpServer())
        .put(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(badOperator)
        .expect(400)
      expect(opRes.body.message).toBe(INVALID_RULES_MESSAGE)
      expect(opRes.body.errors).toBeDefined()
    })

    it('rejects an answer id of «unsure» through the Zod pipe', async () => {
      const badQuiz = buildQuiz()
      badQuiz.questions[0]?.answers.push({ id: 'unsure', text: 'مش متأكد' })
      const res = await request(app.getHttpServer())
        .put(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(badQuiz)
        .expect(400)
      expect(res.body.message).toBe('بيانات غير صحيحة')
    })
  })

  // ==========================================================================
  // Scenario 3: Public quiz shape never leaks rules
  // ==========================================================================
  describe('Scenario 3: Public quiz', () => {
    it('returns questions only and never the rules', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/quiz/${categorySlug}`)
        .set('X-Forwarded-For', nextIp())
        .expect(200)

      const body: PublicQuiz = res.body
      expect(body.category.slug).toBe(categorySlug)
      expect(body.questions).toHaveLength(3)
      expect(JSON.stringify(body)).not.toContain('"rules"')
      expect(JSON.stringify(body)).not.toContain('points')
    })
  })

  // ==========================================================================
  // Scenario 4: Scoring, fallback and stock filter
  // ==========================================================================
  describe('Scenario 4: Results scoring', () => {
    it('ranks the big inverter product first with its reason', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/quiz/${categorySlug}/results`)
        .set('X-Forwarded-For', nextIp())
        .send({ answers: { family: 'fam-large', power: 'pow-saves', space: 'unsure' } })
        .expect(200)

      const body: QuizResultsResponse = res.body
      expect(body.fallback).toBe(false)
      expect(body.items[0]?.product.id).toBe(bigId)
      expect(body.items[0]?.reason).toBe(BIG_REASON)
      expect(body.items.map((item) => item.product.id)).not.toContain(outId)
    })

    it('falls back to popularity with a null reason for all-unsure answers', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/quiz/${categorySlug}/results`)
        .set('X-Forwarded-For', nextIp())
        .send({ answers: { family: 'unsure', power: 'unsure', space: 'unsure' } })
        .expect(200)

      const body: QuizResultsResponse = res.body
      expect(body.fallback).toBe(true)
      expect(body.items.map((item) => item.product.id)).toEqual([midId, bigId, smallId])
      expect(body.items.every((item) => item.reason === null)).toBe(true)
    })
  })

  // ==========================================================================
  // Scenario 5: Editing a rule's points changes the ranking
  // ==========================================================================
  describe('Scenario 5: Edited points change ranking', () => {
    it('makes the cheaper product first after lowering the capacity rule points', async () => {
      const edited = buildQuiz()
      edited.rules[0] = {
        answerId: 'fam-large',
        field: 'capacity_l',
        op: 'gte',
        value: 450,
        points: -5,
        reason: 'سعة كبيرة للأسرة',
      }
      await request(app.getHttpServer())
        .put(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .send(edited)
        .expect(200)

      const res = await request(app.getHttpServer())
        .post(`/api/quiz/${categorySlug}/results`)
        .set('X-Forwarded-For', nextIp())
        .send({ answers: { family: 'fam-large', power: 'pow-saves', space: 'unsure' } })
        .expect(200)

      const body: QuizResultsResponse = res.body
      expect(body.fallback).toBe(false)
      expect(body.items[0]?.product.id).toBe(midId)
      expect(body.items.map((item) => item.product.id)).not.toContain(bigId)
    })
  })

  // ==========================================================================
  // Scenario 6: Delete removes the entry point
  // ==========================================================================
  describe('Scenario 6: Delete', () => {
    it('deletes the quiz and makes the public entry point 404 again', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(204)

      await request(app.getHttpServer())
        .get(`/api/quiz/${categorySlug}`)
        .set('X-Forwarded-For', nextIp())
        .expect(404)

      const res = await request(app.getHttpServer())
        .delete(`/api/admin/quiz/${categoryId}`)
        .set('Cookie', ownerSessionCookie)
        .set('x-csrf-token', ownerCsrfToken)
        .set('X-Forwarded-For', nextIp())
        .expect(404)
      expect(res.body.message).toBe(NO_QUIZ_MESSAGE)
    })

    it('returns 404 for an unknown category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/quiz/does-not-exist')
        .set('Cookie', ownerSessionCookie)
        .set('X-Forwarded-For', nextIp())
        .expect(404)
      expect(res.body.message).toBe(MISSING_CATEGORY_MESSAGE)
    })
  })
})
