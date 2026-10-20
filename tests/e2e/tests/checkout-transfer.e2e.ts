import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { ensureStoreContact } from './support/store-contact.js'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('guest checkout InstaPay transfer: place order through UI, verify account and WhatsApp proof link with confirm URL', async ({
  app,
  screen,
  browser,
}) => {
  // WhatsApp links only render once the store numbers are real
  await ensureStoreContact(seed)
  // 1. Seed product
  const p = await seed.product({
    name: `تلفزيون اختبار إنستاباي ${seed.runId}`,
    priceEgp: 5000,
    stock: 5,
  })

  // 2. Add product to cart from product page
  await app.open(`/p/${p.slug}`)
  await waitForHydration(browser)
  const addToCartBtn = browser.locator('#main-add-to-cart-button')
  await addToCartBtn.tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  // 3. Open checkout
  await app.open('/checkout')
  await waitForHydration(browser)

  // 4. Fill customer details
  await browser.locator('#checkout-name').fill('أحمد سراج')
  await browser.locator('#checkout-phone').fill('01012345678')
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('المنصورة')
  await browser.locator('#checkout-address').fill('شارع المشاية السفلية')

  // 5. Select InstaPay payment method
  // The radio input is visually hidden inside its card; tap the visible card (label) instead.
  await browser.locator('[role="radiogroup"] label').filter({ hasText: 'إنستا باي' }).tap()
  await expect(browser.locator('input[type="radio"][value="instapay"]')).toBeChecked()

  // 6. Place order
  const placeOrderBtn = screen.getByRole('button', 'تأكيد الطلب').first()
  await placeOrderBtn.tap()

  // 7. Verify thank-you page URL
  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)

  const thanksUrl = await browser.evaluate(() => window.location.href)
  const match = thanksUrl.match(/\/order\/(SR-\d{4}-\d{6})\/thanks\?t=([^&]+)/)
  expect(match).not.toBeNull()
  const orderNo = match![1]!

  // 8. Assert account serag@instapay is visible
  await expect(screen.getByText('serag@instapay')).toBeVisible()

  // 9. Assert WhatsApp proof link exists, starts with https://wa.me/, and decoded contains orderNo & /admin/confirm/
  const waProofLink = screen.getByRole('link', 'ابعت إثبات التحويل على واتساب')
  await expect(waProofLink).toBeVisible()

  const href = await waProofLink.getAttribute('href')
  expect(href).not.toBeNull()
  expect(href).toMatch(/^https:\/\/wa\.me\//)

  const decodedHref = decodeURIComponent(href!)
  expect(decodedHref).toContain(orderNo)
  expect(decodedHref).toContain('/admin/confirm/')
})
