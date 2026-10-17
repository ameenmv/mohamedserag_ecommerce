import * as fs from 'node:fs'
import * as path from 'node:path'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ALL_PERMISSIONS, OWNER_ROLE_KEY } from '@serag/shared'
import argon2 from 'argon2'
import cookieParser from 'cookie-parser'
import { customAlphabet } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { resolveUploadsDir } from '../src/admin-catalog/admin-catalog.util.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

describe('Admin Catalog API E2E (/api/admin/...)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const testEmail = `admin-${nanoid()}@serag.test`
  const testPassword = `pass-${nanoid(16)}`
  let userId = ''
  let sessionCookie = ''
  let csrfToken = ''

  // Fixture trackers for cleanup
  const fixtureTag = `admin-test-${nanoid()}`
  let templateId = ''
  let categoryAId = ''
  let categoryBId = ''
  let brandId = ''
  let productId = ''
  let autoSlugProdId = ''
  let autoSlugProd2Id = ''
  let orderId = ''
  const uploadedFilesToCleanup: string[] = []

  // Valid 1x1 transparent PNG buffer
  const tinyPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  )

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

    const role = await prisma.role.upsert({
      where: { key: OWNER_ROLE_KEY },
      update: { name: 'مدير' },
      create: { key: OWNER_ROLE_KEY, name: 'مدير' },
    })

    const permissions = await prisma.permission.findMany()
    for (const p of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      })
    }

    const passwordHash = await argon2.hash(testPassword)
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'أحمد سراج مسؤول الكتالوج',
        passwordHash,
        active: true,
        roles: { create: [{ roleId: role.id }] },
      },
    })
    userId = user.id

    // Login to obtain session cookie and csrfToken
    const loginRes = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200)

    const setCookie = loginRes.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    const seragCookie = cookies.find((c) => c.startsWith('serag_sid='))
    sessionCookie = seragCookie?.split(';')[0] ?? ''
    csrfToken = loginRes.body.csrfToken
  })

  afterAll(async () => {
    if (prisma) {
      if (orderId) {
        await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => undefined)
        await prisma.order.deleteMany({ where: { id: orderId } }).catch(() => undefined)
      }
      const prodIds = [productId, autoSlugProdId, autoSlugProd2Id].filter(Boolean)
      if (prodIds.length > 0) {
        await prisma.productImage.deleteMany({ where: { productId: { in: prodIds } } }).catch(() => undefined)
        await prisma.product.deleteMany({ where: { id: { in: prodIds } } }).catch(() => undefined)
      }
      const catIds = [categoryBId, categoryAId].filter(Boolean)
      if (catIds.length > 0) {
        await prisma.category.deleteMany({ where: { id: { in: catIds } } }).catch(() => undefined)
      }
      if (brandId) {
        await prisma.brand.deleteMany({ where: { id: brandId } }).catch(() => undefined)
      }
      if (templateId) {
        await prisma.specTemplate.deleteMany({ where: { id: templateId } }).catch(() => undefined)
      }
      if (userId) {
        await prisma.auditLog.deleteMany({ where: { userId } }).catch(() => undefined)
        await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined)
        await prisma.userRole.deleteMany({ where: { userId } }).catch(() => undefined)
        await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined)
      }
    }

    // Clean up uploaded test files
    for (const f of uploadedFilesToCleanup) {
      await fs.promises.rm(f, { recursive: true, force: true }).catch(() => undefined)
    }
    // ...and the per-product upload folders they lived in
    for (const id of [productId, autoSlugProdId, autoSlugProd2Id].filter(Boolean)) {
      await fs.promises
        .rm(path.join(resolveUploadsDir(), 'products', id), { recursive: true, force: true })
        .catch(() => undefined)
    }

    if (app) {
      await app.close()
    }
  })

  // ==========================================================================
  // 1. 401 without a session
  // ==========================================================================
  it('rejects unauthenticated requests to /api/admin/products with 401', async () => {
    await request(app.getHttpServer()).get('/api/admin/products').expect(401)
  })

  // ==========================================================================
  // 2. Setup fixtures via Admin API (SpecTemplate, Category, Brand)
  // ==========================================================================
  it('creates spec template, category, and brand via admin API', async () => {
    // Spec template
    const tRes = await request(app.getHttpServer())
      .post('/api/admin/spec-templates')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `قالب ${fixtureTag}`,
        fields: [
          { key: 'capacity_l', label: 'السعة باللتر', type: 'number', unit: 'لتر' },
          { key: 'cooling', label: 'نظام التبريد', type: 'choice', options: ['نوفروست', 'ديفروست'] },
        ],
      })
      .expect(201)

    templateId = tRes.body.id
    expect(templateId).toBeDefined()
    expect(tRes.body.fields).toHaveLength(2)

    // Category
    const cRes = await request(app.getHttpServer())
      .post('/api/admin/categories')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `قسم ${fixtureTag}`,
        slug: `cat-${fixtureTag}`,
        specTemplateId: templateId,
      })
      .expect(201)

    categoryAId = cRes.body.id
    expect(categoryAId).toBeDefined()

    // Brand
    const bRes = await request(app.getHttpServer())
      .post('/api/admin/brands')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `ماركة ${fixtureTag}`,
        slug: `brand-${fixtureTag}`,
      })
      .expect(201)

    brandId = bRes.body.id
    expect(brandId).toBeDefined()
  })

  // ==========================================================================
  // 3. Product CRUD round trip
  // ==========================================================================
  it('performs full product CRUD round trip', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج اختبار CRUD ${fixtureTag}`,
        modelCode: `MOD-CRUD-${fixtureTag}`,
        brandId,
        categoryId: categoryAId,
        price: 2890000,
        oldPrice: 3250000,
        stock: 10,
        specs: { capacity_l: 450, cooling: 'نوفروست' },
        visible: true,
      })
      .expect(201)

    productId = createRes.body.id
    expect(productId).toBeDefined()
    expect(createRes.body.name).toBe(`منتج اختبار CRUD ${fixtureTag}`)
    expect(createRes.body.price).toBe(2890000)
    expect(createRes.body.inOrders).toBe(false)
    expect(createRes.body.specs.cooling).toBe('نوفروست')

    // GET by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/admin/products/${productId}`)
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(getRes.body.id).toBe(productId)
    expect(getRes.body.modelCode).toBe(`MOD-CRUD-${fixtureTag}`)

    // GET list with search q
    const listRes = await request(app.getHttpServer())
      .get(`/api/admin/products?q=MOD-CRUD-${fixtureTag}`)
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(listRes.body.total).toBeGreaterThanOrEqual(1)
    const found = listRes.body.items.find((i: { id: string }) => i.id === productId)
    expect(found).toBeDefined()

    // PATCH update
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/admin/products/${productId}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج محدث ${fixtureTag}`,
        price: 2950000,
      })
      .expect(200)

    expect(patchRes.body.name).toBe(`منتج محدث ${fixtureTag}`)
    expect(patchRes.body.price).toBe(2950000)
  })

  // ==========================================================================
  // 4. Slug auto-generation & 409 on duplicate modelCode
  // ==========================================================================
  it('auto-generates slug from modelCode and rejects duplicate modelCode with 409', async () => {
    const rawModel = `MOD-AUTO-${fixtureTag}/X`
    const res1 = await request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج تلقائي الرابط ${fixtureTag}`,
        modelCode: rawModel,
        brandId,
        categoryId: categoryAId,
        price: 1500000,
      })
      .expect(201)

    autoSlugProdId = res1.body.id
    expect(res1.body.slug).toBe(`mod-auto-${fixtureTag}-x`.toLowerCase())

    // Duplicate modelCode -> 409
    const dupRes = await request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج مكرر كود ${fixtureTag}`,
        modelCode: rawModel,
        brandId,
        categoryId: categoryAId,
        price: 1500000,
      })
      .expect(409)

    expect(dupRes.body.field).toBe('modelCode')

    // Second product whose base slug would clash -> gets unique suffix
    const res2 = await request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج منافس في الرابط ${fixtureTag}`,
        modelCode: `MOD-AUTO-${fixtureTag}-X`, // different model code, same base slug
        brandId,
        categoryId: categoryAId,
        price: 1500000,
      })
      .expect(201)

    autoSlugProd2Id = res2.body.id
    expect(res2.body.slug).toContain(`mod-auto-${fixtureTag}-x`.toLowerCase())
    expect(res2.body.slug).not.toBe(res1.body.slug)
  })

  // ==========================================================================
  // 5. Spec validation (unknown key → 400, wrong type → 400)
  // ==========================================================================
  it('validates specs against category template (rejects unknown key & wrong type with 400)', async () => {
    // Unknown key
    const resUnknown = await request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج خاصية مجهولة ${fixtureTag}`,
        modelCode: `MOD-UNK-${fixtureTag}`,
        brandId,
        categoryId: categoryAId,
        price: 1000000,
        specs: { non_existent_spec_key: 'value' },
      })
      .expect(400)

    expect(resUnknown.body.errors).toBeDefined()
    expect(resUnknown.body.errors.non_existent_spec_key).toBeDefined()

    // Wrong type for number (capacity_l is number)
    const resType = await request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج نوع خاطئ ${fixtureTag}`,
        modelCode: `MOD-WRONG-${fixtureTag}`,
        brandId,
        categoryId: categoryAId,
        price: 1000000,
        specs: { capacity_l: 'not-a-number' },
      })
      .expect(400)

    expect(resType.body.errors.capacity_l).toBeDefined()

    // Wrong choice option
    const resChoice = await request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج خيار خاطئ ${fixtureTag}`,
        modelCode: `MOD-CHOICE-${fixtureTag}`,
        brandId,
        categoryId: categoryAId,
        price: 1000000,
        specs: { cooling: 'خيار غير متاح' },
      })
      .expect(400)

    expect(resChoice.body.errors.cooling).toBeDefined()
  })

  // ==========================================================================
  // 6. Archive hides the product from the public /api/products
  // ==========================================================================
  it('archive hides the product from the public catalog and unarchive restores it', async () => {
    const pDetail = await request(app.getHttpServer())
      .get(`/api/admin/products/${productId}`)
      .set('Cookie', sessionCookie)
      .expect(200)

    const slug = pDetail.body.slug

    // Public detail succeeds before archive
    await request(app.getHttpServer()).get(`/api/products/${slug}`).expect(200)

    // Archive product
    const archRes = await request(app.getHttpServer())
      .post(`/api/admin/products/${productId}/archive`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .expect(200)

    expect(archRes.body.archivedAt).not.toBeNull()
    expect(archRes.body.visible).toBe(false)

    // Public detail 404s after archive
    await request(app.getHttpServer()).get(`/api/products/${slug}`).expect(404)

    // Unarchive
    const unarchRes = await request(app.getHttpServer())
      .post(`/api/admin/products/${productId}/unarchive`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .expect(200)

    expect(unarchRes.body.archivedAt).toBeNull()

    // Make visible again
    await request(app.getHttpServer())
      .patch(`/api/admin/products/${productId}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ visible: true })
      .expect(200)

    await request(app.getHttpServer()).get(`/api/products/${slug}`).expect(200)
  })

  // ==========================================================================
  // 7. Delete blocked by orders → 409
  // ==========================================================================
  it('blocks deletion when product has OrderItem records with 409', async () => {
    // Create an order fixture in Prisma referencing productId
    const order = await prisma.order.create({
      data: {
        no: `SR-E2E-${fixtureTag}`,
        type: 'order',
        status: 'confirmed',
        customerName: 'عميل اختبار',
        customerPhone: '01099999999',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        zoneId: 'mansoura',
        address: 'حي الجامعة',
        subtotal: 2890000,
        deliveryFee: 10000,
        total: 2900000,
        paymentMethod: 'cod',
        publicToken: `pub-${fixtureTag}`,
        confirmToken: `cnf-${fixtureTag}`,
        items: {
          create: [
            {
              productId,
              name: 'منتج مرتبط بطلب',
              modelCode: `MOD-ORDER-${fixtureTag}`,
              qty: 1,
              unitPrice: 2890000,
            },
          ],
        },
      },
    })
    orderId = order.id

    // Check that admin detail shows inOrders: true
    const detailRes = await request(app.getHttpServer())
      .get(`/api/admin/products/${productId}`)
      .set('Cookie', sessionCookie)
      .expect(200)
    expect(detailRes.body.inOrders).toBe(true)

    // Attempt delete -> 409 { code: 'IN_ORDERS' }
    const delRes = await request(app.getHttpServer())
      .delete(`/api/admin/products/${productId}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .expect(409)

    expect(delRes.body.code).toBe('IN_ORDERS')

    // Remove order and verify delete then succeeds
    await prisma.orderItem.deleteMany({ where: { orderId } })
    await prisma.order.delete({ where: { id: orderId } })
    orderId = ''

    // Recreate a secondary product to test successful deletion
    const tempProdRes = await request(app.getHttpServer())
      .post('/api/admin/products')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `منتج للحذف ${fixtureTag}`,
        modelCode: `MOD-DEL-${fixtureTag}`,
        brandId,
        categoryId: categoryAId,
        price: 1000000,
      })
      .expect(201)

    await request(app.getHttpServer())
      .delete(`/api/admin/products/${tempProdRes.body.id}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .expect(204)
  })

  // ==========================================================================
  // 8. Image upload: tiny valid PNG, wrong MIME → 400, reorder, delete
  // ==========================================================================
  it('handles image upload, validates MIME from magic bytes, reorders, and deletes', async () => {
    // 1. Upload valid PNG
    const upRes1 = await request(app.getHttpServer())
      .post(`/api/admin/products/${productId}/images`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .attach('file', tinyPngBuffer, 'pixel.png')
      .expect(201)

    const img1 = upRes1.body
    expect(img1.id).toBeDefined()
    expect(img1.url).toMatch(/^\/uploads\/products\/.+\.png$/)
    expect(img1.sort).toBe(0)

    const uploadsDir = resolveUploadsDir()
    const filePath1 = path.join(uploadsDir, img1.url.replace(/^\/?uploads\//, ''))
    uploadedFilesToCleanup.push(filePath1)
    expect(fs.existsSync(filePath1)).toBe(true)

    // 2. Reject wrong MIME (text buffer with fake .png filename)
    const fakeBuffer = Buffer.from('this is not a valid png image')
    await request(app.getHttpServer())
      .post(`/api/admin/products/${productId}/images`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .attach('file', fakeBuffer, 'fake.png')
      .expect(400)

    // 3. Upload second valid image
    const upRes2 = await request(app.getHttpServer())
      .post(`/api/admin/products/${productId}/images`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .attach('file', tinyPngBuffer, 'pixel2.png')
      .expect(201)

    const img2 = upRes2.body
    expect(img2.sort).toBe(1)
    const filePath2 = path.join(uploadsDir, img2.url.replace(/^\/?uploads\//, ''))
    uploadedFilesToCleanup.push(filePath2)

    // 4. Reorder images
    await request(app.getHttpServer())
      .put(`/api/admin/products/${productId}/images/order`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ ids: [img2.id, img1.id] })
      .expect(200)

    const detailAfterReorder = await request(app.getHttpServer())
      .get(`/api/admin/products/${productId}`)
      .set('Cookie', sessionCookie)
      .expect(200)

    expect(detailAfterReorder.body.images[0].id).toBe(img2.id)
    expect(detailAfterReorder.body.images[1].id).toBe(img1.id)

    // 5. Delete an image
    await request(app.getHttpServer())
      .delete(`/api/admin/products/${productId}/images/${img1.id}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .expect(204)

    expect(fs.existsSync(filePath1)).toBe(false)
  })

  // ==========================================================================
  // 9. Category cycle → 400
  // ==========================================================================
  it('rejects category hierarchy cycles with 400', async () => {
    // Create child category B under category A
    const catBRes = await request(app.getHttpServer())
      .post('/api/admin/categories')
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: `قسم فرعي B ${fixtureTag}`,
        slug: `cat-b-${fixtureTag}`,
        parentId: categoryAId,
      })
      .expect(201)

    categoryBId = catBRes.body.id

    // Attempt to make A a child of B (cycle: A -> B -> A) -> 400
    const cycleRes = await request(app.getHttpServer())
      .patch(`/api/admin/categories/${categoryAId}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ parentId: categoryBId })
      .expect(400)

    expect(cycleRes.body.field).toBe('parentId')

    // Attempt to make A its own parent (A -> A) -> 400
    const selfCycleRes = await request(app.getHttpServer())
      .patch(`/api/admin/categories/${categoryAId}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .send({ parentId: categoryAId })
      .expect(400)

    expect(selfCycleRes.body.field).toBe('parentId')
  })

  // ==========================================================================
  // 10. Spec template delete blocked → 409
  // ==========================================================================
  it('blocks spec template deletion when categories are linked to it with 409', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/admin/spec-templates/${templateId}`)
      .set('Cookie', sessionCookie)
      .set('x-csrf-token', csrfToken)
      .expect(409)

    expect(res.body.code).toBe('IN_USE')
  })
})
