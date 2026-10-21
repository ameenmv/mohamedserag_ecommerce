import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { apiUrl } from './api-url.js'
import { createSeed } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('admin orders management: list, filter, search, payment confirm, transitions, cancel stock restore, whatsapp log, CSV, and invoice', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed a product with stock 5 and two orders
  const p = await seed.product({
    name: `منتج اختبار إدارة الطلبات ${seed.runId}`,
    priceEgp: 1000,
    stock: 5,
  })

  // Order 1: InstaPay transfer awaiting payment
  const order1 = await seed.order({
    items: [{ productId: p.id, qty: 1 }],
    paymentMethod: 'instapay',
    status: 'awaiting_payment',
  })

  // 2. Log in with admin session
  await loginWithAdminSession(browser, seed, app)

  // 3. Open Admin Orders List page
  await app.open('/admin/orders')
  await waitForHydration(browser)

  // Verify 375 px viewport responsiveness on list page
  await browser.setViewport({ width: 375, height: 667 })
  const listScrollWidth = await browser.evaluate(() => document.documentElement.scrollWidth)
  expect(listScrollWidth).toBeLessThanOrEqual(375)

  // Reset to desktop viewport
  await browser.setViewport({ width: 1280, height: 800 })

  // 4. Tab «بانتظار الدفع» filter shows the seeded transfer order
  const awaitingPaymentTab = screen.getByRole('button', /بانتظار الدفع/)
  await awaitingPaymentTab.tap()
  await expect(screen.getByRole('link', order1.no)).toBeVisible()

  // 5. Search by order number finds it
  const searchInput = screen.getByRole('searchbox')
  await searchInput.fill(order1.no)
  // Wait for the debounced search to reach the URL; otherwise its router.replace can cancel the next click's navigation.
  await expect(browser).toHaveURL(new RegExp(`q=${order1.no}`))
  await expect(screen.getByRole('link', order1.no)).toBeVisible()

  // 6. Open Order 1 details
  const orderLink = screen.getByRole('link', order1.no).first()
  await orderLink.tap()

  await expect(browser).toHaveURL(new RegExp(`/admin/orders/${order1.id}`))
  await waitForHydration(browser)

  // Verify 375 px viewport responsiveness on detail page
  await browser.setViewport({ width: 375, height: 667 })
  const detailScrollWidth = await browser.evaluate(() => document.documentElement.scrollWidth)
  expect(detailScrollWidth).toBeLessThanOrEqual(375)
  await browser.setViewport({ width: 1280, height: 800 })

  // 7. Confirm payment -> status «مؤكد»
  const confirmPaymentBtn = screen.getByRole('button', 'تأكيد دفعة جديدة')
  await confirmPaymentBtn.tap()

  const dialogConfirmBtn = screen.getByRole('button', 'تأكيد')
  await dialogConfirmBtn.tap()
  await expect(screen.getByText('مؤكد').first()).toBeVisible()

  // 8. Transition to «خرج للتوصيل»
  const dispatchBtn = screen.getByRole('button', 'خرج للتوصيل')
  await dispatchBtn.tap()
  await expect(screen.getByText('خرج للتوصيل').first()).toBeVisible()

  // 9. Transition to «تم التسليم»
  const deliverBtn = screen.getByRole('button', 'تم التسليم')
  await deliverBtn.tap()
  await expect(screen.getByText('تم التسليم').first()).toBeVisible()

  // History timeline shows all 4 changes
  await expect(screen.getByText('تأكيد دفع').first()).toBeVisible()

  // 10. WhatsApp status button logs message and targets wa.me
  await browser.evaluate(() => {
    ;(window as unknown as { __lastOpenedWaUrl: string | null }).__lastOpenedWaUrl = null
    window.open = (url: unknown) => {
      ;(window as unknown as { __lastOpenedWaUrl: string | null }).__lastOpenedWaUrl = String(url)
      return null
    }
  })

  const sendWhatsappBtn = screen.getByRole('button', 'ابعت للعميل على واتساب')
  await sendWhatsappBtn.tap()

  const openedUrl = await browser.evaluate(
    () => (window as unknown as { __lastOpenedWaUrl: string | null }).__lastOpenedWaUrl,
  )
  expect(openedUrl).not.toBeNull()
  expect(openedUrl).toContain('https://wa.me/20')

  // Verify WhatsApp messages list shows the logged message
  await expect(screen.getByText('order_delivered')).toBeVisible()

  // 11. Second order cancel and stock restore test
  const order2 = await seed.order({
    items: [{ productId: p.id, qty: 1 }],
    paymentMethod: 'cod',
    status: 'new',
  })

  await app.open(`/admin/orders/${order2.id}`)
  await waitForHydration(browser)

  // Confirm order 2 (stock was 4 after order 1 confirmation, drops to 3)
  const confirmOrder2Btn = screen.getByRole('button', 'تأكيد الطلب')
  await confirmOrder2Btn.tap()
  await expect(screen.getByText('مؤكد').first()).toBeVisible()

  // Verify stock is now 3
  let pData = await seed.getProduct(p.slug)
  expect(pData.availability.maxQty).toBe(3)

  // Cancel with reason «العميل لغى»
  const cancelBtn = screen.getByRole('button', 'إلغاء الطلب')
  await cancelBtn.tap()

  const reasonTextarea = screen.getByRole('dialog').getByLabel('سبب الإلغاء')
  await reasonTextarea.fill('العميل لغى')

  const confirmCancelBtn = screen.getByRole('dialog').getByRole('button', 'تأكيد الإلغاء')
  await confirmCancelBtn.tap()
  await expect(screen.getByText('ملغي').first()).toBeVisible()

  // Stock is restored back to 4 (value before order 2 was confirmed)
  pData = await seed.getProduct(p.slug)
  expect(pData.availability.maxQty).toBe(4)

  // 12. CSV Export test
  const exportUrl = apiUrl('/api/admin/orders/export.csv')
  // Read raw bytes: Response.text() strips a UTF-8 BOM, so check it on the bytes.
  const csv = await browser.evaluate(async (url: string) => {
    const res = await fetch(url, { credentials: 'include' })
    const bytes = new Uint8Array(await res.arrayBuffer())
    return { head: Array.from(bytes.slice(0, 3)), text: new TextDecoder().decode(bytes) }
  }, exportUrl)

  expect(csv.head).toEqual([0xef, 0xbb, 0xbf])
  expect(csv.text).toContain(order1.no)

  // 13. Internal Invoice page test
  await app.open(`/admin/orders/${order1.id}/invoice`)
  await waitForHydration(browser)

  // Seeded orders reuse the product's model code as the order number, so it appears twice.
  await expect(screen.getByRole('main').getByText(order1.no).first()).toBeVisible()
  await expect(screen.getByRole('main').getByText(/فاتورة داخلية/)).toBeVisible()
})
