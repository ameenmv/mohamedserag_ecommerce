import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed, type SeedAdminSessionResult } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

interface SummaryPoint {
  date: string
  revenue: number
  deliveredOrders: number
  deposits: number
}

interface DashboardSummary {
  counters: { id: string; count: number; href: string }[]
  series: SummaryPoint[]
}

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

function adminHeaders(s: SeedAdminSessionResult): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Cookie: `${s.cookieName}=${s.cookieValue}`,
    'x-csrf-token': s.csrfToken,
  }
}

async function fetchSummary(s: SeedAdminSessionResult): Promise<DashboardSummary> {
  const res = await fetch(apiUrl('/api/admin/dashboard/summary?range=7'), { headers: adminHeaders(s) })
  expect(res.status).toBe(200)
  return (await res.json()) as DashboardSummary
}

function countOf(summary: DashboardSummary, id: string): number {
  return summary.counters.find((counter) => counter.id === id)?.count ?? 0
}

function today(summary: DashboardSummary): SummaryPoint {
  const point = summary.series[summary.series.length - 1]
  if (!point) throw new Error('dashboard series is empty')
  return point
}

test('overview counters link to filtered pages, a delivered order lands in today revenue and a deposit stays separate', async ({
  app,
  screen,
  browser,
}) => {
  const session = await loginWithAdminSession(browser, seed, app)
  // Other specs leave data behind, so every number is checked as a delta from this baseline
  const before = await fetchSummary(session)

  // 1. One item per counter we can seed
  const product = await seed.product({ name: `غسالة لوحة ${seed.runId}`, priceEgp: 1000, stock: 20 })
  await seed.product({ name: `مروحة قربت تخلص ${seed.runId}`, priceEgp: 500, stock: 1 })
  const restocked = await seed.product({ name: `بوتاجاز بلغني ${seed.runId}`, priceEgp: 800, stock: 0 })
  await seed.order({ items: [{ productId: product.id, qty: 1 }], paymentMethod: 'cod', status: 'new' })
  await seed.order({ items: [{ productId: product.id, qty: 1 }], paymentMethod: 'instapay', status: 'awaiting_payment' })
  const depositOrder = await seed.order({
    items: [{ productId: product.id, qty: 1 }],
    paymentMethod: 'cod',
    status: 'awaiting_deposit',
    depositAmountEgp: 300,
  })
  await seed.review({ productId: product.id, stars: 4, status: 'pending', text: 'الغسالة كويسة جداً وهادية في الشغل' })

  const notify = await fetch(apiUrl('/api/notify-me'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: restocked.id, name: 'منى عادل', phone: '01055556666' }),
  })
  expect(notify.ok).toBe(true)
  const restock = await fetch(apiUrl(`/api/admin/products/${restocked.id}`), {
    method: 'PATCH',
    headers: adminHeaders(session),
    body: JSON.stringify({ stock: 5 }),
  })
  expect(restock.ok).toBe(true)

  // 2. A delivered order counts as revenue today
  const delivered = await seed.order({ items: [{ productId: product.id, qty: 2 }], paymentMethod: 'cod', status: 'delivered' })

  // 3. Confirming the deposit records money received, not revenue
  const confirm = await fetch(apiUrl(`/api/admin/confirm/${depositOrder.confirmToken}/confirm`), {
    method: 'POST',
    headers: adminHeaders(session),
    body: JSON.stringify({ amount: 30000 }),
  })
  expect(confirm.status).toBe(200)

  const after = await fetchSummary(session)
  for (const id of ['newOrders', 'awaitingPayment', 'pendingReviews', 'notifyReady', 'lowStock']) {
    expect(countOf(after, id)).toBeGreaterThanOrEqual(countOf(before, id) + 1)
  }
  expect(today(after).revenue).toBeGreaterThanOrEqual(today(before).revenue + delivered.total)
  expect(today(after).deliveredOrders).toBeGreaterThanOrEqual(today(before).deliveredOrders + 1)
  expect(today(after).deposits).toBeGreaterThanOrEqual(today(before).deposits + 30000)

  // 4. The overview shows each counter with its filtered link
  await app.open('/admin')
  await waitForHydration(browser)
  const expectedLinks: Record<string, RegExp> = {
    newOrders: /\/admin\/orders\?status=new$/,
    awaitingPayment: /\/admin\/orders\?status=awaiting_payment$/,
    awaitingDeposit: /\/admin\/orders\?status=awaiting_deposit$/,
    locksExpiring: /\/admin\/orders\?type=bridal&lockExpiring=7$/,
    pendingReviews: /\/admin\/reviews\?tab=pending$/,
    notifyReady: /\/admin\/notify\?ready=1$/,
    lowStock: /\/admin\/products\?stock=low$/,
  }
  for (const [id, href] of Object.entries(expectedLinks)) {
    const counter = browser.locator(`[data-testid="admin-dashboard-counter-${id}"]`)
    await expect(counter).toBeVisible()
    expect(await counter.getAttribute('href')).toMatch(href)
  }
  const newOrdersCount = Number(
    (await browser.locator('[data-testid="admin-dashboard-counter-newOrders"] .num').textContent())?.trim(),
  )
  expect(newOrdersCount).toBeGreaterThanOrEqual(countOf(before, 'newOrders') + 1)

  // 5. The sales card shows revenue and deposits as separate totals
  await expect(screen.getByText('الإيراد').first()).toBeVisible()
  await expect(screen.getByText('العرابين المستلمة').first()).toBeVisible()

  // 6. The new-orders counter opens the orders list filtered to «جديد»
  await browser.locator('[data-testid="admin-dashboard-counter-newOrders"]').tap()
  await expect(browser).toHaveURL(/\/admin\/orders\?status=new/)
})
