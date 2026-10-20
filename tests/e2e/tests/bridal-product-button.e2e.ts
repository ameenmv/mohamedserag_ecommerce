import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('bridal product page button: add from product page, toast link navigation, second product appends to same list by category room, and funnel events', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed two products in different categories (refrigerators → kitchen, washers → laundry)
  const p1Name = `ثلاجة عروسة تجربة ${seed.runId}`
  const p2Name = `غسالة عروسة تجربة ${seed.runId}`

  const p1 = await seed.product({
    name: p1Name,
    categorySlug: 'refrigerators',
    priceEgp: 22000,
    stock: 5,
  })

  const p2 = await seed.product({
    name: p2Name,
    categorySlug: 'washers',
    priceEgp: 15000,
    stock: 5,
  })

  // --------------------------------------------------------------------------
  // (a) Fresh device: open seeded product page → tap button → toast link → list page shows product
  // --------------------------------------------------------------------------
  await app.open(`/p/${p1.slug}`)
  await waitForHydration(browser)

  // Stub the analytics tracker on window
  await browser.evaluate(() => {
    const w = window as unknown as {
      __events: Array<{ event: string; data?: Record<string, unknown> }>
      umami: unknown
    }
    w.__events = []
    w.umami = {
      track: (event: string, data?: Record<string, unknown>) => {
        w.__events.push({ event, data })
      },
    }
  })

  const bridalBtn1 = browser.locator('#bridal-add-button')
  await expect(bridalBtn1).toBeVisible()
  await expect(bridalBtn1).toBeEnabled()
  await bridalBtn1.tap()

  // Follow the open-list link from confirmation / toast
  const openListLink1 = browser.locator('#bridal-inline-open-link')
  await expect(openListLink1).toBeVisible()
  await openListLink1.tap()

  // URL becomes /bridal/<editToken>
  await expect(browser).toHaveURL(/\/bridal\/[a-zA-Z0-9_-]+/)
  await waitForHydration(browser)

  const listUrl1 = await browser.evaluate(() => window.location.href)
  const tokenMatch = listUrl1.match(/\/bridal\/([a-zA-Z0-9_-]+)/)
  expect(tokenMatch).not.toBeNull()
  const editToken = tokenMatch![1]!

  // List page displays p1 under «المطبخ»
  await expect(screen.getByText(p1Name)).toBeVisible()
  const kitchenSection = browser.locator('[data-room="kitchen"]')
  await expect(kitchenSection).toBeVisible()
  await expect(kitchenSection.getByText(p1Name)).toBeVisible()

  // --------------------------------------------------------------------------
  // (c) Funnel check (before the next full page load resets the stub): umami stub receives bridal_list_created exactly once, no PII or token in payloads
  // --------------------------------------------------------------------------
  const events = await browser.evaluate(() => {
    const w = window as unknown as {
      __events?: Array<{ event: string; data?: Record<string, unknown> }>
    }
    return (w.__events ?? []).map((e) => ({
      event: e.event,
      data: e.data ?? null,
    }))
  })

  const createdEvents = events.filter((e) => e.event === 'bridal_list_created')
  expect(createdEvents).toHaveLength(1)

  // Verify no event payload contains the edit token, phone numbers, or customer names
  const allPayloadsStr = JSON.stringify(events)
  expect(allPayloadsStr).not.toContain(editToken)
  expect(allPayloadsStr).not.toMatch(/01[0-9]{9}/)

  // --------------------------------------------------------------------------
  // (b) Same device: open second seeded product (washers) → tap → same list now has both products, washer under «الغسيل»
  // --------------------------------------------------------------------------
  await app.open(`/p/${p2.slug}`)
  await waitForHydration(browser)

  // Ensure window.umami stub is retained
  await browser.evaluate(() => {
    const w = window as unknown as {
      __events?: Array<{ event: string; data?: Record<string, unknown> }>
      umami?: { track: (event: string, data?: Record<string, unknown>) => void }
    }
    if (!w.__events) {
      w.__events = []
    }
    if (!w.umami) {
      w.umami = {
        track: (event: string, data?: Record<string, unknown>) => {
          w.__events?.push({ event, data })
        },
      }
    }
  })

  const bridalBtn2 = browser.locator('#bridal-add-button')
  await expect(bridalBtn2).toBeVisible()
  await expect(bridalBtn2).toBeEnabled()
  await bridalBtn2.tap()

  const openListLink2 = browser.locator('#bridal-inline-open-link')
  await expect(openListLink2).toBeVisible()
  await openListLink2.tap()

  // Verify it navigated to the exact same list (same edit token)
  await expect(browser).toHaveURL(new RegExp(`/bridal/${editToken}$`))
  await waitForHydration(browser)

  // Both products are present
  await expect(screen.getByText(p1Name)).toBeVisible()
  await expect(screen.getByText(p2Name)).toBeVisible()

  // Washer is placed under «الغسيل»
  const laundrySection = browser.locator('[data-room="laundry"]')
  await expect(laundrySection).toBeVisible()
  await expect(laundrySection.getByText(p2Name)).toBeVisible()
})
