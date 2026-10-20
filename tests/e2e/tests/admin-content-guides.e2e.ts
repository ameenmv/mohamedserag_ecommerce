import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed, type SeedAdminSessionResult } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

let seed = createSeed()
let session: SeedAdminSessionResult | null = null
let guideSlug: string | null = null

afterEach(async () => {
  // Delete the guide this test created (the seed cleanup does not know guides)
  if (session && guideSlug) {
    const headers = {
      Cookie: `${session.cookieName}=${session.cookieValue}`,
      'x-csrf-token': session.csrfToken,
    }
    const list = await fetch(apiUrl(`/api/admin/guides?q=${guideSlug}`), { headers })
    const { items } = (await list.json()) as { items: { id: string; slug: string }[] }
    for (const item of items.filter((row) => row.slug === guideSlug)) {
      await fetch(apiUrl(`/api/admin/guides/${item.id}`), { method: 'DELETE', headers })
    }
  }
  session = null
  guideSlug = null
  await seed.cleanup()
  seed = createSeed()
})

test('admin creates and publishes a guide with 3 products; it shows on /guides, the home and its page; unpublish hides it', async ({
  app,
  screen,
  browser,
}) => {
  const products: { name: string; modelCode: string }[] = []
  for (const n of [1, 2, 3]) {
    const name = `ثلاجة دليل ${n} ${seed.runId}`
    const seeded = await seed.product({ name, priceEgp: 20000 + n * 1000, stock: 5 })
    products.push({ name, modelCode: seeded.modelCode })
  }
  const title = `دليل اختبار ${seed.runId}`
  guideSlug = `guide-${seed.runId}`
  let visit = 0
  const fresh = (path: string) => `${path}?v=${seed.runId}-${++visit}`

  session = await loginWithAdminSession(browser, seed, app)
  await app.open('/admin/content?tab=guides')
  await waitForHydration(browser)

  // 1. Create the guide: title, slug, summary, body, 3 products, published
  await screen.getByRole('button', 'دليل جديد').tap()
  await screen.getByRole('textbox', 'عنوان الدليل').fill(title)
  await screen.getByRole('textbox', 'الرابط (slug)').fill(guideSlug)
  await screen.getByRole('textbox', 'ملخص الدليل').fill(`ملخص ${seed.runId}`)
  const body = screen.getByRole('textbox', 'محتوى الدليل')
  await body.tap()
  await browser.keyboard.type(`نصيحة الدليل ${seed.runId}`)

  for (const product of products) {
    await screen.getByRole('button', 'أضف منتج').tap()
    const picker = screen.getByRole('dialog')
    await picker.getByRole('searchbox').fill(product.modelCode)
    await picker.getByRole('button', new RegExp(product.modelCode)).tap()
    await expect(picker).toBeHidden()
  }

  await screen.getByRole('switch', 'الدليل منشور للزوار').tap()
  await screen.getByRole('button', 'احفظ').tap()
  await expect(screen.getByText('اتحفظ الدليل')).toBeVisible()

  // 2. Listed on /guides and in the home guides section, page shows 3 product cards
  await app.open(fresh('/guides'))
  await expect(browser.locator(`main a[href="/guides/${guideSlug}"]`).first()).toBeVisible()

  await app.open(fresh('/'))
  await expect(browser.locator(`main a[href="/guides/${guideSlug}"]`).first()).toBeVisible()

  await app.open(fresh(`/guides/${guideSlug}`))
  await expect(browser.locator('h1')).toHaveText(title)
  await expect(screen.getByText(`نصيحة الدليل ${seed.runId}`)).toBeVisible()
  for (const product of products) {
    await expect(browser.locator('main article, main').getByText(product.name).first()).toBeVisible()
  }

  // 3. Unpublish: 404 on its page and gone from the list
  await app.open('/admin/content?tab=guides')
  await waitForHydration(browser)
  await screen.getByRole('button', `تعديل دليل «${title}»`).tap()
  const publishedSwitch = screen.getByRole('switch', 'الدليل منشور للزوار')
  await expect(publishedSwitch).toHaveAttribute('aria-checked', 'true')
  await publishedSwitch.tap()
  await screen.getByRole('button', 'احفظ').tap()
  await expect(screen.getByText('اتحفظ الدليل')).toBeVisible()

  expect((await fetch(apiUrl(`/api/guides/${guideSlug}`))).status).toBe(404)
  await app.open(fresh('/guides'))
  await expect(browser.locator(`main a[href="/guides/${guideSlug}"]`)).toHaveCount(0)
})
