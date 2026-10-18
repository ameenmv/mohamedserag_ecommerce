import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('guest checkout COD end-to-end: add two products, fill Talkha address, place order under 90s, and verify wrong token', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed two in-stock products
  const p1 = await seed.product({
    name: `ثلاجة اختبار كود ${seed.runId}`,
    priceEgp: 6000,
    stock: 8,
  })
  const p2 = await seed.product({
    name: `غسالة اختبار كود ${seed.runId}`,
    priceEgp: 4000,
    stock: 5,
  })

  // Start checkout timing budget (SC-001 < 90 seconds from opening product page to thank you)
  const startTime = Date.now()

  // 2. Add first product to cart from its product page
  await app.open(`/p/${p1.slug}`)
  await waitForHydration(browser)
  const addToCart1 = browser.locator('#main-add-to-cart-button')
  await addToCart1.tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  // 3. Add second product to cart from its product page
  await app.open(`/p/${p2.slug}`)
  await waitForHydration(browser)
  const addToCart2 = browser.locator('#main-add-to-cart-button')
  await addToCart2.tap()
  await expect(screen.getByRole('link', /السلة:\s*2/)).toBeVisible()

  // 4. Verify 320 px viewport responsiveness on /checkout with non-empty cart (SC-006)
  await browser.setViewport({ width: 320, height: 600 })
  await app.open('/checkout')
  await waitForHydration(browser)

  const scrollWidth = await browser.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(320)

  // Switch back to desktop viewport for form interaction
  await browser.setViewport({ width: 1280, height: 800 })
  await app.open('/checkout')
  await waitForHydration(browser)

  // 5. Fill checkout form with Talkha / Dakahlia
  const nameInput = browser.locator('#checkout-name')
  await nameInput.fill('محمود أحمد سراج')

  const phoneInput = browser.locator('#checkout-phone')
  await phoneInput.fill('01012345678')

  const govSelect = browser.locator('#checkout-governorate')
  await govSelect.selectOption('الدقهلية')

  const cityInput = browser.locator('#checkout-city')
  await cityInput.fill('طلخا')

  const addressInput = browser.locator('#checkout-address')
  await addressInput.fill('شارع البحر بجوار كوبري طلخا')

  // 6. Verify delivery fee updates to 100 ج.م (Mansoura/Talkha zone fee: 10,000 piastres)
  await expect(screen.getByText('100 ج.م').first()).toBeVisible()

  // 7. Choose Cash On Delivery («الدفع عند الاستلام»)
  const codRadio = browser.locator('input[type="radio"][value="cod"]')
  await codRadio.check()

  // 8. Place order
  const placeOrderBtn = screen.getByRole('button', 'تأكيد الطلب').first()
  await placeOrderBtn.tap()

  // 9. URL matches /order/SR-\d{4}-\d{6}/thanks\?t=
  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)

  const thanksUrl = await browser.evaluate(() => window.location.href)
  const match = thanksUrl.match(/\/order\/(SR-\d{4}-\d{6})\/thanks\?t=([^&]+)/)
  expect(match).not.toBeNull()
  const orderNo = match![1]!

  // 10. Assert «هنكلمك نأكد الطلب» visible for COD order
  await expect(screen.getByText('هنكلمك نأكد الطلب')).toBeVisible()

  // 11. Assert header cart badge is gone (cart cleared)
  await expect(screen.getByRole('link', /السلة:\s*[1-9]/)).toBeHidden()

  // 12. Assert timing budget is under 90 seconds
  const durationMs = Date.now() - startTime
  expect(durationMs).toBeLessThan(90_000)

  // 13. Test wrong public token shows neutral invalid state and NOT the order number
  await app.open(`/order/${orderNo}/thanks?t=wrong`)
  await waitForHydration(browser)
  await expect(screen.getByText('الرابط ده مش صحيح أو انتهى')).toBeVisible()
  await expect(screen.getByText(orderNo)).toBeHidden()
})

test('funnel events: checkout_start and order_placed fire once each without personal data', async ({
  app,
  screen,
  browser,
}) => {
  const p = await seed.product({ name: `منتج قياس ${seed.runId}`, priceEgp: 3000, stock: 4 })

  await app.open(`/p/${p.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  // Stub the analytics tracker; client-side navigation below keeps it alive.
  await browser.evaluate(() => {
    const w = window as unknown as { __events: Array<{ event: string; data?: Record<string, unknown> }>; umami: unknown }
    w.__events = []
    w.umami = { track: (event: string, data?: Record<string, unknown>) => w.__events.push({ event, data }) }
  })

  // Header cart opens the drawer; «كمّل الطلب» goes to /checkout without a reload.
  await screen.getByRole('link', /السلة:\s*1/).tap()
  await screen.getByRole('dialog').getByRole('link', /كمّل الطلب/).tap()
  await expect(browser).toHaveURL(/\/checkout$/)
  await waitForHydration(browser)

  await browser.locator('#checkout-name').fill('سارة محمود اختبار')
  await browser.locator('#checkout-phone').fill('01098765432')
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('المنصورة')
  await browser.locator('#checkout-address').fill('شارع الجمهورية عمارة 3')
  await expect(screen.getByText('100 ج.م').first()).toBeVisible()
  await screen.getByRole('button', 'تأكيد الطلب').first().tap()
  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)

  // evaluate() results must be JSON-safe, so events without data report null.
  const events = await browser.evaluate(() =>
    (window as unknown as { __events: Array<{ event: string; data?: Record<string, unknown> }> }).__events.map(
      (e) => ({ event: e.event, data: e.data ?? null }),
    ),
  )
  expect(events.filter((e) => e.event === 'checkout_start')).toHaveLength(1)
  const placed = events.filter((e) => e.event === 'order_placed')
  expect(placed).toHaveLength(1)
  expect(Object.keys(placed[0]!.data ?? {}).sort()).toEqual(['itemCount', 'total'])
  expect(JSON.stringify(events)).not.toMatch(/01098765432|سارة/)
})
