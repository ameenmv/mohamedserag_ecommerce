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
