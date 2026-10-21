import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed, type SeedAdminSessionResult } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

interface SplitRow {
  id: string | null
  label: string
  revenue: number
  orders: number
}

interface RevenueReport {
  totals: { revenue: number; orders: number; aov: number }
}

interface SplitsReport {
  byCategory: SplitRow[]
  byBrand: SplitRow[]
  byPaymentMethod: SplitRow[]
  byZone: SplitRow[]
  byType: SplitRow[]
}

interface BestSellerRow {
  productId: string
  units: number
  revenue: number
}

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

function adminHeaders(s: SeedAdminSessionResult): Record<string, string> {
  return {
    Cookie: `${s.cookieName}=${s.cookieValue}`,
    'x-csrf-token': s.csrfToken,
  }
}

async function report<T>(s: SeedAdminSessionResult, kind: string): Promise<T> {
  const res = await fetch(apiUrl(`/api/admin/reports/${kind}?preset=today`), { headers: adminHeaders(s) })
  expect(res.status).toBe(200)
  return (await res.json()) as T
}

function sum(rows: SplitRow[]): number {
  return rows.reduce((total, row) => total + row.revenue, 0)
}

test('reports include a delivered order in revenue, splits and best sellers, and the CSV export matches', async ({
  app,
  screen,
  browser,
}) => {
  const session = await loginWithAdminSession(browser, seed, app)
  // Other specs deliver orders today too, so revenue is checked as a delta from this baseline
  const before = await report<RevenueReport>(session, 'revenue')

  // 1. Two products in two categories, one delivered order with both, and one undelivered order
  const washer = await seed.product({ name: `غسالة تقرير ${seed.runId}`, categorySlug: 'washers', priceEgp: 12000, stock: 10 })
  const other = await seed.product({ name: `منتج تقرير ${seed.runId}`, priceEgp: 3000, stock: 10 })
  const delivered = await seed.order({
    items: [
      { productId: washer.id, qty: 2 },
      { productId: other.id, qty: 1 },
    ],
    paymentMethod: 'cod',
    status: 'delivered',
  })
  await seed.order({ items: [{ productId: washer.id, qty: 5 }], paymentMethod: 'cod', status: 'confirmed' })

  // 2. Revenue counts the delivered order only
  const after = await report<RevenueReport>(session, 'revenue')
  expect(after.totals.revenue - before.totals.revenue).toBe(delivered.total)
  expect(after.totals.orders - before.totals.orders).toBe(1)

  // 3. Every split sums exactly to the revenue total
  const splits = await report<SplitsReport>(session, 'splits')
  for (const rows of [splits.byCategory, splits.byBrand, splits.byPaymentMethod, splits.byZone, splits.byType]) {
    expect(sum(rows)).toBe(after.totals.revenue)
  }

  // 4. Best sellers list the washer with its units and line revenue
  const { items } = await report<{ items: BestSellerRow[] }>(session, 'best-sellers')
  const washerRow = items.find((row) => row.productId === washer.id)
  expect(washerRow?.units).toBe(2)
  expect(washerRow?.revenue).toBe(2 * 12000 * 100)

  // 5. The revenue CSV has a BOM, Arabic headers and the same total
  const csvRes = await fetch(apiUrl('/api/admin/reports/revenue/export?preset=today'), { headers: adminHeaders(session) })
  expect(csvRes.status).toBe(200)
  expect(csvRes.headers.get('content-type') ?? '').toContain('text/csv')
  expect(csvRes.headers.get('content-disposition') ?? '').toMatch(/attachment; filename="serag-revenue-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv"/)
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await csvRes.arrayBuffer())
  expect(csv.charCodeAt(0)).toBe(0xfeff)
  const lines = csv.slice(1).split('\r\n')
  expect(lines[0]).toContain('الفترة')
  const totalLine = lines.find((line) => line.startsWith('الإجمالي'))
  expect(totalLine?.split(',')[1]).toBe((after.totals.revenue / 100).toFixed(2))

  // 6. The page shows the revenue tab for today and its export link, then the washer under best sellers
  await app.open('/admin/reports?preset=today')
  await waitForHydration(browser)
  await expect(screen.getByText('إجمالي الإيراد').first()).toBeVisible()
  const exportHref = await browser.locator('[data-test="reports-export"]').getAttribute('href')
  expect(exportHref ?? '').toMatch(/\/admin\/reports\/revenue\/export\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/)

  await screen.getByRole('tab', 'الأكثر مبيعاً').tap()
  await expect(browser).toHaveURL(/tab=best-sellers/)
  await expect(screen.getByText(`غسالة تقرير ${seed.runId}`)).toBeVisible()
})
