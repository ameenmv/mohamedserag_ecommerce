import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed, type SeedAdminSessionResult } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

interface AdminPage {
  id: string
  slug: string
  title: string
  body: string
  seoTitle: string | null
  seoDescription: string | null
  published: boolean
}

let seed = createSeed()
let session: SeedAdminSessionResult | null = null
const originals: AdminPage[] = []

function adminHeaders(s: SeedAdminSessionResult): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Cookie: `${s.cookieName}=${s.cookieValue}`,
    'x-csrf-token': s.csrfToken,
  }
}

async function adminPage(s: SeedAdminSessionResult, slug: string): Promise<AdminPage> {
  const list = await fetch(apiUrl('/api/admin/pages'), { headers: adminHeaders(s) })
  expect(list.status).toBe(200)
  const { items } = (await list.json()) as { items: { id: string; slug: string }[] }
  const row = items.find((item) => item.slug === slug)
  if (!row) throw new Error(`page ${slug} is not seeded`)
  const res = await fetch(apiUrl(`/api/admin/pages/${row.id}`), { headers: adminHeaders(s) })
  return (await res.json()) as AdminPage
}

afterEach(async () => {
  // Restore every page this test changed
  if (session) {
    for (const page of originals) {
      await fetch(apiUrl(`/api/admin/pages/${page.id}`), {
        method: 'PATCH',
        headers: adminHeaders(session),
        body: JSON.stringify({
          title: page.title,
          body: page.body,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          published: page.published,
        }),
      })
    }
  }
  originals.length = 0
  session = null
  await seed.cleanup()
  seed = createSeed()
})

test('admin edits the returns policy with rich text and SEO, unpublishes the FAQ; traders page WhatsApp CTA', async ({
  app,
  screen,
  browser,
}) => {
  session = await loginWithAdminSession(browser, seed, app)
  originals.push(await adminPage(session, 'returns'), await adminPage(session, 'faq'))
  const seoTitle = `الاسترجاع ${seed.runId}`
  const boldText = `مهم جداً ${seed.runId}`
  const listItem = `بند الاسترجاع ${seed.runId}`

  // 1. Edit the returns page: bold paragraph + bullet list + SEO title
  await app.open('/admin/content?tab=pages')
  await waitForHydration(browser)
  await screen.getByRole('button', /تعديل صفحة «سياسة الاستبدال/).tap()

  const body = screen.getByRole('textbox', 'محتوى الصفحة')
  await expect(body).toBeVisible()
  // Replace the body (restored afterwards). Toolbar buttons hand focus back to the
  // editor, so typing goes through the page keyboard.
  await body.tap()
  await browser.keyboard.press('Control+A')
  await browser.keyboard.press('Backspace')
  const boldButton = screen.getByRole('button', 'نص عريض')
  if ((await boldButton.getAttribute('aria-pressed')) === 'true') await boldButton.tap()
  await browser.keyboard.type('مقدمة السياسة ')
  await boldButton.tap()
  await browser.keyboard.type(boldText)
  await boldButton.tap()
  await browser.keyboard.press('Enter')
  await screen.getByRole('button', 'قائمة نقط').tap()
  await browser.keyboard.type(listItem)

  const seoInput = screen.getByRole('textbox', 'عنوان SEO')
  await seoInput.fill(seoTitle)
  await screen.getByRole('button', 'احفظ').tap()
  await expect(screen.getByText('اتحفظت الصفحة')).toBeVisible()

  // 2. The storefront page shows the formatting and the new SEO title
  await app.open(`/pages/returns?v=${seed.runId}`)
  await expect(browser.locator('main strong').filter({ hasText: boldText })).toBeVisible()
  await expect(browser.locator('main ul li').filter({ hasText: listItem })).toBeVisible()
  await expect(browser).toHaveTitle(new RegExp(seoTitle))

  // 3. Unpublish the FAQ: 404 on its page and gone from the footer
  await app.open('/admin/content?tab=pages')
  await waitForHydration(browser)
  await screen.getByRole('button', /تعديل صفحة «الأسئلة/).tap()
  const publishedSwitch = screen.getByRole('switch', 'الصفحة منشورة للزوار')
  await expect(publishedSwitch).toHaveAttribute('aria-checked', 'true')
  await publishedSwitch.tap()
  await screen.getByRole('button', 'احفظ').tap()
  await expect(screen.getByText('اتحفظت الصفحة')).toBeVisible()

  const faqRes = await fetch(apiUrl('/api/pages/faq'))
  expect(faqRes.status).toBe(404)
  await app.open(`/pages/returns?v=${seed.runId}-2`)
  await expect(browser.locator('footer a[href="/pages/faq"]')).toHaveCount(0)
  await expect(browser.locator('footer a[href="/pages/returns"]')).toHaveCount(1)

  // 4. /traders: the WhatsApp CTA targets the traders number with the prefilled message,
  //    or stays disabled while the store numbers are still placeholders
  const storeRes = await fetch(apiUrl('/api/settings/store'))
  const store = (await storeRes.json()) as { whatsapp: string; tradersWhatsapp: string }
  const usable = (n: string) => n.length > 0 && !n.includes('[')
  const number = usable(store.tradersWhatsapp) ? store.tradersWhatsapp : usable(store.whatsapp) ? store.whatsapp : ''

  await app.open('/traders')
  await expect(screen.getByRole('heading', /أسعار الجملة/)).toBeVisible()
  if (number) {
    const cta = browser.locator('main a[href*="wa.me"]').first()
    await expect(cta).toHaveAttribute('target', '_blank')
    await expect(cta).toHaveAttribute('href', new RegExp(number.replace(/\D/g, '').slice(-9)))
    await expect(cta).toHaveAttribute('href', /text=/)
  } else {
    await expect(screen.getByRole('button', 'كلّم قسم الجملة على واتساب')).toBeDisabled()
  }
})
