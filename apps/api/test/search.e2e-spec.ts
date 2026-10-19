import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { customAlphabet } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { SearchIndexService } from '../src/catalog/search-index.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

describe('Search API E2E (/api/search & /api/products?q=...)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let searchIndexService: SearchIndexService

  const fixtureTag = `search-test-${nanoid()}`
  let hiddenProductId = ''
  let archivedProductId = ''
  let reindexProductId = ''

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)
    searchIndexService = app.get(SearchIndexService)

    const baseCat = await prisma.category.findFirst({ where: { slug: 'refrigerators', visible: true } })
    const baseBrand = await prisma.brand.findFirst({ where: { slug: 'samsung', visible: true } })

    if (!baseCat || !baseBrand) {
      throw new Error('Expected seeded refrigerators category and samsung brand in test DB')
    }

    // 1. Hidden product (must never appear in search results)
    const hiddenProd = await prisma.product.create({
      data: {
        slug: `hidden-search-prod-${fixtureTag}`,
        modelCode: `HIDDEN-SRCH-${fixtureTag}`,
        name: `ثلاجة مخفية لا تظهر ${fixtureTag}`,
        brandId: baseBrand.id,
        categoryId: baseCat.id,
        price: 1500000,
        visible: false,
        stock: 10,
        searchText: `تلاجه مخفيه لا تظهر سامسونج samsung ${fixtureTag}`,
      },
    })
    hiddenProductId = hiddenProd.id

    // 2. Archived product (must never appear in search results)
    const archivedProd = await prisma.product.create({
      data: {
        slug: `archived-search-prod-${fixtureTag}`,
        modelCode: `ARCH-SRCH-${fixtureTag}`,
        name: `ثلاجة مؤرشفة قديمة ${fixtureTag}`,
        brandId: baseBrand.id,
        categoryId: baseCat.id,
        price: 1600000,
        visible: true,
        archivedAt: new Date(),
        stock: 5,
        searchText: `تلاجه مورشفه قديمه سامسونج samsung ${fixtureTag}`,
      },
    })
    archivedProductId = archivedProd.id

    // 3. Test product for reindexProduct test
    const reindexProd = await prisma.product.create({
      data: {
        slug: `reindex-prod-${fixtureTag}`,
        modelCode: `REINDEX-${fixtureTag}`,
        name: `جهاز تجريبي مبدئي ${fixtureTag}`,
        brandId: baseBrand.id,
        categoryId: baseCat.id,
        price: 2500000,
        visible: true,
        stock: 5,
        searchText: `جهاز تجريبي مبدئي سامسونج samsung ${fixtureTag}`,
      },
    })
    reindexProductId = reindexProd.id
  })

  afterAll(async () => {
    if (prisma) {
      const idsToDelete = [hiddenProductId, archivedProductId, reindexProductId].filter(Boolean)
      if (idsToDelete.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: idsToDelete } } }).catch(() => undefined)
      }
    }
    if (app) {
      await app.close()
    }
  })

  // ==========================================================================
  // 1. GET /api/search (Dropdown Live Search)
  // ==========================================================================
  describe('GET /api/search', () => {
    it('finds seeded fridges stored as «ثلاجة» when searched with «تلاجه» and suggests category (US-2.1)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'تلاجه' })
        .expect(200)

      expect(res.body.query).toBe('تلاجه')
      expect(Array.isArray(res.body.items)).toBe(true)
      expect(res.body.items.length).toBeGreaterThan(0)

      // All returned items must be fridges
      for (const item of res.body.items) {
        expect(item.category.slug).toBe('refrigerators')
      }

      // Categories array suggests «ثلاجات وفريزر»
      expect(Array.isArray(res.body.categories)).toBe(true)
      expect(res.body.categories.length).toBeGreaterThan(0)
      const catSlugs = res.body.categories.map((c: { slug: string }) => c.slug)
      expect(catSlugs).toContain('refrigerators')
    })

    it('finds Samsung products with both Arabic «سامسونج» and English «samsung»', async () => {
      const resAr = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'سامسونج' })
        .expect(200)

      expect(resAr.body.items.length).toBeGreaterThan(0)
      for (const item of resAr.body.items) {
        expect(item.brand.slug).toBe('samsung')
      }

      const resEn = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'samsung' })
        .expect(200)

      expect(resEn.body.items.length).toBeGreaterThan(0)
      for (const item of resEn.body.items) {
        expect(item.brand.slug).toBe('samsung')
      }
    })

    it('finds the 450 L fridge when searching Arabic-Indic digits «٤٥٠»', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: '٤٥٠' })
        .expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      // Check that at least one item is the 450 L fridge (SR-S1)
      const modelCodes = res.body.items.map((i: { modelCode: string }) => i.modelCode)
      expect(modelCodes).toContain('SR-S1')
    })

    it('finds products indexed with synonym spelling (e.g. «انفرتر» ↔ «inverter»)', async () => {
      const resEn = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'inverter' })
        .expect(200)

      expect(resEn.body.items.length).toBeGreaterThan(0)

      const resAr = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'انفرتر' })
        .expect(200)

      expect(resAr.body.items.length).toBeGreaterThan(0)
    })

    it('ranks exact model code first when typed exactly', async () => {
      const seeded = await prisma.product.findFirst({
        where: { modelCode: 'SR-S1', visible: true, archivedAt: null },
      })
      if (!seeded) return

      const res = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'SR-S1' })
        .expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      // Exact model code must rank at index 0
      expect(res.body.items[0].modelCode).toBe('SR-S1')
      expect(res.body.items[0].id).toBe(seeded.id)
    })

    it('finds product with one-typo query (e.g. «سامسنج» for «سامسونج») via trigram similarity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'سامسنج' })
        .expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      const brandSlugs = res.body.items.map((i: { brand: { slug: string } }) => i.brand.slug)
      expect(brandSlugs).toContain('samsung')
    })

    it('never returns hidden or archived products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: fixtureTag })
        .expect(200)

      const returnedIds = res.body.items.map((i: { id: string }) => i.id)
      expect(returnedIds).not.toContain(hiddenProductId)
      expect(returnedIds).not.toContain(archivedProductId)
    })

    it('respects limit parameter (default 8, max 20)', async () => {
      const resLimit3 = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'تلاجه', limit: 3 })
        .expect(200)

      expect(resLimit3.body.items.length).toBeLessThanOrEqual(3)

      const resDefault = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'تلاجه' })
        .expect(200)

      expect(resDefault.body.items.length).toBeLessThanOrEqual(8)
    })

    it('returns empty arrays with 200 for garbage query', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'xyznonsensequery999' })
        .expect(200)

      expect(res.body.query).toBe('xyznonsensequery999')
      expect(res.body.items).toEqual([])
      expect(res.body.categories).toEqual([])
    })
  })

  // ==========================================================================
  // 2. GET /api/products?q=... (Catalog Search Integration)
  // ==========================================================================
  describe('GET /api/products?q=...', () => {
    it('combines search query with brand filter and returns accurate total and facets', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .query({ q: 'تلاجه', brand: 'samsung' })
        .expect(200)

      expect(res.body.total).toBeGreaterThan(0)
      expect(Array.isArray(res.body.items)).toBe(true)
      expect(res.body.items.length).toBeGreaterThan(0)

      for (const item of res.body.items) {
        expect(item.brand.slug).toBe('samsung')
        expect(item.category.slug).toBe('refrigerators')
      }

      // Facets reflect filtered search results
      expect(res.body.facets.brands).toBeDefined()
      const brandFacets = res.body.facets.brands.map((b: { slug: string }) => b.slug)
      expect(brandFacets).toContain('samsung')
    })

    it('defaults sort to relevance when q is provided without sort parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .query({ q: 'SR-S1' })
        .expect(200)

      expect(res.body.items.length).toBeGreaterThan(0)
      // Exact model code must rank #1 in relevance sort
      expect(res.body.items[0].modelCode).toBe('SR-S1')
    })
  })

  // ==========================================================================
  // 3. SearchIndexService.reindexProduct
  // ==========================================================================
  describe('SearchIndexService.reindexProduct', () => {
    it('reindexes a product after name change so search finds it by the new name', async () => {
      const uniqueKeyword = `فريد${nanoid()}`
      const updatedName = `غسالة ذكية ${uniqueKeyword}`

      // 1. Update product name in DB directly without updating search_text
      await prisma.product.update({
        where: { id: reindexProductId },
        data: { name: updatedName },
      })

      // 2. Search for the unique new name before reindex — should NOT find it
      const resBefore = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: uniqueKeyword })
        .expect(200)

      const idsBefore = resBefore.body.items.map((i: { id: string }) => i.id)
      expect(idsBefore).not.toContain(reindexProductId)

      // 3. Reindex the product
      await searchIndexService.reindexProduct(reindexProductId)

      // 4. Search again — search MUST find it by the new name
      const resAfter = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: uniqueKeyword })
        .expect(200)

      const idsAfter = resAfter.body.items.map((i: { id: string }) => i.id)
      expect(idsAfter).toContain(reindexProductId)
    })
  })
})
