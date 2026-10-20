import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

/** Fetches a storefront URL; a fresh query string skips the one-hour SWR cache of the XML routes. */
async function fetchSite(baseUrl: string, path: string, runId: string): Promise<Response> {
  return fetch(`${baseUrl}${path}?v=${runId}-${Math.random().toString(36).slice(2, 7)}`)
}

function jsonLdTypes(scripts: string[]): string[] {
  const types: string[] = []
  for (const text of scripts) {
    for (const match of text.matchAll(/"@type":"(\w+)"/g)) {
      if (match[1]) types.push(match[1])
    }
  }
  return types
}

test('sitemap, robots, canonical, product structured data and the Merchant feed', async ({ app, browser }) => {
  const baseUrl = (process.env.APP_URL ?? app.baseUrl ?? 'http://localhost:3000').replace(/\/$/, '')

  const listed = await seed.product({
    name: `غسالة سيو ${seed.runId}`,
    categorySlug: 'washers',
    priceEgp: 15000,
    stock: 6,
    withImage: true,
    flashSale: { salePriceEgp: 12500, startsInMinutes: -5, endsInMinutes: 120 },
  })
  const hidden = await seed.product({ name: `غسالة مخفية ${seed.runId}`, categorySlug: 'washers', visible: false, withImage: true })
  const outOfStock = await seed.product({ name: `غسالة خلصانة ${seed.runId}`, categorySlug: 'washers', stock: 0, withImage: true })
  await seed.review({ productId: listed.id, stars: 5, status: 'approved', text: 'غسالة ممتازة وهادية جداً في الشغل' })

  // 1. Sitemap lists the visible product and omits the hidden one
  const sitemap = await fetchSite(baseUrl, '/sitemap.xml', seed.runId)
  expect(sitemap.status).toBe(200)
  expect(sitemap.headers.get('content-type') ?? '').toContain('xml')
  const sitemapXml = await sitemap.text()
  expect(sitemapXml).toContain(`/p/${listed.slug}</loc>`)
  expect(sitemapXml).toContain('hreflang="en"')
  expect(sitemapXml).not.toContain(`/p/${hidden.slug}<`)

  // 2. robots.txt: blocks everything off production, otherwise disallows private paths and declares the sitemap
  const robots = await (await fetchSite(baseUrl, '/robots.txt', seed.runId)).text()
  if (/^Disallow: \/$/m.test(robots)) {
    expect(robots).toContain('User-agent: *')
  } else {
    for (const path of ['/admin', '/cart', '/checkout', '/wishlist', '/compare', '/api/']) {
      expect(robots).toContain(`Disallow: ${path}`)
    }
    expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/)
  }

  // 3. A filtered, sorted listing canonicalizes to its clean path (keeping page ≥ 2)
  await app.open('/c/washers?sort=price_asc&page=2')
  await expect(browser.locator('link[rel="canonical"]')).toHaveCount(1)
  const canonical = await browser.locator('link[rel="canonical"]').getAttribute('href')
  expect(canonical ?? '').toMatch(/\/c\/washers\?page=2$/)

  // 4. Product page structured data: Product, Offer, BreadcrumbList and AggregateRating (approved review)
  await app.open(`/p/${listed.slug}`)
  const scripts = await browser.locator('script[type="application/ld+json"]').allTextContents()
  const types = jsonLdTypes(scripts)
  for (const type of ['Product', 'Offer', 'BreadcrumbList', 'AggregateRating']) {
    expect(types).toContain(type)
  }

  // 5. Merchant feed: the in-stock product with its flash price; hidden and out-of-stock ones omitted
  const feed = await fetchSite(baseUrl, '/feeds/google.xml', seed.runId)
  expect(feed.status).toBe(200)
  expect(feed.headers.get('content-type') ?? '').toContain('application/rss+xml')
  const feedXml = await feed.text()
  expect(feedXml).toContain('xmlns:g="http://base.google.com/ns/1.0"')
  const item = feedXml.split('<item>').find((chunk) => chunk.includes(`<g:id>${listed.modelCode}</g:id>`))
  if (!item) throw new Error('listed product missing from the feed')
  expect(item).toContain('<g:availability>in_stock</g:availability>')
  expect(item).toContain('<g:price>15000.00 EGP</g:price>')
  expect(item).toContain('<g:sale_price>12500.00 EGP</g:sale_price>')
  expect(item).toContain('<g:sale_price_effective_date>')
  expect(feedXml).not.toContain(`<g:id>${hidden.modelCode}</g:id>`)
  expect(feedXml).not.toContain(`<g:id>${outOfStock.modelCode}</g:id>`)
})
