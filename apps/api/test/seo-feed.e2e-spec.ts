import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import type { SitemapEntry } from '@serag/shared'
import cookieParser from 'cookie-parser'
import { customAlphabet } from 'nanoid'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

function feedItem(body: string, modelCode: string): string {
  const items = body.split('<item>').slice(1)
  return items.find((chunk) => chunk.includes(`<g:id>${modelCode}</g:id>`)) ?? ''
}

describe('SEO Sitemap + Google Feed E2E (/api/seo/sitemap-entries, /api/feeds/google.xml)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const runId = nanoid()
  const categorySlug = `seo-cat-${runId}`
  const brandSlug = `seo-brand-${runId}`
  const pageSlug = `seo-page-${runId}`
  const guideSlug = `seo-guide-${runId}`

  const aModel = `SEO-A-${runId}`.toUpperCase()
  const bModel = `SEO-B-${runId}`.toUpperCase()
  const cModel = `SEO-C-${runId}`.toUpperCase()
  const dModel = `SEO-D-${runId}`.toUpperCase()
  const eModel = `SEO-E-${runId}`.toUpperCase()
  const fModel = `SEO-F-${runId}`.toUpperCase()
  const gModel = `SEO-G-${runId}`.toUpperCase()

  const aSlug = `seo-a-${runId}`
  const cSlug = `seo-c-${runId}`
  const fSlug = `seo-f-${runId}`
  const gSlug = `seo-g-${runId}`

  let categoryId = ''
  let brandId = ''
  let pageId = ''
  let guideId = ''
  let flashSaleId = ''
  const productIds: string[] = []

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    app.set('trust proxy', 1)
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    await app.init()

    prisma = app.get(PrismaService)

    const category = await prisma.category.create({
      data: { name: `قسم SEO ${runId}`, slug: categorySlug, visible: true, sort: 100 },
    })
    categoryId = category.id

    const brand = await prisma.brand.create({
      data: { name: `ماركة SEO ${runId}`, slug: brandSlug, visible: true, sort: 100 },
    })
    brandId = brand.id

    const createProduct = async (data: {
      slug: string
      modelCode: string
      name: string
      price: number
      stock: number
      availabilityMode: 'auto' | 'on_request' | 'out'
      visible: boolean
      archivedAt?: Date
      imageUrl?: string
      seoDescription?: string
    }): Promise<string> => {
      const product = await prisma.product.create({
        data: {
          slug: data.slug,
          modelCode: data.modelCode,
          name: data.name,
          brandId,
          categoryId,
          price: data.price,
          stock: data.stock,
          lowStockThreshold: 2,
          availabilityMode: data.availabilityMode,
          visible: data.visible,
          archivedAt: data.archivedAt ?? null,
          seoDescription: data.seoDescription ?? null,
          taxRate: 14,
          ...(data.imageUrl
            ? { images: { create: [{ url: data.imageUrl, sort: 0 }] } }
            : {}),
        },
      })
      return product.id
    }

    // A: visible, in stock, has an image, name contains XML-special characters.
    productIds.push(
      await createProduct({
        slug: aSlug,
        modelCode: aModel,
        name: `منتج A & <B> ${runId}`,
        price: 123_400,
        stock: 10,
        availabilityMode: 'auto',
        visible: true,
        imageUrl: `/uploads/${runId}-a.jpg`,
        seoDescription: '<p>وصف <b>المنتج</b> الأول</p>',
      }),
    )

    // B: visible, in stock, no image -> excluded.
    productIds.push(
      await createProduct({
        slug: `seo-b-${runId}`,
        modelCode: bModel,
        name: `منتج B ${runId}`,
        price: 200_000,
        stock: 10,
        availabilityMode: 'auto',
        visible: true,
      }),
    )

    // C: hidden -> excluded.
    productIds.push(
      await createProduct({
        slug: cSlug,
        modelCode: cModel,
        name: `منتج C ${runId}`,
        price: 300_000,
        stock: 10,
        availabilityMode: 'auto',
        visible: false,
        imageUrl: `/uploads/${runId}-c.jpg`,
      }),
    )

    // D: out of stock -> excluded.
    productIds.push(
      await createProduct({
        slug: `seo-d-${runId}`,
        modelCode: dModel,
        name: `منتج D ${runId}`,
        price: 400_000,
        stock: 0,
        availabilityMode: 'auto',
        visible: true,
        imageUrl: `/uploads/${runId}-d.jpg`,
      }),
    )

    // E: on request -> excluded.
    productIds.push(
      await createProduct({
        slug: `seo-e-${runId}`,
        modelCode: eModel,
        name: `منتج E ${runId}`,
        price: 500_000,
        stock: 0,
        availabilityMode: 'on_request',
        visible: true,
        imageUrl: `/uploads/${runId}-e.jpg`,
      }),
    )

    // F: archived -> excluded.
    productIds.push(
      await createProduct({
        slug: fSlug,
        modelCode: fModel,
        name: `منتج F ${runId}`,
        price: 600_000,
        stock: 10,
        availabilityMode: 'auto',
        visible: true,
        archivedAt: new Date(),
        imageUrl: `/uploads/${runId}-f.jpg`,
      }),
    )

    // G: visible, in stock, image, on a running flash sale.
    const gId = await createProduct({
      slug: gSlug,
      modelCode: gModel,
      name: `منتج G ${runId}`,
      price: 700_000,
      stock: 10,
      availabilityMode: 'auto',
      visible: true,
      imageUrl: `/uploads/${runId}-g.jpg`,
    })
    productIds.push(gId)

    const now = Date.now()
    const flashSale = await prisma.flashSale.create({
      data: {
        name: `عرض SEO ${runId}`,
        startsAt: new Date(now - 3600_000),
        endsAt: new Date(now + 3600_000),
        items: { create: [{ productId: gId, salePrice: 490_000 }] },
      },
    })
    flashSaleId = flashSale.id

    const page = await prisma.page.create({
      data: {
        slug: pageSlug,
        title: `صفحة SEO ${runId}`,
        body: '<p>محتوى</p>',
        published: true,
      },
    })
    pageId = page.id

    const guide = await prisma.guide.create({
      data: {
        slug: guideSlug,
        title: `دليل SEO ${runId}`,
        body: '<p>محتوى</p>',
        published: true,
        publishedAt: new Date(),
      },
    })
    guideId = guide.id
  })

  afterAll(async () => {
    if (flashSaleId) {
      await prisma.flashSale.deleteMany({ where: { id: flashSaleId } }).catch(() => undefined)
    }
    if (productIds.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: { in: productIds } } }).catch(() => undefined)
      await prisma.product.deleteMany({ where: { id: { in: productIds } } }).catch(() => undefined)
    }
    if (pageId) {
      await prisma.page.deleteMany({ where: { id: pageId } }).catch(() => undefined)
    }
    if (guideId) {
      await prisma.guide.deleteMany({ where: { id: guideId } }).catch(() => undefined)
    }
    if (categoryId) {
      await prisma.category.deleteMany({ where: { id: categoryId } }).catch(() => undefined)
    }
    if (brandId) {
      await prisma.brand.deleteMany({ where: { id: brandId } }).catch(() => undefined)
    }

    await app.close()
  })

  describe('GET /api/feeds/google.xml', () => {
    it('serves an RSS 2.0 feed with the Google namespace', async () => {
      const res = await request(app.getHttpServer()).get('/api/feeds/google.xml').expect(200)
      expect(res.headers['content-type']).toContain('application/rss+xml')
      expect(res.text).toContain('xmlns:g="http://base.google.com/ns/1.0"')
    })

    it('includes the in-stock product with image, price, brand and condition', async () => {
      const res = await request(app.getHttpServer()).get('/api/feeds/google.xml').expect(200)
      const item = feedItem(res.text, aModel)

      expect(item).not.toBe('')
      expect(item).toContain(`<g:id>${aModel}</g:id>`)
      expect(item).toContain('<g:price>1234.00 EGP</g:price>')
      expect(item).toContain('<g:availability>in_stock</g:availability>')
      expect(item).toContain('<g:condition>new</g:condition>')
      expect(item).toContain(`<g:brand>ماركة SEO ${runId}</g:brand>`)
      expect(item).toContain(`/p/${aSlug}`)
    })

    it('escapes XML-special characters in the product name', async () => {
      const res = await request(app.getHttpServer()).get('/api/feeds/google.xml').expect(200)
      expect(res.text).toContain('&amp;')
      expect(res.text).toContain('&lt;')
      expect(res.text).not.toContain(`<g:title>منتج A & <B>`)
    })

    it('emits sale price and effective date while a flash sale is running', async () => {
      const res = await request(app.getHttpServer()).get('/api/feeds/google.xml').expect(200)
      const item = feedItem(res.text, gModel)

      expect(item).not.toBe('')
      expect(item).toContain('<g:price>7000.00 EGP</g:price>')
      expect(item).toContain('<g:sale_price>4900.00 EGP</g:sale_price>')
      expect(item).toContain('<g:sale_price_effective_date>')
    })

    it('excludes no-image, hidden, out-of-stock, on-request and archived products', async () => {
      const res = await request(app.getHttpServer()).get('/api/feeds/google.xml').expect(200)
      for (const model of [bModel, cModel, dModel, eModel, fModel]) {
        expect(res.text).not.toContain(model)
      }
    })
  })

  describe('GET /api/seo/sitemap-entries', () => {
    it('lists static paths first, then visible entities and published content', async () => {
      const res = await request(app.getHttpServer()).get('/api/seo/sitemap-entries').expect(200)
      const entries: SitemapEntry[] = res.body.entries
      const paths = entries.map((entry) => entry.path)

      expect(entries[0]?.path).toBe('/')
      expect(paths).toContain('/shop')
      expect(paths).toContain('/offers')
      expect(paths).toContain('/bridal')
      expect(paths).toContain('/traders')
      expect(paths).toContain('/guides')
      expect(paths).toContain(`/c/${categorySlug}`)
      expect(paths).toContain(`/b/${brandSlug}`)
      expect(paths).toContain(`/p/${aSlug}`)
      expect(paths).toContain(`/pages/${pageSlug}`)
      expect(paths).toContain(`/guides/${guideSlug}`)

      for (const entry of entries) {
        expect(Number.isNaN(Date.parse(entry.lastmod))).toBe(false)
      }
    })

    it('excludes hidden and archived products', async () => {
      const res = await request(app.getHttpServer()).get('/api/seo/sitemap-entries').expect(200)
      const paths: string[] = res.body.entries.map((entry: SitemapEntry) => entry.path)
      expect(paths).not.toContain(`/p/${cSlug}`)
      expect(paths).not.toContain(`/p/${fSlug}`)
    })
  })
})
