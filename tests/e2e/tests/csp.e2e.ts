import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { watchCsp, cspViolations, brokenImages } from './support/csp.js'
import { appUrl } from './app-url.js'

let seed = createSeed()

function assertCspHeader(csp: string | null) {
  expect(csp).toBeTruthy()
  const header = csp!
  expect(header).toContain("frame-ancestors 'self'")
  expect(header).toContain("object-src 'none'")
  expect(header).toContain("'sha256-")
  expect(header).not.toContain("'unsafe-eval'")

  const directives = header.split(';').map((d) => d.trim())
  const scriptSrcDirective = directives.find((d) => d.startsWith('script-src'))
  expect(scriptSrcDirective).toBeDefined()
  expect(scriptSrcDirective).not.toContain("'unsafe-inline'")
}

function assertCaddyHeadersIfPresent(headers: Headers) {
  if (headers.get('strict-transport-security')) {
    expect(headers.get('x-frame-options')?.toUpperCase()).toBe('SAMEORIGIN')
    expect(headers.get('permissions-policy')).toContain('camera=()')
    expect(headers.get('x-content-type-options')).toBe('nosniff')
  }
}

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('security headers: hash-based CSP on / and /admin/login', async () => {
  const homeRes = await fetch(appUrl('/'))
  expect(homeRes.status).toBe(200)
  assertCspHeader(homeRes.headers.get('content-security-policy'))
  assertCaddyHeadersIfPresent(homeRes.headers)

  const adminLoginRes = await fetch(appUrl('/admin/login'))
  expect(adminLoginRes.status).toBe(200)
  assertCspHeader(adminLoginRes.headers.get('content-security-policy'))
  assertCaddyHeadersIfPresent(adminLoginRes.headers)
})

test('storefront journey runs with zero CSP violations and broken images', async ({
  app,
  screen,
  browser,
}) => {
  await watchCsp(browser)

  const product = await seed.product({
    name: `منتج أمان ${seed.runId}`,
    priceEgp: 5000,
    stock: 5,
  })

  // 1. Home /
  await app.open('/')
  await waitForHydration(browser)
  await watchCsp(browser)
  await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 2. /shop
  await app.open('/shop')
  await waitForHydration(browser)
  await watchCsp(browser)
  await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 3. Search (/shop?q=...)
  await app.open(`/shop?q=${encodeURIComponent(product.name)}`)
  await waitForHydration(browser)
  await watchCsp(browser)
  await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 4. Product page (/p/:slug) and add to cart
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)
  await watchCsp(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 5. /cart
  await app.open('/cart')
  await waitForHydration(browser)
  await watchCsp(browser)
  await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 6. /checkout -> place order -> thank you page
  await app.open('/checkout')
  await waitForHydration(browser)
  await watchCsp(browser)
  await browser.locator('#checkout-name').fill('محمود أحمد سراج')
  await browser.locator('#checkout-phone').fill('01012345678')
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('طلخا')
  await browser.locator('#checkout-address').fill('شارع البحر بجوار كوبري طلخا')
  await browser.locator('input[type="radio"][value="cod"]').check()
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  const placeOrderBtn = screen.getByRole('button', 'تأكيد الطلب').first()
  await placeOrderBtn.tap()
  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)
  await waitForHydration(browser)
  await watchCsp(browser)
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 7. /bridal
  await app.open('/bridal')
  await waitForHydration(browser)
  await watchCsp(browser)
  await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])
})

test('admin journey runs with zero CSP violations and broken images', async ({
  app,
  screen,
  browser,
}) => {
  await browser.setViewport({ width: 1280, height: 900 })
  // The product and guide editors ask before leaving with unsaved edits; this test leaves on purpose
  await browser.onDialog('accept')
  await loginWithAdminSession(browser, seed, app)
  await watchCsp(browser)

  // 1. /admin
  await app.open('/admin')
  await waitForHydration(browser)
  await watchCsp(browser)
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 2. /admin/products/new
  await app.open('/admin/products/new')
  await waitForHydration(browser)
  await watchCsp(browser)
  await browser.locator('#product-name').fill('منتج فحص الأمان')
  await browser.locator('#product-model-code').fill('SEC-MODEL-1')
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 3. /admin/content (verify preview iframe)
  await app.open('/admin/content')
  await waitForHydration(browser)
  await watchCsp(browser)
  const previewFrame = browser.locator('iframe[src*="/admin/content/preview"]')
  await expect(previewFrame).toBeVisible()
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 4. /admin/content?tab=guides (open guide editor with rich text editor)
  await app.open('/admin/content?tab=guides')
  await waitForHydration(browser)
  await watchCsp(browser)
  const newGuideBtn = screen.getByRole('button', 'دليل جديد')
  await expect(newGuideBtn).toBeVisible()
  await newGuideBtn.tap()
  await waitForHydration(browser)
  const bodyEditor = screen.getByRole('textbox', 'محتوى الدليل')
  await expect(bodyEditor).toBeVisible()
  await bodyEditor.tap()
  await browser.keyboard.type('تجربة محرر النصوص')
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 5. /admin/reports
  await app.open('/admin/reports')
  await waitForHydration(browser)
  await watchCsp(browser)
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])

  // 6. /admin/settings
  await app.open('/admin/settings')
  await waitForHydration(browser)
  await watchCsp(browser)
  expect(await cspViolations(browser)).toEqual([])
  expect(await brokenImages(browser)).toEqual([])
})
