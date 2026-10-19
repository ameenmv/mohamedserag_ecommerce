import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ALL_PERMISSIONS, OWNER_ROLE_KEY, PERMISSIONS } from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { customAlphabet } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

describe('Admin Product Import API E2E (/api/admin/products/import/...)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const fixtureTag = `imp-${nanoid()}`
  const testEmail = `admin-import-${fixtureTag}@serag.test`
  const testPassword = `pass-${nanoid(16)}`
  let userId = ''
  let sessionCookie = ''
  let csrfToken = ''

  // Unprivileged user for 403 test
  const unprivEmail = `unpriv-${fixtureTag}@serag.test`
  const unprivPassword = `pass-${nanoid(16)}`
  let unprivUserId = ''
  let unprivSessionCookie = ''
  let unprivCsrfToken = ''

  // Fixtures
  let categoryId = ''
  let brandId = ''
  let prod1Id = ''
  let prod2Id = ''
  let prod3Id = ''
  let prod4Id = ''

  const model1 = `MOD-IMP1-${fixtureTag}`
  const model2 = `MOD-IMP2-${fixtureTag}`
  const model3 = `MOD-IMP3-${fixtureTag}`
  const model4 = `MOD-IMP4-${fixtureTag}`

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // Ensure permissions and owner role
    for (const key of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      })
    }

    const ownerRole = await prisma.role.upsert({
      where: { key: OWNER_ROLE_KEY },
      update: { name: 'مدير' },
      create: { key: OWNER_ROLE_KEY, name: 'مدير' },
    })

    const allPerms = await prisma.permission.findMany()
    for (const p of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: p.id },
      })
    }

    // Role with only products.read (no products.import)
    const readOnlyRole = await prisma.role.upsert({
      where: { key: `readonly-${fixtureTag}` },
      update: {},
      create: { key: `readonly-${fixtureTag}`, name: 'قراءة فقط' },
    })
    const readPerm = allPerms.find((p) => p.key === PERMISSIONS.products.read)
    if (readPerm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: readOnlyRole.id, permissionId: readPerm.id } },
        update: {},
        create: { roleId: readOnlyRole.id, permissionId: readPerm.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'مسؤول الاستيراد',
        passwordHash,
        active: true,
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    })
    userId = user.id

    const unprivHash = await argon2.hash(unprivPassword)
    const unprivUser = await prisma.user.create({
      data: {
        email: unprivEmail,
        name: 'مستخدم محدود',
        passwordHash: unprivHash,
        active: true,
        roles: { create: [{ roleId: readOnlyRole.id }] },
      },
    })
    unprivUserId = unprivUser.id

    // Login privileged user
    const loginRes = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200)

    const setCookie = loginRes.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    const seragCookie = cookies.find((c) => c.startsWith('serag_sid='))
    sessionCookie = seragCookie?.split(';')[0] ?? ''
    csrfToken = loginRes.body.csrfToken

    // Login unprivileged user
    const unprivLoginRes = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: unprivEmail, password: unprivPassword })
      .expect(200)

    const unprivSetCookie = unprivLoginRes.headers['set-cookie']
    const unprivCookies = Array.isArray(unprivSetCookie)
      ? unprivSetCookie
      : unprivSetCookie
        ? [unprivSetCookie]
        : []
    const unprivSeragCookie = unprivCookies.find((c) => c.startsWith('serag_sid='))
    unprivSessionCookie = unprivSeragCookie?.split(';')[0] ?? ''
    unprivCsrfToken = unprivLoginRes.body.csrfToken

    // Create Category & Brand fixtures
    const cat = await prisma.category.create({
      data: {
        name: `قسم استيراد ${fixtureTag}`,
        slug: `cat-imp-${fixtureTag}`,
      },
    })
    categoryId = cat.id

    const br = await prisma.brand.create({
      data: {
        name: `ماركة استيراد ${fixtureTag}`,
        slug: `brand-imp-${fixtureTag}`,
      },
    })
    brandId = br.id

    // Create 3 Test Products
    const p1 = await prisma.product.create({
      data: {
        name: `منتج 1 ${fixtureTag}`,
        slug: `prod-1-${fixtureTag}`,
        modelCode: model1,
        brandId,
        categoryId,
        price: 1000000, // 10,000 EGP
        oldPrice: 1200000, // 12,000 EGP
        stock: 10,
        visible: true,
      },
    })
    prod1Id = p1.id

    const p2 = await prisma.product.create({
      data: {
        name: `منتج 2 ${fixtureTag}`,
        slug: `prod-2-${fixtureTag}`,
        modelCode: model2,
        brandId,
        categoryId,
        price: 2000000, // 20,000 EGP
        oldPrice: null,
        stock: 5,
        visible: true,
      },
    })
    prod2Id = p2.id

    const p3 = await prisma.product.create({
      data: {
        name: `منتج 3 ${fixtureTag}`,
        slug: `prod-3-${fixtureTag}`,
        modelCode: model3,
        brandId,
        categoryId,
        price: 3000000, // 30,000 EGP
        oldPrice: 3500000, // 35,000 EGP
        stock: 8,
        visible: true,
      },
    })
    prod3Id = p3.id

    const p4 = await prisma.product.create({
      data: {
        name: `منتج 4 ${fixtureTag}`,
        slug: `prod-4-${fixtureTag}`,
        modelCode: model4,
        brandId,
        categoryId,
        price: 4000000, // 40,000 EGP
        oldPrice: null,
        stock: 3,
        visible: true,
      },
    })
    prod4Id = p4.id
  })

  afterAll(async () => {
    if (prisma) {
      const prodIds = [prod1Id, prod2Id, prod3Id, prod4Id].filter(Boolean)
      if (prodIds.length > 0) {
        await prisma.stockMovement.deleteMany({ where: { productId: { in: prodIds } } }).catch(() => undefined)
        await prisma.product.deleteMany({ where: { id: { in: prodIds } } }).catch(() => undefined)
      }
      if (categoryId) {
        await prisma.category.deleteMany({ where: { id: categoryId } }).catch(() => undefined)
      }
      if (brandId) {
        await prisma.brand.deleteMany({ where: { id: brandId } }).catch(() => undefined)
      }
      const userIds = [userId, unprivUserId].filter(Boolean)
      if (userIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
        await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
        await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
        await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
      }
      await prisma.rolePermission.deleteMany({ where: { role: { key: `readonly-${fixtureTag}` } } }).catch(() => undefined)
      await prisma.role.deleteMany({ where: { key: `readonly-${fixtureTag}` } }).catch(() => undefined)
    }

    if (app) {
      await app.close()
    }
  })

  // ==========================================================================
  // 1. 401 & 403 without valid session or permissions
  // ==========================================================================
  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).get('/api/admin/products/import/export').expect(401)
    await request(app.getHttpServer()).post('/api/admin/products/import/preview').send({ csv: '' }).expect(401)
    await request(app.getHttpServer()).post('/api/admin/products/import/apply').send({ csv: '' }).expect(401)
  })

  it('rejects session lacking products.import permission with 403', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/products/import/export')
      .set('Cookie', unprivSessionCookie)
      .expect(403)

    await request(app.getHttpServer())
      .post('/api/admin/products/import/preview')
      .set('Cookie', unprivSessionCookie)
      .set('x-csrf-token', unprivCsrfToken)
      .send({ csv: 'model_code,price\r\nABC,100' })
      .expect(403)

    await request(app.getHttpServer())
      .post('/api/admin/products/import/apply')
      .set('Cookie', unprivSessionCookie)
      .set('x-csrf-token', unprivCsrfToken)
      .send({ csv: 'model_code,price\r\nABC,100' })
      .expect(403)
  })

  // ==========================================================================
  // 2. Export has BOM, header, and content-disposition
  // ==========================================================================
  it('exports products CSV with UTF-8 BOM, header, and content-disposition attachment', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/products/import/export')
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="serag-products-\d{4}-\d{2}-\d{2}\.csv"/)

    const text = res.text
    // Starts with UTF-8 BOM (0xFEFF)
    expect(text.charCodeAt(0)).toBe(0xfeff)

    // Contains expected header
    expect(text).toContain('model_code,name,price,old_price,stock')

    // Contains our seeded test products
    expect(text).toContain(model1)
    expect(text).toContain(model2)
    expect(text).toContain(model3)
  })

  // ==========================================================================
  // 3. Preview: update, unchanged, not_found, duplicate, invalid price, oldPrice <= price, Arabic digits, Arabic header, semicolon delimiter
  // ==========================================================================
  it('previews complex CSV with all status variants, Arabic digits, Arabic header, and semicolon delimiter', async () => {
    // Semicolon delimited with Arabic headers
    const csv = [
      'كود الموديل;سعر البيع;السعر القديم;المخزون',
      // Row 1: Valid update on model1 (Arabic digits: price 11,000 EGP, stock 15)
      `${model1};١١٠٠٠;١٣٠٠٠;١٥`,
      // Row 2: Unchanged on model2 (exact same values: 20000 EGP, stock 5)
      `${model2};20000;;5`,
      // Row 3: Product not found
      `MOD-NOTFOUND-${fixtureTag};5000;;10`,
      // Row 4: Duplicate of model1 in the same file
      `${model1};11000;;15`,
      // Row 5: Invalid price (<= 0)
      `${model3};-500;;8`,
      // Row 6: oldPrice <= price error (oldPrice 25000 <= price 28000)
      `${model4};28000;25000;3`,
    ].join('\r\n')

    const res = await request(app.getHttpServer())
      .post('/api/admin/products/import/preview')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ csv })
      .expect(200)

    const plan = res.body
    expect(plan.headerError).toBeUndefined()
    expect(plan.rows).toHaveLength(6)

    // Row 1: Update
    expect(plan.rows[0].status).toBe('update')
    expect(plan.rows[0].modelCode).toBe(model1)
    expect(plan.rows[0].changes).toEqual(['price', 'oldPrice', 'stock'])
    expect(plan.rows[0].next.price).toBe(1100000) // 11,000 EGP
    expect(plan.rows[0].next.stock).toBe(15)

    // Row 2: Unchanged
    expect(plan.rows[1].status).toBe('unchanged')
    expect(plan.rows[1].modelCode).toBe(model2)
    expect(plan.rows[1].changes).toEqual([])

    // Row 3: Not found
    expect(plan.rows[2].status).toBe('not_found')
    expect(plan.rows[2].modelCode).toBe(`MOD-NOTFOUND-${fixtureTag}`)

    // Row 4: Duplicate
    expect(plan.rows[3].status).toBe('duplicate')
    expect(plan.rows[3].modelCode).toBe(model1)

    // Row 5: Invalid price error
    expect(plan.rows[4].status).toBe('error')
    expect(plan.rows[4].errors).toContain('admin.products.import.errors.invalidPrice')

    // Row 6: Old price <= price error
    expect(plan.rows[5].status).toBe('error')
    expect(plan.rows[5].errors).toContain('admin.products.import.errors.oldPriceNotGreaterThanPrice')

    // Summary counts
    expect(plan.summary.update).toBe(1)
    expect(plan.summary.unchanged).toBe(1)
    expect(plan.summary.notFound).toBe(1)
    expect(plan.summary.duplicate).toBe(1)
    expect(plan.summary.error).toBe(2)
  })

  // ==========================================================================
  // 4. Apply updates database, records StockMovement, skips errors/unchanged
  // ==========================================================================
  it('applies only valid updates in a transaction, creates StockMovement with reason: import, and skips errors', async () => {
    // Current state of model1: price 1000000, oldPrice 1200000, stock 10
    const csv = [
      'model_code,price,old_price,stock',
      // Update model1: price -> 11500 EGP (1150000 piastres), stock -> 14 (+4 delta), oldPrice cleared with 0
      `${model1},11500,0,14`,
      // Unchanged model2
      `${model2},20000,,5`,
      // Error row
      `${model3},-100,,8`,
    ].join('\r\n')

    const res = await request(app.getHttpServer())
      .post('/api/admin/products/import/apply')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ csv })
      .expect(200)

    expect(res.body).toEqual({
      updated: 1,
      skipped: 1,
      errors: 1,
    })

    // Verify model1 was updated in database
    const updatedProd1 = await prisma.product.findUnique({ where: { id: prod1Id } })
    expect(updatedProd1?.price).toBe(1150000)
    expect(updatedProd1?.oldPrice).toBeNull() // cleared
    expect(updatedProd1?.stock).toBe(14)

    // Verify model2 was NOT modified
    const unchangedProd2 = await prisma.product.findUnique({ where: { id: prod2Id } })
    expect(unchangedProd2?.stock).toBe(5)

    // Verify StockMovement written with reason: 'import' and signed qty = +4
    const movement = await prisma.stockMovement.findFirst({
      where: {
        productId: prod1Id,
        reason: 'import',
      },
      orderBy: { at: 'desc' },
    })
    expect(movement).toBeDefined()
    expect(movement?.qty).toBe(4) // 14 - 10 = +4
    expect(movement?.userId).toBe(userId)

    // Verify AuditLog written
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'product-import.apply',
        userId,
      },
      orderBy: { at: 'desc' },
    })
    expect(audit).toBeDefined()
  })

  // ==========================================================================
  // 5. PATCH /admin/products/:id stock change writes a manual StockMovement
  // ==========================================================================
  it('records manual StockMovement with signed difference on product PATCH stock change', async () => {
    // Current stock of model1 is 14. Update to 20 (+6 delta)
    await request(app.getHttpServer())
      .patch(`/api/admin/products/${prod1Id}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ stock: 20 })
      .expect(200)

    const updated = await prisma.product.findUnique({ where: { id: prod1Id } })
    expect(updated?.stock).toBe(20)

    const movement = await prisma.stockMovement.findFirst({
      where: {
        productId: prod1Id,
        reason: 'manual',
      },
      orderBy: { at: 'desc' },
    })
    expect(movement).toBeDefined()
    expect(movement?.qty).toBe(6) // 20 - 14 = +6
    expect(movement?.userId).toBe(userId)
  })

  // ==========================================================================
  // 6. Header error on apply responds 400
  // ==========================================================================
  it('responds with 400 if CSV has a header error on apply', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/products/import/apply')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ csv: 'invalid_col1,invalid_col2\r\nval1,val2' })
      .expect(400)
  })
})
