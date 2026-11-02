import { afterEach, test } from '@e2e-dev/web'
import { credentials, expect } from 'e2e'
import { ensureStoreContact } from './support/store-contact.js'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'
import { apiUrl } from './api-url.js'
import { BRIDAL_SKIP } from './support/features.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('bridal reserve flow: create list, fill reserve form, thanks page, read-only list with awaiting deposit, partial confirm, and full confirm price lock', { skip: BRIDAL_SKIP }, async ({
  app,
  screen,
  browser,
}) => {
  // WhatsApp links only render once the store numbers are real
  await ensureStoreContact(seed)
  // Mobile viewport 375 px
  await browser.setViewport({ width: 375, height: 667 })

  // 1. Seed a product
  const p = await seed.product({
    name: `غسالة حجز عرايس ${seed.runId}`,
    priceEgp: 10000,
    stock: 5,
  })

  // 2. Create list via API with seeded product
  const createRes = await fetch(apiUrl('/api/bridal/lists'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: p.id }),
  })
  expect(createRes.status).toBe(201)
  const { editToken } = (await createRes.json()) as { editToken: string }

  // 3. Open edit page
  await app.open(`/bridal/${editToken}`)
  await waitForHydration(browser)

  // 4. Tap «احجزي بعربون»
  const reserveBtn = browser.locator('#bridal-reserve-button')
  await expect(reserveBtn).toBeVisible()
  await expect(reserveBtn).toBeEnabled()
  await reserveBtn.tap()

  // 5. Reserve sheet opens: fill form
  await expect(screen.getByText('حجز جهاز العروسة')).toBeVisible()

  await browser.locator('#checkout-name').fill('ندى أحمد')
  await browser.locator('#checkout-phone').fill('01012345678')
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('المنصورة')
  await browser.locator('#checkout-address').fill('شارع المشاية السفلية')

  // Select InstaPay payment method
  await browser.locator('[role="radiogroup"] label').filter({ hasText: 'إنستا باي' }).tap()
  await expect(browser.locator('input[type="radio"][value="instapay"]')).toBeChecked()

  // 6. Deposit quote is displayed (debounced live quote)
  await expect(screen.getByText(/العربون المطلوب/)).toBeVisible()

  // 7. Tap «تأكيد الحجز»
  const submitBtn = browser.locator('#bridal-reserve-submit-button')
  await expect(submitBtn).toBeEnabled()
  await submitBtn.tap()

  // 8. Thank-you page shows reservation number and deposit
  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)
  await waitForHydration(browser)

  await expect(screen.getByRole('heading', 'تم حجز جهازك')).toBeVisible()

  const thanksUrl = await browser.evaluate(() => window.location.href)
  const match = thanksUrl.match(/\/order\/(SR-\d{4}-\d{6})\/thanks\?t=([^&]+)/)
  expect(match).not.toBeNull()
  const orderNo = match![1]!

  await expect(screen.getByText(orderNo)).toBeVisible()
  await expect(screen.getByText(/عربون مطلوب/)).toBeVisible()

  // Extract confirmToken from WhatsApp proof link
  const waProofLink = screen.getByRole('link', 'ابعت إثبات التحويل على واتساب')
  await expect(waProofLink).toBeVisible()
  const href = await waProofLink.getAttribute('href')
  expect(href).not.toBeNull()
  const decodedHref = decodeURIComponent(href!)
  const tokenMatch = decodedHref.match(/\/admin\/confirm\/([a-zA-Z0-9_-]+)/)
  expect(tokenMatch).not.toBeNull()
  const confirmToken = tokenMatch![1]!

  // 9. Reopen the edit link → read-only with «بانتظار العربون»
  await app.open(`/bridal/${editToken}`)
  await waitForHydration(browser)
  await expect(screen.getByText(/بانتظار العربون/)).toBeVisible()
  await expect(browser.locator('#bridal-reserve-button')).toBeHidden()

  // 10. As admin open /admin/confirm/<confirmToken>
  await app.open(`/admin/confirm/${confirmToken}`)

  // Log in if redirected to login page
  const currentUrl = await browser.evaluate(() => window.location.href)
  if (currentUrl.includes('/admin/login')) {
    const admin = credentials.user('admin')
    await screen.getByLabel('البريد الإلكتروني').fill(admin.username)
    await screen.getByLabel('كلمة المرور').fill(admin.password)
    await screen.getByRole('button', 'دخول').tap()
    await expect(browser).toHaveURL(new RegExp(`/admin/confirm/${confirmToken}`))
    await waitForHydration(browser)
  }

  // 11. Confirm an amount smaller than the deposit (e.g. 500 EGP)
  const amountInput = browser.locator('#confirm-amount')
  await amountInput.fill('500')
  const confirmPaymentBtn = screen.getByRole('button', 'تأكيد الدفع')
  await confirmPaymentBtn.tap()

  // 12. Assert «فاضل …» is shown
  await expect(screen.getByText(/فاضل/)).toBeVisible()

  // 13. Confirm the rest
  await confirmPaymentBtn.tap()

  // 14. Assert «الأسعار اتثبتت لحد …» is shown
  await expect(screen.getByText(/الأسعار اتثبتت لحد/)).toBeVisible()
})
