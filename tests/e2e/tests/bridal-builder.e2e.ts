import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'
import { apiUrl } from './api-url.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('bridal builder: start golden tier, modify list, reload persists, swap alternative, search add, and verify 320/375px responsiveness', async ({
  app,
  screen,
  browser,
}) => {
  // --------------------------------------------------------------------------
  // (a) /bridal shows three tier cards → start «ذهبية» → edit → reload persists
  // --------------------------------------------------------------------------
  await app.open('/bridal')
  await waitForHydration(browser)

  // Assert three tier headings
  await expect(screen.getByRole('heading', 'أساسية')).toBeVisible()
  await expect(screen.getByRole('heading', 'ذهبية')).toBeVisible()
  await expect(screen.getByRole('heading', 'القصر')).toBeVisible()

  // Start «ذهبية»
  const startGoldenBtn = browser.locator('button[data-start-tier="golden"]')
  await startGoldenBtn.tap()

  // URL becomes /bridal/<token>
  await expect(browser).toHaveURL(/\/bridal\/[a-zA-Z0-9_-]+/)
  await waitForHydration(browser)

  const totalEl = browser.locator('[data-bridal-total]').first()
  await expect(totalEl).toBeVisible()
  const initialTotalText = (await totalEl.textContent())?.trim()

  // Change quantity of first item
  const increaseBtn = browser.locator('button[aria-label*="زيادة كمية"]').first()
  await increaseBtn.tap()

  // Remove an item
  const removeBtn = browser.locator('button[aria-label*="إزالة"]').first()
  await removeBtn.tap()

  // Total text changes
  await expect(totalEl).not.toHaveText(initialTotalText!)
  const updatedTotalText = (await totalEl.textContent())?.trim()

  // Wait for save indicator «اتحفظ»
  await expect(screen.getByText('اتحفظ')).toBeVisible()

  // Reload page and assert change persisted
  await browser.reload()
  await waitForHydration(browser)
  await expect(browser.locator('[data-bridal-total]').first()).toHaveText(updatedTotalText!)

  // --------------------------------------------------------------------------
  // (b) Build from a seeded product: swap alternative, add from search
  // --------------------------------------------------------------------------
  const p1Name = `ثلاجة رئيسية ${seed.runId}`
  const p2Name = `ثلاجة بديلة ${seed.runId}`
  const p1 = await seed.product({
    name: p1Name,
    categorySlug: 'refrigerators',
    priceEgp: 20000,
    stock: 5,
  })
  const p2 = await seed.product({
    name: p2Name,
    categorySlug: 'refrigerators',
    priceEgp: 25000,
    stock: 5,
  })

  // Create list via API with p1
  const createRes = await fetch(apiUrl('/api/bridal/lists'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: p1.id }),
  })
  expect(createRes.status).toBe(201)
  const { editToken } = (await createRes.json()) as { editToken: string }

  // Open the newly created list
  await app.open(`/bridal/${editToken}`)
  await waitForHydration(browser)
  await expect(screen.getByText(p1Name)).toBeVisible()

  // Tap «بدّلي»
  const swapBtn = browser.locator(`button[aria-label*="تبديل ${p1Name}"]`)
  await swapBtn.tap()

  // Choose p2 from swap sheet
  await expect(screen.getByText(p2Name)).toBeVisible()
  const selectAltBtn = browser.locator(`[data-swap-product="${p2.id}"] button`)
  await selectAltBtn.tap()

  // Row now shows p2Name and p1Name is gone
  await expect(screen.getByText(p2Name)).toBeVisible()
  await expect(screen.getByText(p1Name)).toBeHidden()

  // Open add sheet
  const openAddBtn = browser.locator('button[data-open-add]')
  await openAddBtn.tap()
  await expect(screen.getByText('إضافة جهاز لقايمتك')).toBeVisible()

  // Search p1 and add it
  const searchInput = browser.locator('input[type="search"]')
  await searchInput.fill(p1Name)

  const addP1Btn = browser.locator(`[data-add-product="${p1.id}"] button`)
  await expect(addP1Btn).toBeVisible()
  await addP1Btn.tap()

  // Close sheet
  const closeSheetBtn = browser.locator('button:has(span.sr-only:has-text("Close"))').first()
  if (await closeSheetBtn.isVisible()) {
    await closeSheetBtn.tap()
  }

  // Both products are now in the list
  await expect(screen.getByText(p1Name)).toBeVisible()
  await expect(screen.getByText(p2Name)).toBeVisible()

  // --------------------------------------------------------------------------
  // (c) 320px and 375px: no horizontal scroll on /bridal and list page
  // --------------------------------------------------------------------------
  for (const width of [320, 375]) {
    await browser.setViewport({ width, height: 667 })

    await app.open('/bridal')
    await waitForHydration(browser)
    let scrollWidth = await browser.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width)

    await app.open(`/bridal/${editToken}`)
    await waitForHydration(browser)
    scrollWidth = await browser.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(width)
  }
})
