import { afterEach, test, type Browser } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'
import { apiUrl } from './api-url.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('coupon discount on eligible items only, reflects in total, and records discount on order completion', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed a fridge (6,000 EGP, stock 5, refrigerators category)
  const fridge = await seed.product({
    name: `ثلاجة كود ${seed.runId}`,
    categorySlug: 'refrigerators',
    priceEgp: 6000,
    stock: 5,
  })

  // 2. Seed a washer with old-price discount (4,000 EGP, oldPrice 5,000 EGP, stock 5, washers category)
  const washer = await seed.product({
    name: `غسالة كود ${seed.runId}`,
    categorySlug: 'washers',
    priceEgp: 4000,
    oldPriceEgp: 5000,
    stock: 5,
  })

  // 3. Seed a 10% coupon with minOrderEgp: 5000 and categorySlugs: ['refrigerators']
  const coupon = await seed.coupon({
    type: 'percent',
    value: 10,
    minOrderEgp: 5000,
    categorySlugs: ['refrigerators'],
  })

  // 4. Add fridge to cart from its product page
  await app.open(`/p/${fridge.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  // 5. Add washer to cart from its product page
  await app.open(`/p/${washer.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*2/)).toBeVisible()

  // 6. Open /checkout
  await app.open('/checkout')
  await waitForHydration(browser)

  // 7. Fill the Talkha/Dakahlia form like checkout-cod.e2e.ts
  await browser.locator('#checkout-name').fill('محمود أحمد سراج')
  await browser.locator('#checkout-phone').fill('01012345678')
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('طلخا')
  await browser.locator('#checkout-address').fill('شارع البحر بجوار كوبري طلخا')
  await expect(screen.getByText('100 ج.م').first()).toBeVisible()
  await browser.locator('input[type="radio"][value="cod"]').check()

  // 8. Open coupon box, type the code, apply
  await screen.getByText('عندك كود خصم؟').tap()
  const couponInput = browser.locator('#checkout-coupon')
  await expect(couponInput).toBeVisible()
  await couponInput.fill(coupon.code)
  await screen.getByRole('button', 'تطبيق').tap()

  // 9. See «تم تطبيق الكود» and the discount 600 (assert text 600), total reflects it
  await expect(screen.getByText(/تم تطبيق الكود/)).toBeVisible()
  // 6,000 + 4,000 + 100 delivery − 600 (10% of the fridge only)
  await expect(screen.getByText('-600 ج.م').first()).toBeVisible()
  await expect(screen.getByText('9,500 ج.م').first()).toBeVisible()

  // 10. Place order (COD)
  const placeOrderBtn = screen.getByRole('button', 'تأكيد الطلب').first()
  await placeOrderBtn.tap()

  // 11. Thank-you page shows the discount line (-600)
  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)
  await expect(screen.getByText('-600 ج.م').first()).toBeVisible()
})

test('coupon refusals (unknown code, min order requirement) and remove applied coupon', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed a 6,000 EGP product
  const product = await seed.product({
    name: `ثلاجة تجربة ${seed.runId}`,
    priceEgp: 6000,
    stock: 5,
  })

  // 2. Add product to cart
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  // 3. Open /checkout
  await app.open('/checkout')
  await waitForHydration(browser)

  // 4. Open coupon box
  await screen.getByText('عندك كود خصم؟').tap()
  const couponInput = browser.locator('#checkout-coupon')
  await expect(couponInput).toBeVisible()

  // 5. Type an unknown code -> «الكود ده مش موجود»
  await couponInput.fill(`NOPE-${seed.runId}`)
  await screen.getByRole('button', 'تطبيق').tap()
  await expect(screen.getByText('الكود ده مش موجود')).toBeVisible()

  // 6. Seed a coupon with minOrderEgp: 50000 and test min_order refusal
  const highMinCoupon = await seed.coupon({
    type: 'fixed',
    value: 500,
    minOrderEgp: 50000,
  })

  await couponInput.fill(highMinCoupon.code)
  await screen.getByRole('button', 'تطبيق').tap()
  await expect(screen.getByText(/الحد الأدنى للطلب/)).toBeVisible()

  // 7. Seed a valid coupon -> applied
  const validCoupon = await seed.coupon({
    type: 'fixed',
    value: 500,
    minOrderEgp: 1000,
  })

  await couponInput.fill(validCoupon.code)
  await screen.getByRole('button', 'تطبيق').tap()
  await expect(screen.getByText(/تم تطبيق الكود/)).toBeVisible()
  await expect(screen.getByText(/-500/).first()).toBeVisible()

  // 8. Remove coupon -> «إزالة الكود» -> discount line gone
  const removeBtn = screen.getByRole('button', /إزالة الكود/)
  await removeBtn.tap()
  await expect(screen.getByText(/-500/)).toBeHidden()
  await expect(browser.locator('#checkout-coupon')).toBeVisible()
})

type TrackedEvent = { event: string; data?: Record<string, unknown> }

async function fillTalkhaCheckout(browser: Browser, phone: string): Promise<void> {
  await browser.locator('#checkout-name').fill('محمود أحمد سراج')
  await browser.locator('#checkout-phone').fill(phone)
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('طلخا')
  await browser.locator('#checkout-address').fill('شارع البحر بجوار كوبري طلخا')
}

test('coupon taken by another order during checkout: 409 clears the code, totals drop the discount, and the retry places the order', async ({
  app,
  screen,
  browser,
}) => {
  const product = await seed.product({ name: `ثلاجة حد الكود ${seed.runId}`, priceEgp: 6000, stock: 5 })
  const coupon = await seed.coupon({ type: 'fixed', value: 500, maxUses: 1 })

  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  await app.open('/checkout')
  await waitForHydration(browser)
  await fillTalkhaCheckout(browser, '01012345678')
  await expect(screen.getByText('100 ج.م').first()).toBeVisible()
  await browser.locator('input[type="radio"][value="cod"]').check()

  await screen.getByText('عندك كود خصم؟').tap()
  await browser.locator('#checkout-coupon').fill(coupon.code)
  await screen.getByRole('button', 'تطبيق').tap()
  await expect(screen.getByText(/تم تطبيق الكود/)).toBeVisible()
  await expect(screen.getByText('5,600 ج.م').first()).toBeVisible()

  // Another shopper uses the last redemption while this checkout is still open.
  const items = [{ productId: product.id, qty: 1 }]
  const quoteRes = await fetch(apiUrl('/api/cart/quote'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, governorate: 'الدقهلية', city: 'طلخا', paymentMethod: 'cod', couponCode: coupon.code }),
  })
  expect(quoteRes.ok).toBe(true)
  const quote = (await quoteRes.json()) as { total: number }
  const orderRes = await fetch(apiUrl('/api/orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items,
      customer: { name: 'منافس اختبار', phone: '01198765432', governorate: 'الدقهلية', city: 'طلخا', address: 'شارع الجيش عمارة 5' },
      paymentMethod: 'cod',
      couponCode: coupon.code,
      idempotencyKey: `e2e-race-${seed.runId}-0000`,
      expectedTotal: quote.total,
    }),
  })
  expect(orderRes.status).toBe(201)

  // This shopper's order is refused: the code is cleared and totals re-quoted without it.
  await screen.getByRole('button', 'تأكيد الطلب').first().tap()
  await expect(screen.getByText('الكود ده خلص').first()).toBeVisible()
  await expect(browser).toHaveURL(/\/checkout$/)
  await expect(browser.locator('#checkout-coupon')).toHaveValue('')
  await expect(screen.getByText('-500 ج.م')).toBeHidden()
  await expect(screen.getByText('6,100 ج.م').first()).toBeVisible()

  // Retrying places the order at the full price.
  await screen.getByRole('button', 'تأكيد الطلب').first().tap()
  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)
  await expect(screen.getByText('6,100 ج.م').first()).toBeVisible()
  await expect(screen.getByText('-500 ج.م')).toBeHidden()
})

test('coupon_applied fires once per code with only code and discount', async ({ app, screen, browser }) => {
  const product = await seed.product({ name: `ثلاجة حدث الكود ${seed.runId}`, priceEgp: 6000, stock: 5 })
  const coupon = await seed.coupon({ type: 'fixed', value: 500 })

  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  await app.open('/checkout')
  await waitForHydration(browser)
  await browser.evaluate(() => {
    const w = window as unknown as { __events: TrackedEvent[]; umami: unknown }
    w.__events = []
    w.umami = { track: (event: string, data?: Record<string, unknown>) => w.__events.push({ event, data }) }
  })

  await fillTalkhaCheckout(browser, '01055554444')
  await screen.getByText('عندك كود خصم؟').tap()

  // Apply, remove, apply the same code again: still one event.
  await browser.locator('#checkout-coupon').fill(coupon.code)
  await screen.getByRole('button', 'تطبيق').tap()
  await expect(screen.getByText(/تم تطبيق الكود/)).toBeVisible()
  await screen.getByRole('button', /إزالة الكود/).tap()
  await expect(browser.locator('#checkout-coupon')).toBeVisible()
  await browser.locator('#checkout-coupon').fill(coupon.code)
  await screen.getByRole('button', 'تطبيق').tap()
  await expect(screen.getByText(/تم تطبيق الكود/)).toBeVisible()

  const events = await browser.evaluate(() =>
    (window as unknown as { __events: TrackedEvent[] }).__events.map((e) => ({ event: e.event, data: e.data ?? null })),
  )
  const applied = events.filter((e) => e.event === 'coupon_applied')
  expect(applied).toHaveLength(1)
  expect(applied[0]!.data).toEqual({ code: coupon.code, discount: 50_000 })
  expect(JSON.stringify(events)).not.toMatch(/01055554444|محمود/)
})
