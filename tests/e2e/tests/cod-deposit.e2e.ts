import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('large COD order requires 10% deposit: checkout explains deposit, thank-you shows deposit transfer block, and admin confirms deposit via confirm link', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed high-priced product (35,000 EGP, above 30,000 EGP COD deposit threshold)
  const p = await seed.product({
    name: `ثلاجة فاخرة اختبار عربون ${seed.runId}`,
    priceEgp: 35000,
    stock: 2,
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

  // 4. Fill customer details (Mansoura / Dakahlia)
  await browser.locator('#checkout-name').fill('سراج الدين محمد')
  await browser.locator('#checkout-phone').fill('01012345678')
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('المنصورة')
  await browser.locator('#checkout-address').fill('شارع المشاية السفلية أمام الجامعة')

  // 5. Select COD payment method
  const codRadio = browser.locator('input[type="radio"][value="cod"]')
  await codRadio.check()

  // 6. Assert deposit notice shows «عربون 10%» and 3,510 ج.م (35,000 product + 100 delivery fee = 35,100; 10% = 3,510)
  await expect(screen.getByText(/عربون\s*10%/)).toBeVisible()
  await expect(screen.getByText(/3,510\s*ج\.م/)).toBeVisible()

  // 7. Place order
  const placeOrderBtn = screen.getByRole('button', 'تأكيد الطلب').first()
  await placeOrderBtn.tap()

  // 8. Wait for thank-you page
  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)

  // 9. Assert thank-you page displays deposit transfer block and WhatsApp proof button
  const waProofLink = screen.getByRole('link', 'ابعت إثبات التحويل على واتساب')
  await expect(waProofLink).toBeVisible()

  // Read confirmToken from WhatsApp link href
  const href = await waProofLink.getAttribute('href')
  expect(href).not.toBeNull()
  const decodedHref = decodeURIComponent(href!)
  const match = decodedHref.match(/\/admin\/confirm\/([a-zA-Z0-9_-]+)/)
  expect(match).not.toBeNull()
  const confirmToken = match![1]!

  // 10. Inject admin session cookie to open admin confirm link
  await loginWithAdminSession(browser, seed, app)

  // 11. Open confirm link in browser
  await app.open(`/admin/confirm/${confirmToken}`)
  await waitForHydration(browser)

  // 12. Assert expected amount equals the deposit (3,510 EGP prefilled in amount input)
  const amountInput = browser.locator('#confirm-amount')
  await expect(amountInput).toBeVisible()
  const val = await amountInput.inputValue()
  expect(val.replace(/,/g, '')).toBe('3510')

  // 13. Confirm deposit
  const confirmBtn = screen.getByRole('button', 'تأكيد الدفع')
  await confirmBtn.tap()

  // 14. Assert «اتأكد الدفع» and remaining amount = total − deposit = 31,590 ج.م
  await expect(screen.getByText('اتأكد الدفع')).toBeVisible()
  await expect(screen.getByText(/31,590\s*ج\.م/)).toBeVisible()
})
