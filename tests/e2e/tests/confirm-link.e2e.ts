import { afterEach, test } from '@e2e-dev/web'
import { credentials, expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('admin confirm link: login redirect, reject with reason, WhatsApp link, reload, one-tap confirm under 20s, and stock reduction', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed a product with stock 5 and an InstaPay order with qty 2 (status: awaiting_payment)
  const p = await seed.product({
    name: `منتج تأكيد تحويل ${seed.runId}`,
    priceEgp: 1000,
    stock: 5,
  })

  const order = await seed.order({
    items: [{ productId: p.id, qty: 2 }],
    paymentMethod: 'instapay',
    status: 'awaiting_payment',
  })
  const token = order.confirmToken

  // a) Open /admin/confirm/<token> with NO session -> redirects to login with ?next=
  await app.open(`/admin/confirm/${token}`)
  await expect(browser).toHaveURL(/\/admin\/login\?next=/)

  // Log in through the UI with admin credentials
  const admin = credentials.user('admin')
  await screen.getByLabel('البريد الإلكتروني').fill(admin.username)
  await screen.getByLabel('كلمة المرور').fill(admin.password)
  await screen.getByRole('button', 'دخول').tap()

  // Lands back on /admin/confirm/<token>
  await expect(browser).toHaveURL(new RegExp(`/admin/confirm/${token}`))
  await waitForHydration(browser)

  // d) Verify 320 px viewport responsiveness on confirm page (SC-006)
  await browser.setViewport({ width: 320, height: 600 })
  const scrollWidth = await browser.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(320)

  // Reset viewport to desktop
  await browser.setViewport({ width: 1280, height: 800 })

  // b) Reject with reason «الصورة مش واضحة»
  await screen.getByRole('button', 'رفض').tap()
  const reasonInput = browser.locator('#reject-reason')
  await reasonInput.fill('الصورة مش واضحة')
  await screen.getByRole('button', 'تأكيد الرفض').tap()

  // Assert rejected state «اترفض الدفع» and WhatsApp link containing wa.me
  await expect(screen.getByText('اترفض الدفع')).toBeVisible()
  const waBtn = screen.getByRole('link', 'ابعت للعميل على واتساب')
  await expect(waBtn).toBeVisible()
  const waHref = await waBtn.getAttribute('href')
  expect(waHref).not.toBeNull()
  expect(waHref).toContain('wa.me')

  // Reload -> status «الدفع مرفوض» and actions available again
  await app.open(`/admin/confirm/${token}`)
  await waitForHydration(browser)
  await expect(screen.getByText('الدفع مرفوض')).toBeVisible()

  const confirmBtn = screen.getByRole('button', 'تأكيد الدفع')
  await expect(confirmBtn).toBeVisible()

  // c) Timing budget (SC-003): ready to «اتأكد الدفع» state < 20s with 1 tap
  const startTime = Date.now()
  await confirmBtn.tap()

  // Assert success state «اتأكد الدفع»
  await expect(screen.getByText('اتأكد الدفع')).toBeVisible()
  const durationMs = Date.now() - startTime
  expect(durationMs).toBeLessThan(20_000)

  // Verify stock is now 3 (5 initial - 2 ordered/confirmed) via catalog endpoint
  const productData = await seed.getProduct(p.slug)
  expect(productData.availability.maxQty).toBe(3)
})
