import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { apiUrl } from './api-url.js'
import { createSeed, type SeedAdminSessionResult, type SeedHelper } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { BRIDAL_SKIP } from './support/features.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

/**
 * Returns a Cairo ISO date string (YYYY-MM-DD) offset by `offsetDays` from current Cairo time.
 */
function getCairoDateStr(offsetDays = 0): string {
  const target = new Date(Date.now() + offsetDays * 86_400_000)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(target)
  let year = ''
  let month = ''
  let day = ''
  for (const p of parts) {
    if (p.type === 'year') year = p.value
    if (p.type === 'month') month = p.value
    if (p.type === 'day') day = p.value
  }
  return `${year}-${month}-${day}`
}

interface SeededBridalReservation {
  orderNo: string
  orderId: string
  listShareToken: string
}

/**
 * Helper to seed a product, build a bridal list via public API, reserve it,
 * find the order in admin, and confirm the deposit via the admin confirm API
 * so the reservation enters the 'locked' bridal status.
 */
async function createAndLockReservation(
  seedHelper: SeedHelper,
  adminSession: SeedAdminSessionResult,
  opts?: { name?: string; priceEgp?: number },
): Promise<SeededBridalReservation> {
  // 1. Seed a product with sufficient stock
  const p = await seedHelper.product({
    name: opts?.name ?? `غسالة حجز جهاز عروسة ${seedHelper.runId}`,
    priceEgp: opts?.priceEgp ?? 10000,
    stock: 10,
  })

  // 2. Create list via public API
  const createRes = await fetch(apiUrl('/api/bridal/lists'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: p.id }),
  })
  if (!createRes.ok) {
    throw new Error(`Failed to create bridal list (${createRes.status}): ${await createRes.text()}`)
  }
  const { editToken } = (await createRes.json()) as { editToken: string }

  // 3. Get list details to extract shareToken
  const listRes = await fetch(apiUrl(`/api/bridal/lists/${editToken}`))
  if (!listRes.ok) {
    throw new Error(`Failed to read bridal list (${listRes.status}): ${await listRes.text()}`)
  }
  const listView = (await listRes.json()) as { shareToken: string }

  // 4. Request reserve quote
  const quoteRes = await fetch(
    apiUrl(
      `/api/bridal/reserve-quote/${editToken}?governorate=${encodeURIComponent('الدقهلية')}&city=${encodeURIComponent('المنصورة')}`,
    ),
  )
  if (!quoteRes.ok) {
    throw new Error(`Failed to get reserve quote (${quoteRes.status}): ${await quoteRes.text()}`)
  }
  const quote = (await quoteRes.json()) as { total: number; depositAmount: number }

  // 5. Submit reservation
  const reserveRes = await fetch(apiUrl(`/api/bridal/lists/${editToken}/reserve`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        name: `عروسة تجريبية ${seedHelper.runId}`,
        phone: '01012345678',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        address: 'شارع المشاية السفلية',
      },
      paymentMethod: 'instapay',
      idempotencyKey: crypto.randomUUID(),
      expectedTotal: quote.total,
    }),
  })
  if (!reserveRes.ok) {
    throw new Error(`Failed to reserve bridal list (${reserveRes.status}): ${await reserveRes.text()}`)
  }
  const { orderNo } = (await reserveRes.json()) as { orderNo: string; publicToken: string }

  // 6. Look up order id via admin list endpoint
  const adminListRes = await fetch(apiUrl(`/api/admin/orders?q=${encodeURIComponent(orderNo)}`), {
    headers: {
      Cookie: `${adminSession.cookieName}=${adminSession.cookieValue}`,
    },
  })
  if (!adminListRes.ok) {
    throw new Error(`Failed to fetch admin orders (${adminListRes.status}): ${await adminListRes.text()}`)
  }
  const listData = (await adminListRes.json()) as { items: Array<{ id: string; no: string }> }
  const foundOrder = listData.items.find((item) => item.no === orderNo)
  if (!foundOrder) {
    throw new Error(`Seeded bridal reservation ${orderNo} not found in admin orders`)
  }

  // 7. Confirm full deposit via admin payment confirm endpoint to lock the reservation
  const confirmRes = await fetch(apiUrl(`/api/admin/orders/${foundOrder.id}/payments/confirm`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${adminSession.cookieName}=${adminSession.cookieValue}`,
      'x-csrf-token': adminSession.csrfToken,
    },
    body: JSON.stringify({
      amount: quote.depositAmount,
      note: 'تأكيد عربون حجز جهاز العروسة',
    }),
  })
  if (!confirmRes.ok) {
    throw new Error(`Failed to confirm deposit (${confirmRes.status}): ${await confirmRes.text()}`)
  }

  return {
    orderNo,
    orderId: foundOrder.id,
    listShareToken: listView.shareToken,
  }
}

test('admin bridal reservations and settings: filter list, detail panel, delivery date agreement, reprice, extend lock, dashboard expiring locks, and tier editor', { skip: BRIDAL_SKIP }, async ({
  app,
  screen,
  browser,
}) => {
  // 1. Log in with admin session
  const adminSession = await loginWithAdminSession(browser, seed, app)

  // 2. Set default desktop viewport (1280px)
  await browser.setViewport({ width: 1280, height: 800 })

  // ---------------------------------------------------------------------------
  // Flow (a): Reserve, confirm deposit, filter by «جهاز عروسة», open order,
  // verify «خرج للتوصيل» blocked, agree delivery date -> status «اتفقنا على التوصيل»
  // ---------------------------------------------------------------------------
  const res1 = await createAndLockReservation(seed, adminSession, {
    name: `ثلاجة باقة العروسة ${seed.runId}`,
    priceEgp: 15000,
  })

  // Open admin orders list
  await app.open('/admin/orders')
  await waitForHydration(browser)

  // Filter toolbar by «جهاز عروسة»
  const typeSelect = screen.getByLabel('كل الأنواع')
  await typeSelect.selectOption({ label: 'جهاز عروسة' })
  await expect(browser).toHaveURL(/type=bridal/)

  // Assert reservation 1 is visible in the filtered orders table
  const order1Link = screen.getByRole('link', res1.orderNo).first()
  await expect(order1Link).toBeVisible()
  await expect(browser.locator('table').getByText('جهاز عروسة').first()).toBeVisible()
  await expect(browser.locator('table').getByText('محجوز (السعر مثبت)').first()).toBeVisible()

  // Open order 1 detail page
  await order1Link.tap()
  await expect(browser).toHaveURL(new RegExp(`/admin/orders/${res1.orderId}`))
  await waitForHydration(browser)

  // 375px mobile viewport check: bridal panel without horizontal scroll
  await browser.setViewport({ width: 375, height: 667 })
  const detailScrollWidth = await browser.evaluate(() => document.documentElement.scrollWidth)
  expect(detailScrollWidth).toBeLessThanOrEqual(375)
  await browser.setViewport({ width: 1280, height: 800 })

  // Assert bridal panel details are present
  await expect(screen.getByText('بيانات حجز العروسة')).toBeVisible()
  await expect(screen.getByText('محجوز (السعر مثبت)').first()).toBeVisible()

  // Link to bride's read-only list is present with the share token
  const brideListLink = screen.getByRole('link', 'افتح قائمة العروسة (للقراءة)')
  await expect(brideListLink).toBeVisible()
  const listHref = await brideListLink.getAttribute('href')
  expect(listHref).toContain(res1.listShareToken)

  // Verify «خرج للتوصيل» is disabled for bridal order before delivery date is agreed
  const dispatchBtn = screen.getByRole('button', 'خرج للتوصيل')
  await expect(dispatchBtn).toBeDisabled()
  await expect(
    screen.getByText(/بيتفعل بعد ما نتفق على ميعاد التوصيل/),
  ).toBeVisible()

  // Agree delivery date: click «تحديد ميعاد التوصيل»
  const setDeliveryDateBtn = screen.getByRole('button', 'تحديد ميعاد التوصيل')
  await setDeliveryDateBtn.tap()

  const deliveryDialog = screen.getByRole('dialog')
  await expect(deliveryDialog).toBeVisible()

  const tomorrowCairo = getCairoDateStr(1)
  const deliveryDateInput = browser.locator('#bridal-delivery-date')
  await deliveryDateInput.fill(tomorrowCairo)

  const confirmDeliveryBtn = deliveryDialog.getByRole('button', 'تأكيد')
  await confirmDeliveryBtn.tap()

  // Assert status transitions to «اتفقنا على التوصيل»
  await expect(screen.getByText('اتفقنا على التوصيل').first()).toBeVisible()
  // «خرج للتوصيل» is now unblocked
  await expect(dispatchBtn).toBeEnabled()

  // ---------------------------------------------------------------------------
  // Flow (b): Second locked reservation: reprice unchanged -> «مفيش فرق» and
  // WhatsApp button; extend lock to future date -> new date shown
  // ---------------------------------------------------------------------------
  const res2 = await createAndLockReservation(seed, adminSession, {
    name: `بوتاجاز باقة العروسة ${seed.runId}`,
    priceEgp: 12000,
  })

  await app.open(`/admin/orders/${res2.orderId}`)
  await waitForHydration(browser)

  // Open reprice dialog
  const repriceBtn = screen.getByRole('button', 'حدّث الأسعار')
  await repriceBtn.tap()

  const repriceDialog = screen.getByRole('dialog')
  await expect(repriceDialog).toBeVisible()
  await expect(screen.getByText(/سيتم تحديث أسعار الأجهزة بالأسعار الحالية/)).toBeVisible()

  // Confirm reprice
  const confirmRepriceBtn = repriceDialog.getByRole('button', 'تأكيد تحديث الأسعار')
  await confirmRepriceBtn.tap()

  // Assert reprice result state: «مفيش فرق» and WhatsApp send button
  await expect(screen.getByText('مفيش فرق')).toBeVisible()
  const sendWaBtn = screen.getByRole('button', 'ابعت للعروسة على واتساب')
  await expect(sendWaBtn).toBeVisible()

  // Close reprice dialog
  const closeRepriceBtn = repriceDialog.getByRole('button', 'إغلاق')
  await closeRepriceBtn.tap()

  // Extend lock to future date (15 days ahead)
  const extendLockBtn = screen.getByRole('button', 'مدّ التثبيت')
  await extendLockBtn.tap()

  const extendDialog = screen.getByRole('dialog')
  await expect(extendDialog).toBeVisible()

  const futureLockDate = getCairoDateStr(15)
  const extendInput = browser.locator('#bridal-extend-until')
  await extendInput.fill(futureLockDate)

  const confirmExtendBtn = extendDialog.getByRole('button', 'تأكيد')
  await confirmExtendBtn.tap()

  await expect(screen.getByText(/تم تمديد فترة التثبيت بنجاح/)).toBeVisible()

  // ---------------------------------------------------------------------------
  // Flow (c): Dashboard expiring locks card contains reservation ending within 7 days
  // Use lock-extend API to set reservation 2's lock to 3 days ahead
  // ---------------------------------------------------------------------------
  const threeDaysAhead = getCairoDateStr(3)
  const extendRes = await fetch(apiUrl(`/api/admin/orders/${res2.orderId}/lock-extend`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${adminSession.cookieName}=${adminSession.cookieValue}`,
      'x-csrf-token': adminSession.csrfToken,
    },
    body: JSON.stringify({ until: threeDaysAhead }),
  })
  expect(extendRes.status).toBe(200)

  // Open /admin dashboard
  await app.open('/admin')
  await waitForHydration(browser)

  // Assert expiring-locks card displays reservation 2
  await expect(screen.getByText('تثبيتات تنتهي قريباً')).toBeVisible()
  const expiringReservationLink = screen.getByRole('link', res2.orderNo)
  await expect(expiringReservationLink).toBeVisible()

  // ---------------------------------------------------------------------------
  // Flow (d): /admin/bridal tier editor: change highlight of first tier, save,
  // reload -> persisted, then restore it
  // ---------------------------------------------------------------------------
  await app.open('/admin/bridal')
  await waitForHydration(browser)

  await expect(screen.getByText('إدارة باقات وإعدادات العروسة')).toBeVisible()

  // Find first highlight input
  const firstHighlightInput = browser.locator('input[placeholder*="ميزة 1"]').first()
  await expect(firstHighlightInput).toBeVisible()
  const originalHighlight = await firstHighlightInput.inputValue()
  const testHighlight = `ميزة تجريبية خاصة ${seed.runId}`

  // Modify highlight
  await firstHighlightInput.fill(testHighlight)

  // Assert dirty indicator is shown
  await expect(screen.getByText('تعديلات غير محفوظة')).toBeVisible()

  // Save tier
  const saveTierBtn = screen.getByRole('button', 'حفظ الباقة')
  await saveTierBtn.tap()
  await expect(screen.getByText(/تم حفظ تعديلات الباقة بنجاح/)).toBeVisible()

  // Reload page and assert persisted
  await app.open('/admin/bridal')
  await waitForHydration(browser)

  const reloadedInput = browser.locator('input[placeholder*="ميزة 1"]').first()
  await expect(reloadedInput).toHaveValue(testHighlight)

  // Restore original highlight to leave catalog tier clean
  await reloadedInput.fill(originalHighlight)
  const restoreSaveBtn = screen.getByRole('button', 'حفظ الباقة')
  await restoreSaveBtn.tap()
  await expect(screen.getByText(/تم حفظ تعديلات الباقة بنجاح/)).toBeVisible()
})
