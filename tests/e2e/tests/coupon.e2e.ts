import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'

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
