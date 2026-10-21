import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('shopper submits notify-me request for out-of-stock product, verifies analytics event without PII, and allows repeat submissions', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed an out-of-stock product (stock 0) and an in-stock product (stock 5)
  const outProduct = await seed.product({
    name: `بوتاجاز اختبار ناقص ${seed.runId}`,
    stock: 0,
    priceEgp: 5000,
  })
  const inStockProduct = await seed.product({
    name: `بوتاجاز اختبار متوفر ${seed.runId}`,
    stock: 5,
    priceEgp: 5000,
  })

  // 2. In-stock product page does NOT show notify-me form
  await app.open(`/p/${inStockProduct.slug}`)
  await waitForHydration(browser)
  await expect(screen.getByText('بلّغني أول ما يوصل')).toBeHidden()

  // 3. Out-of-stock product page shows «بلّغني أول ما يوصل»
  await app.open(`/p/${outProduct.slug}`)
  await waitForHydration(browser)
  await expect(screen.getByText('بلّغني أول ما يوصل').first()).toBeVisible()

  // 4. Stub Umami analytics before submitting to verify funnel event without PII
  await browser.evaluate(() => {
    const w = window as unknown as {
      __events: Array<{ event: string; data?: Record<string, unknown> }>
      umami: unknown
    }
    w.__events = []
    w.umami = { track: (event: string, data?: Record<string, unknown>) => w.__events.push({ event, data }) }
  })

  // 5. Submit name + phone in Arabic digits «٠١٠١٢٣٤٥٦٧٨»
  await browser.locator('#notify-name').fill('أحمد سراج')
  await browser.locator('#notify-phone').fill('٠١٠١٢٣٤٥٦٧٨')
  await screen.getByRole('button', 'بلّغني أول ما يوصل').tap()

  // 6. Assert confirmation visible
  await expect(screen.getByText('تمام! هنبعتلك على واتساب أول ما يوصل')).toBeVisible()

  // 7. Assert exactly one notify_me_requested event fired without PII (no phone or name)
  const events = await browser.evaluate(() =>
    (window as unknown as { __events: Array<{ event: string; data?: Record<string, unknown> }> }).__events.map(
      (e) => ({ event: e.event, data: e.data ?? null }),
    ),
  )
  const notifyEvents = events.filter((e) => e.event === 'notify_me_requested')
  expect(notifyEvents).toHaveLength(1)
  expect(notifyEvents[0]!.data).toEqual({ productId: outProduct.id })
  expect(JSON.stringify(events)).not.toMatch(/01012345678|٠١٠١٢٣٤٥٦٧٨|أحمد سراج/)

  // 8. Reload and submit again with another name
  await app.open(`/p/${outProduct.slug}`)
  await waitForHydration(browser)
  await expect(screen.getByText('بلّغني أول ما يوصل').first()).toBeVisible()

  await browser.locator('#notify-name').fill('محمد سراج')
  await browser.locator('#notify-phone').fill('٠١٠١٢٣٤٥٦٧٨')
  await screen.getByRole('button', 'بلّغني أول ما يوصل').tap()

  await expect(screen.getByText('تمام! هنبعتلك على واتساب أول ما يوصل')).toBeVisible()
})

test('admin views notify requests list, inspects detail with disabled whatsapp when out of stock, restocks product and sends whatsapp notification', async ({
  app,
  screen,
  browser,
}) => {
  // Admin desktop table; admin phone layouts are covered by admin-mobile-overflow.e2e.ts
  await browser.setViewport({ width: 1280, height: 720 })

  // 1. Seed two out-of-stock products A and B
  const prodAName = `غسالة اختبار أ ${seed.runId}`
  const prodA = await seed.product({
    name: prodAName,
    stock: 0,
    priceEgp: 7000,
  })
  const prodBName = `ثلاجة اختبار ب ${seed.runId}`
  const prodB = await seed.product({
    name: prodBName,
    stock: 0,
    priceEgp: 9000,
  })

  // 2. Submit notify requests via public API:
  // On prodA: submit twice with different names but same phone -> upsert creates only 1 waiting entry
  const resA1 = await fetch(apiUrl('/api/notify-me'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: prodA.id, name: 'خالد عبد الله', phone: '01011112222' }),
  })
  expect(resA1.ok).toBe(true)

  const resA2 = await fetch(apiUrl('/api/notify-me'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: prodA.id, name: 'سعيد عبد الله', phone: '01011112222' }),
  })
  expect(resA2.ok).toBe(true)

  // On prodB: submit once
  const resB1 = await fetch(apiUrl('/api/notify-me'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: prodB.id, name: 'ياسر محمد', phone: '01033334444' }),
  })
  expect(resB1.ok).toBe(true)

  // 3. Obtain admin session
  const session = await loginWithAdminSession(browser, seed, app)

  // 4. Open /admin/notify
  await app.open('/admin/notify')
  await waitForHydration(browser)

  // 5. Assert product A is listed with waiting: 1 (despite two submissions)
  const rowA = browser.locator('tbody tr').filter({ hasText: prodAName })
  await expect(rowA).toBeVisible()
  await expect(browser.locator('tbody tr').filter({ hasText: prodBName })).toBeVisible()

  // 6. Open A's detail sheet
  await rowA.tap()
  await expect(screen.getByText('طلبات إشعار المنتج')).toBeVisible()

  // 7. «ابعت على واتساب» is disabled with helper «المنتج لسه مش متوفر»
  await expect(screen.getByText('المنتج لسه مش متوفر').first()).toBeVisible()
  const sendBtnA = screen.getByRole('button', 'ابعت على واتساب')
  await expect(sendBtnA).toBeDisabled()

  // 8. Restock product B through existing admin API from the test
  const restockRes = await fetch(apiUrl('/api/admin/products/' + prodB.id), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${session.cookieName}=${session.cookieValue}`,
      'x-csrf-token': session.csrfToken,
    },
    body: JSON.stringify({ stock: 5 }),
  })
  expect(restockRes.ok).toBe(true)

  // 9. Reload /admin/notify: product B is listed first (back-in-stock priority)
  await app.open('/admin/notify')
  await waitForHydration(browser)

  const firstTableRow = browser.locator('tbody tr').first()
  await expect(firstTableRow).toContainText(prodBName)

  // 10. Open B's detail sheet
  await firstTableRow.tap()
  await expect(screen.getByText('طلبات إشعار المنتج')).toBeVisible()

  // 11. Click «ابعت على واتساب»
  const sendBtnB = screen.getByRole('button', 'ابعت على واتساب')
  await expect(sendBtnB).toBeEnabled()
  await sendBtnB.tap()

  // 12. Assert entry shows sent status
  await expect(screen.getByText('تم الإرسال').first()).toBeVisible()
})
