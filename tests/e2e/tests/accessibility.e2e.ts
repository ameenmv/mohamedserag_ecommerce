import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { seriousA11yViolations } from './support/a11y.js'
import { BRIDAL_ENABLED } from './support/features.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('public pages have no serious or critical accessibility violations', async ({ app, browser, screen }) => {
  const product = await seed.product({ name: `مكنسة وصول ${seed.runId}`, priceEgp: 2500, stock: 5 })

  const pages = ['/', '/c/refrigerators', `/p/${product.slug}`, '/guides', ...(BRIDAL_ENABLED ? ['/bridal'] : [])]
  for (const path of pages) {
    await app.open(path)
    await waitForHydration(browser)
    expect({ path, violations: await seriousA11yViolations(browser) }).toEqual({ path, violations: [] })
  }

  // Cart and checkout with an item in the cart
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()
  for (const path of ['/cart', '/checkout']) {
    await app.open(path)
    await waitForHydration(browser)
    expect({ path, violations: await seriousA11yViolations(browser) }).toEqual({ path, violations: [] })
  }
})

test('admin pages have no serious or critical accessibility violations', async ({ app, browser }) => {
  // Tall enough that the whole sidebar is on screen: axe misreads the background of items
  // scrolled out of view inside the sidebar's own scroll area.
  await browser.setViewport({ width: 1280, height: 1600 })
  await app.open('/admin/login')
  await waitForHydration(browser)
  expect({ path: '/admin/login', violations: await seriousA11yViolations(browser) }).toEqual({ path: '/admin/login', violations: [] })

  await loginWithAdminSession(browser, seed, app)
  for (const path of ['/admin', '/admin/orders', '/admin/products', '/admin/reports', '/admin/settings']) {
    await app.open(path)
    await waitForHydration(browser)
    expect({ path, violations: await seriousA11yViolations(browser) }).toEqual({ path, violations: [] })
  }
})
