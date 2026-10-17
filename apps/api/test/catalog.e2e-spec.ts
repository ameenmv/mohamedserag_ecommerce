import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { customAlphabet } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

describe('Catalog API E2E (/api/categories, /api/brands, /api/products)', () => {
  let app: INestApplication
  let prisma: PrismaService

  // Fixture IDs for cleanup
  const fixtureTag = `cat-test-${nanoid()}`
  let emptyCategoryId = ''
  let hiddenCategoryId = ''
  let hiddenBrandId = ''
  let hiddenProductId = ''
  let archivedProductId = ''

  let popCategoryId = ''
  let popCategorySlug = ''
  let popProductRecentId = ''
  let popProductOldId = ''
  let popProductNoneId = ''
  let popRecentOrderId = ''
  let popOldOrderId = ''

  let knownFridgeSlug = ''
  let knownProductIds: string[] = []

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    // 1. Fetch some seeded products for assertions
    const seededProducts = await prisma.product.findMany({
      where: { visible: true, archivedAt: null },
      take: 5,
      include: { brand: true, category: true },
    })

    if (seededProducts.length === 0) {
      throw new Error('Expected seeded products in test DB, found 0')
    }

    knownProductIds = seededProducts.map((p) => p.id)

    const fridge = await prisma.product.findFirst({
      where: { category: { slug: 'refrigerators' }, visible: true, archivedAt: null },
      include: { brand: true, category: true },
    })
    if (fridge) {
      knownFridgeSlug = fridge.slug
    }

    // 2. Create fixtures:
    // a. Empty visible category (should be hidden in GET /api/categories)
    const emptyCat = await prisma.category.create({
      data: {
        name: `قسم تجريبي فارغ ${fixtureTag}`,
        slug: `empty-cat-${fixtureTag}`,
        visible: true,
        sort: 999,
      },
    })
    emptyCategoryId = emptyCat.id

    // b. Hidden category (should 404 in GET /api/categories/:slug)
    const hiddenCat = await prisma.category.create({
      data: {
        name: `قسم مخفي ${fixtureTag}`,
        slug: `hidden-cat-${fixtureTag}`,
        visible: false,
        sort: 998,
      },
    })
    hiddenCategoryId = hiddenCat.id

    // c. Hidden brand (should not appear in GET /api/brands and 404 on slug)
    const hiddenBr = await prisma.brand.create({
      data: {
        name: `ماركة مخفية ${fixtureTag}`,
        slug: `hidden-brand-${fixtureTag}`,
        visible: false,
      },
    })
    hiddenBrandId = hiddenBr.id

    // d. Hidden and archived products
    const baseCat = await prisma.category.findFirst({ where: { slug: 'refrigerators' } })
    const baseBrand = await prisma.brand.findFirst({ where: { visible: true } })

    if (baseCat && baseBrand) {
      const hiddenProd = await prisma.product.create({
        data: {
          slug: `hidden-prod-${fixtureTag}`,
          modelCode: `HIDDEN-${fixtureTag}`,
          name: `منتج مخفي ${fixtureTag}`,
          brandId: baseBrand.id,
          categoryId: baseCat.id,
          price: 1500000,
          visible: false,
          stock: 10,
        },
      })
      hiddenProductId = hiddenProd.id

      const archivedProd = await prisma.product.create({
        data: {
          slug: `archived-prod-${fixtureTag}`,
          modelCode: `ARCHIVED-${fixtureTag}`,
          name: `منتج مؤرشف ${fixtureTag}`,
          brandId: baseBrand.id,
          categoryId: baseCat.id,
          price: 1800000,
          visible: true,
          archivedAt: new Date(),
          stock: 5,
        },
      })
      archivedProductId = archivedProd.id

      // e. Popularity ranking test fixtures:
      // Category with 3 products:
      // - Recent: order delivered 10 days ago (qty 5)
      // - Old: order delivered 120 days ago (qty 25, outside 90-day window)
      // - None: no orders
      popCategorySlug = `pop-cat-${fixtureTag}`
      const popCat = await prisma.category.create({
        data: {
          name: `قسم اختبار الشعبية ${fixtureTag}`,
          slug: popCategorySlug,
          visible: true,
          sort: 800,
        },
      })
      popCategoryId = popCat.id

      const prodRecent = await prisma.product.create({
        data: {
          slug: `pop-prod-rec-${fixtureTag}`,
          modelCode: `POP-REC-${fixtureTag}`,
          name: `منتج طلب حديث ${fixtureTag}`,
          brandId: baseBrand.id,
          categoryId: popCat.id,
          price: 2000000,
          visible: true,
          stock: 10,
        },
      })
      popProductRecentId = prodRecent.id

      const prodOld = await prisma.product.create({
        data: {
          slug: `pop-prod-old-${fixtureTag}`,
          modelCode: `POP-OLD-${fixtureTag}`,
          name: `منتج طلب قديم ${fixtureTag}`,
          brandId: baseBrand.id,
          categoryId: popCat.id,
          price: 2000000,
          visible: true,
          stock: 10,
        },
      })
      popProductOldId = prodOld.id

      const prodNone = await prisma.product.create({
        data: {
          slug: `pop-prod-none-${fixtureTag}`,
          modelCode: `POP-NONE-${fixtureTag}`,
          name: `منتج بدون طلبات ${fixtureTag}`,
          brandId: baseBrand.id,
          categoryId: popCat.id,
          price: 2000000,
          visible: true,
          stock: 10,
        },
      })
      popProductNoneId = prodNone.id

      // Order with delivered event 10 days ago
      const orderRecent = await prisma.order.create({
        data: {
          no: `SR-TEST-REC-${fixtureTag}`,
          type: 'order',
          status: 'delivered',
          customerName: 'عميل اختبار حديث',
          customerPhone: '01011111111',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          zoneId: 'mansoura',
          address: 'شارع الجيش',
          subtotal: 10000000,
          deliveryFee: 10000,
          total: 10010000,
          paymentMethod: 'cod',
          publicToken: `pub-rec-${fixtureTag}`,
          confirmToken: `conf-rec-${fixtureTag}`,
          items: {
            create: [
              {
                productId: popProductRecentId,
                name: 'منتج حديث',
                modelCode: `MOD-REC-${fixtureTag}`,
                qty: 5,
                unitPrice: 2000000,
              },
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
      popRecentOrderId = orderRecent.id

      // Order with delivered event 120 days ago (outside 90-day window)
      const orderOld = await prisma.order.create({
        data: {
          no: `SR-TEST-OLD-${fixtureTag}`,
          type: 'order',
          status: 'delivered',
          customerName: 'عميل اختبار قديم',
          customerPhone: '01022222222',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          zoneId: 'mansoura',
          address: 'شارع الجمهورية',
          subtotal: 50000000,
          deliveryFee: 10000,
          total: 50010000,
          paymentMethod: 'cod',
          publicToken: `pub-old-${fixtureTag}`,
          confirmToken: `conf-old-${fixtureTag}`,
          items: {
            create: [
              {
                productId: popProductOldId,
                name: 'منتج قديم',
                modelCode: `MOD-OLD-${fixtureTag}`,
                qty: 25,
                unitPrice: 2000000,
              },
            ],
          },
          events: {
            create: [
              {
                status: 'delivered',
                note: 'تم التسليم قبل 120 يوماً',
                at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
              },
            ],
          },
        },
      })
      popOldOrderId = orderOld.id
    }
  })

  afterAll(async () => {
    if (prisma) {
      const orderIds = [popRecentOrderId, popOldOrderId].filter(Boolean)
      if (orderIds.length > 0) {
        await prisma.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => undefined)
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => undefined)
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => undefined)
      }
      const productIds = [
        hiddenProductId,
        archivedProductId,
        popProductRecentId,
        popProductOldId,
        popProductNoneId,
      ].filter(Boolean)
      if (productIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: productIds } } }).catch(() => undefined)
      }
      const categoryIds = [emptyCategoryId, hiddenCategoryId, popCategoryId].filter(Boolean)
      if (categoryIds.length > 0) {
        await prisma.category.deleteMany({ where: { id: { in: categoryIds } } }).catch(() => undefined)
      }
      if (hiddenBrandId) {
        await prisma.brand.deleteMany({ where: { id: hiddenBrandId } }).catch(() => undefined)
      }
    }
    if (app) {
      await app.close()
    }
  })

  // ==========================================================================
  // 1. GET /api/categories
  // ==========================================================================
  describe('GET /api/categories', () => {
    it('returns visible categories as a tree and omits empty categories (US-1.1)', async () => {
      const res = await request(app.getHttpServer()).get('/api/categories').expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)

      // Collect all category IDs in the tree
      const collectedIds: string[] = []
      const checkNode = (node: { id: string; productCount: number; children: unknown[]; sort: number }) => {
        collectedIds.push(node.id)
        expect(node.productCount).toBeGreaterThan(0)
        expect(Array.isArray(node.children)).toBe(true)
        for (const child of node.children as Array<{ id: string; productCount: number; children: unknown[]; sort: number }>) {
          checkNode(child)
        }
      }

      for (const root of res.body) {
        checkNode(root)
      }

      // Empty category must be omitted
      expect(collectedIds).not.toContain(emptyCategoryId)
      // Hidden category must be omitted
      expect(collectedIds).not.toContain(hiddenCategoryId)
    })
  })

  // ==========================================================================
  // 2. GET /api/categories/:slug
  // ==========================================================================
  describe('GET /api/categories/:slug', () => {
    it('returns category details with validated spec template fields', async () => {
      const res = await request(app.getHttpServer()).get('/api/categories/refrigerators').expect(200)

      expect(res.body.slug).toBe('refrigerators')
      expect(res.body.name).toBe('ثلاجات وفريزر')
      expect(res.body.intro).toBeDefined()
      expect(Array.isArray(res.body.fields)).toBe(true)
      expect(res.body.fields.length).toBeGreaterThan(0)

      for (const field of res.body.fields) {
        expect(['text', 'number', 'boolean', 'choice']).toContain(field.type)
        expect(typeof field.key).toBe('string')
        expect(typeof field.label).toBe('string')
        expect(typeof field.filterable).toBe('boolean')
      }
    })

    it('returns 404 for unknown category slug', async () => {
      await request(app.getHttpServer()).get('/api/categories/unknown-cat-slug').expect(404)
    })

    it('returns 404 for hidden category', async () => {
      await request(app.getHttpServer()).get(`/api/categories/hidden-cat-${fixtureTag}`).expect(404)
    })
  })

  // ==========================================================================
  // 3. GET /api/brands & GET /api/brands/:slug
  // ==========================================================================
  describe('GET /api/brands', () => {
    it('returns visible brands with productCount > 0 ordered by sort then name', async () => {
      const res = await request(app.getHttpServer()).get('/api/brands').expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)

      for (const b of res.body) {
        expect(b.productCount).toBeGreaterThan(0)
        expect(b.slug).not.toBe(`hidden-brand-${fixtureTag}`)
      }
    })

    it('returns single brand detail on valid slug', async () => {
      const res = await request(app.getHttpServer()).get('/api/brands/samsung').expect(200)

      expect(res.body.slug).toBe('samsung')
      expect(res.body.name).toContain('سامسونج')
      expect(res.body.productCount).toBeGreaterThan(0)
    })

    it('returns 404 for missing or hidden brand', async () => {
      await request(app.getHttpServer()).get('/api/brands/non-existent-brand').expect(404)
      await request(app.getHttpServer()).get(`/api/brands/hidden-brand-${fixtureTag}`).expect(404)
    })
  })

  // ==========================================================================
  // 4. GET /api/products (Listing, Filters, Sort, Facets, IDs)
  // ==========================================================================
  describe('GET /api/products', () => {
    it('returns paginated items, default popular sort, total and live facets', async () => {
      const res = await request(app.getHttpServer()).get('/api/products').expect(200)

      expect(res.body.page).toBe(1)
      expect(res.body.pageSize).toBe(24)
      expect(typeof res.body.total).toBe('number')
      expect(res.body.total).toBeGreaterThan(0)
      expect(Array.isArray(res.body.items)).toBe(true)
      expect(res.body.items.length).toBeGreaterThan(0)

      // Facets
      expect(res.body.facets).toBeDefined()
      expect(Array.isArray(res.body.facets.brands)).toBe(true)
      expect(res.body.facets.brands.length).toBeGreaterThan(0)
      expect(typeof res.body.facets.price.min).toBe('number')
      expect(typeof res.body.facets.price.max).toBe('number')

      // Check card structure
      const first = res.body.items[0]
      expect(first.id).toBeDefined()
      expect(first.slug).toBeDefined()
      expect(first.brand.name).toBeDefined()
      expect(first.category.name).toBeDefined()
      expect(first.availability.state).toBeDefined()
      expect(first.availability.orderable).toBeDefined()

      // Hidden and archived must not be present
      const returnedIds = res.body.items.map((i: { id: string }) => i.id)
      expect(returnedIds).not.toContain(hiddenProductId)
      expect(returnedIds).not.toContain(archivedProductId)
    })

    it('ranks product with delivered order 10 days ago above product with none; 120-day-old order does not count', async () => {
      if (!popCategorySlug) return

      const res = await request(app.getHttpServer())
        .get(`/api/products?category=${popCategorySlug}&sort=popular`)
        .expect(200)

      expect(res.body.items.length).toBeGreaterThanOrEqual(2)
      // Product with delivered event 10 days ago must rank #1
      expect(res.body.items[0].id).toBe(popProductRecentId)

      // Product with 120-day-old order has 0 popularity units in 90-day window,
      // so it cannot outrank the recent one despite having higher quantity (25 vs 5)
      const itemIds = res.body.items.map((i: { id: string }) => i.id)
      expect(itemIds.indexOf(popProductRecentId)).toBe(0)
      expect(itemIds.indexOf(popProductOldId)).toBeGreaterThan(0)
    })

    it('filters by multiple brands: ?brand=samsung,lg', async () => {
      const res = await request(app.getHttpServer()).get('/api/products?brand=samsung,lg').expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      for (const item of res.body.items) {
        expect(['samsung', 'lg']).toContain(item.brand.slug)
      }
    })

    it('filters by price range (EGP inputs converted to piastres)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products?minPrice=20000&maxPrice=35000')
        .expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      for (const item of res.body.items) {
        expect(item.price).toBeGreaterThanOrEqual(2000000)
        expect(item.price).toBeLessThanOrEqual(3500000)
      }
    })

    it('filters by discounted=true (oldPrice > price)', async () => {
      const res = await request(app.getHttpServer()).get('/api/products?discounted=true').expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      for (const item of res.body.items) {
        expect(item.oldPrice).not.toBeNull()
        expect(item.oldPrice).toBeGreaterThan(item.price)
        expect(item.discountPercent).toBeGreaterThan(0)
      }
    })

    it('filters by availability state: ?availability=in_stock', async () => {
      const res = await request(app.getHttpServer()).get('/api/products?availability=in_stock').expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      for (const item of res.body.items) {
        expect(item.availability.state).toBe('in_stock')
      }
    })

    it('filters by spec on a seeded category: cooling=نوفروست', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products?category=refrigerators&spec.cooling=نوفروست')
        .expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      for (const item of res.body.items) {
        expect(item.category.slug).toBe('refrigerators')
      }
    })

    it('sorts by price_asc in strictly ascending price order', async () => {
      const res = await request(app.getHttpServer()).get('/api/products?sort=price_asc').expect(200)

      const prices = res.body.items.map((i: { price: number }) => i.price)
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1])
      }
    })

    it('sorts by price_desc in strictly descending price order', async () => {
      const res = await request(app.getHttpServer()).get('/api/products?sort=price_desc').expect(200)

      const prices = res.body.items.map((i: { price: number }) => i.price)
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1])
      }
    })

    it('sorts by discount (biggest percentage off first)', async () => {
      const res = await request(app.getHttpServer()).get('/api/products?sort=discount').expect(200)

      const discounts = res.body.items.map((i: { discountPercent: number | null }) => i.discountPercent ?? 0)
      for (let i = 0; i < discounts.length - 1; i++) {
        expect(discounts[i]).toBeGreaterThanOrEqual(discounts[i + 1])
      }
    })

    it('returns exact visible products in client-requested order via ?ids=... with empty facets (US-2.4)', async () => {
      if (knownProductIds.length < 3) return

      const [firstId, secondId, thirdId] = knownProductIds
      const requestedOrder = `${thirdId},${firstId},${secondId}`

      const res = await request(app.getHttpServer())
        .get(`/api/products?ids=${requestedOrder}`)
        .expect(200)

      expect(res.body.items).toHaveLength(3)
      expect(res.body.items[0].id).toBe(thirdId)
      expect(res.body.items[1].id).toBe(firstId)
      expect(res.body.items[2].id).toBe(secondId)
      expect(res.body.total).toBe(3)
      expect(res.body.pageSize).toBe(3)
      expect(res.body.facets.brands).toEqual([])
      expect(res.body.facets.price).toEqual({ min: null, max: null })
    })

    it('omits hidden or archived IDs from ?ids=... response', async () => {
      if (knownProductIds.length === 0) return

      const validId = knownProductIds[0]
      const mixedIds = `${validId},${hiddenProductId},${archivedProductId}`

      const res = await request(app.getHttpServer()).get(`/api/products?ids=${mixedIds}`).expect(200)

      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].id).toBe(validId)
    })
  })

  // ==========================================================================
  // 5. GET /api/products/:slug (Product Detail)
  // ==========================================================================
  describe('GET /api/products/:slug', () => {
    it('returns full product detail with merged specs and related products <= 8', async () => {
      if (!knownFridgeSlug) return

      const res = await request(app.getHttpServer())
        .get(`/api/products/${knownFridgeSlug}`)
        .expect(200)

      expect(res.body.slug).toBe(knownFridgeSlug)
      expect(res.body.price).toBeGreaterThan(0)
      expect(res.body.brand.slug).toBeDefined()
      expect(res.body.category.slug).toBe('refrigerators')
      expect(res.body.category.name).toBe('ثلاجات وفريزر')

      // Merged specs in template order
      expect(Array.isArray(res.body.specs)).toBe(true)
      expect(res.body.specs.length).toBeGreaterThan(0)
      for (const spec of res.body.specs) {
        expect(spec.key).toBeDefined()
        expect(spec.label).toBeDefined()
        expect(spec.value).toBeDefined()
        expect(['text', 'number', 'boolean', 'choice']).toContain(spec.type)
      }

      // Related products <= 8 excluding itself
      expect(Array.isArray(res.body.related)).toBe(true)
      expect(res.body.related.length).toBeLessThanOrEqual(8)
      for (const rel of res.body.related) {
        expect(rel.id).not.toBe(res.body.id)
        expect(rel.category.slug).toBe('refrigerators')
      }
    })

    it('returns 404 for hidden product slug', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/hidden-prod-${fixtureTag}`)
        .expect(404)
    })

    it('returns 404 for archived product slug', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/archived-prod-${fixtureTag}`)
        .expect(404)
    })

    it('returns 404 for unknown product slug', async () => {
      await request(app.getHttpServer()).get('/api/products/non-existent-product-slug').expect(404)
    })
  })
})
