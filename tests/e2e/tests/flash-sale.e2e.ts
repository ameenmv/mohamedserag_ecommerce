import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('flash sale: running sale shows sale price, struck regular price, badge and countdown on /offers and product page, and the order is placed at the sale price', async ({
  app,
  screen,
  browser,
}) => {
  const regularPrice = 12000
  const salePrice = 9500
  const productName = `تكييف شارب ${seed.runId}`

  // 1. Seed product with regular price (12,000 EGP)
  const product = await seed.product({
    name: productName,
    categorySlug: 'acs',
    priceEgp: regularPrice,
    stock: 5,
  })

  // 2. Seed active flash sale with sale price (9,500 EGP)
  await seed.flashSale({
    name: `عرض الصيف ${seed.runId}`,
    items: [
      {
        productId: product.id,
        salePriceEgp: salePrice,
      },
    ],
  })

  // --------------------------------------------------------------------------
  // Step 1: Open /offers page
  // --------------------------------------------------------------------------
  await app.open('/offers')
  await waitForHydration(browser)

  // Card on /offers shows the sale price (9,500), struck regular price (12,000), badge, and countdown
  const offersCard = browser.locator('article').filter({ hasText: productName }).first()
  await expect(offersCard).toBeVisible()
  await expect(offersCard).toContainText('9,500')
  await expect(offersCard).toContainText('12,000')
  await expect(offersCard).toContainText('عرض لفترة محدودة')
  await expect(offersCard).toContainText('باقي')

  // 320px responsiveness: verify no horizontal scroll on /offers
  await browser.setViewport({ width: 320, height: 600 })
  const scrollWidth = await browser.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await browser.evaluate(() => document.documentElement.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)

  // Reset viewport size to desktop
  await browser.setViewport({ width: 1280, height: 800 })

  // --------------------------------------------------------------------------
  // Step 2: Open product page
  // --------------------------------------------------------------------------
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)

  const productMain = browser.locator('main').first()
  await expect(productMain).toBeVisible()
  await expect(productMain).toContainText(productName)
  await expect(productMain).toContainText('9,500')
  await expect(productMain).toContainText('12,000')
  await expect(productMain).toContainText('عرض لفترة محدودة')
  await expect(productMain).toContainText('العرض بيخلص خلال')

  // --------------------------------------------------------------------------
  // Step 3: Add to cart, check out with COD, order line keeps the sale price
  // --------------------------------------------------------------------------
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  await app.open('/cart')
  await waitForHydration(browser)
  const cartContainer = browser.locator('main').first()
  await expect(cartContainer).toContainText(productName)
  await expect(cartContainer).toContainText('9,500')

  await app.open('/checkout')
  await waitForHydration(browser)
  await browser.locator('#checkout-name').fill('محمود أحمد سراج')
  await browser.locator('#checkout-phone').fill('01012345678')
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('طلخا')
  await browser.locator('#checkout-address').fill('شارع البحر بجوار كوبري طلخا')
  await browser.locator('input[type="radio"][value="cod"]').check()
  await screen.getByRole('button', 'تأكيد الطلب').first().tap()

  await expect(browser).toHaveURL(/\/order\/SR-\d{4}-\d{6}\/thanks\?t=/)
  const thanksMain = browser.locator('main').first()
  await expect(thanksMain).toContainText(productName)
  await expect(thanksMain).toContainText('9,500')
})

test('flash sale: an ended sale reverts to the regular price with no badge or countdown', async ({
  app,
  browser,
}) => {
  const productName = `بوتاجاز فلاش منتهي ${seed.runId}`
  const product = await seed.product({ name: productName, priceEgp: 8000, stock: 3 })

  const now = Date.now()
  await seed.flashSale({
    name: `عرض منتهي ${seed.runId}`,
    startsAt: new Date(now - 2 * 60 * 60_000).toISOString(),
    endsAt: new Date(now - 60_000).toISOString(),
    items: [{ productId: product.id, salePriceEgp: 6500 }],
  })

  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)

  const productMain = browser.locator('main').first()
  await expect(productMain).toContainText(productName)
  await expect(productMain).toContainText('8,000')
  await expect(productMain).not.toContainText('6,500')
  await expect(productMain).not.toContainText('عرض لفترة محدودة')
  await expect(productMain).not.toContainText('العرض بيخلص خلال')
})

test('flash sale: a live countdown reaching zero swaps the product page back to the regular price', async ({
  app,
  browser,
}) => {
  const productName = `غسالة فلاش لايف ${seed.runId}`
  const product = await seed.product({ name: productName, priceEgp: 9000, stock: 3 })

  await seed.flashSale({
    name: `عرض لايف ${seed.runId}`,
    endsAt: new Date(Date.now() + 20_000).toISOString(),
    items: [{ productId: product.id, salePriceEgp: 7500 }],
  })

  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)

  const productMain = browser.locator('main').first()
  await expect(productMain).toContainText('7,500')
  await expect(productMain).toContainText('العرض بيخلص خلال')

  // No reload: the countdown's end refreshes the product data in place.
  await expect(productMain).not.toContainText('العرض بيخلص خلال', { timeout: 45_000 })
  await expect(productMain).not.toContainText('7,500')
  await expect(productMain).not.toContainText('عرض لفترة محدودة')
  await expect(productMain).toContainText('9,000')
})
