/**
 * Lighthouse CI `puppeteerScript` (spec 010, T020): puts one product in the cart before the pages
 * are measured, so checkout is audited the way shoppers reach it. The cart lives in the browser
 * (localStorage); with an empty cart the server-rendered order form is swapped for the empty-cart
 * message after hydration, which made that late message the checkout LCP.
 * Runs before every URL; adds the product only once. Needs `settings.disableStorageReset: true`.
 */
const PRODUCT_URL = 'https://localhost:8443/p/fresh-cooker-4b-s15'

let added = false

module.exports = async (browser) => {
  if (added) return
  const page = await browser.newPage()
  await page.goto(PRODUCT_URL, { waitUntil: 'networkidle0' })
  // Listeners are live only once Nuxt has finished hydrating (same check as the e2e suite)
  await page.waitForFunction(() => {
    const el = document.querySelector('#__nuxt')
    const nuxt = el && el.__vue_app__ && el.__vue_app__.config.globalProperties.$nuxt
    return Boolean(nuxt) && nuxt.isHydrating === false
  }, { timeout: 30000 })
  await page.click('#main-add-to-cart-button')
  await page.waitForFunction(
    () => [...document.querySelectorAll('header .sr-only')].some((node) => /السلة:\s*1/.test(node.textContent || '')),
    { timeout: 15000 },
  )
  await page.close()
  added = true
}
