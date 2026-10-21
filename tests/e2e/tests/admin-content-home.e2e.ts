import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed, type SeedAdminSessionResult } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

interface HomeSnapshot {
  sections: Record<string, unknown> & { hero: { title: string } }
  layout: { order: string[]; hidden: string[] }
}

let seed = createSeed()
let session: SeedAdminSessionResult | null = null
let original: HomeSnapshot | null = null

async function publicHome(): Promise<HomeSnapshot> {
  const res = await fetch(apiUrl('/api/content/home'))
  expect(res.status).toBe(200)
  return (await res.json()) as HomeSnapshot
}

function adminHeaders(s: SeedAdminSessionResult): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Cookie: `${s.cookieName}=${s.cookieValue}`,
    'x-csrf-token': s.csrfToken,
  }
}

afterEach(async () => {
  // Put the published home back the way the test found it
  if (session && original) {
    const headers = adminHeaders(session)
    await fetch(apiUrl('/api/admin/content/home/draft'), {
      method: 'PUT',
      headers,
      body: JSON.stringify({ sections: original.sections, layout: original.layout }),
    })
    await fetch(apiUrl('/api/admin/content/home/publish'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ label: `e2e restore ${seed.runId}` }),
    })
  }
  session = null
  original = null
  await seed.cleanup()
  seed = createSeed()
})

test('admin edits the home: preview only until publish, hide and reorder sections, restore a version', async ({
  app,
  screen,
  browser,
}) => {
  original = await publicHome()
  const newTitle = `ثقة بتكبر ${seed.runId}`
  // Each visit uses a fresh query so the 60 s SWR cache on / never serves a stale page
  let visit = 0
  const openHome = async () => {
    visit += 1
    await app.open(`/?v=${seed.runId}-${visit}`)
  }

  session = await loginWithAdminSession(browser, seed, app)
  await app.open('/admin/content')
  await waitForHydration(browser)

  // 1. Edit the hero title: the draft autosaves, the live site keeps the old title
  const titleInput = browser.locator('#f-hero-title')
  await expect(titleInput).toBeVisible()
  await titleInput.fill(newTitle)
  await expect(screen.getByText('اتحفظت المسودة')).toBeVisible()
  await expect(screen.getByText('1 تعديل مش منشور')).toBeVisible()
  expect((await publicHome()).sections.hero.title).toBe(original.sections.hero.title)

  // 2. Publish with Ctrl+Enter: the home shows the new title
  await titleInput.press('Control+Enter')
  const publishDialog = screen.getByRole('dialog')
  await expect(publishDialog).toBeVisible()
  await publishDialog.getByRole('button', 'انشر دلوقتي').tap()
  await expect(publishDialog).toBeHidden()
  await expect(screen.getByText('كل حاجة منشورة')).toBeVisible()

  await openHome()
  await expect(browser.locator('h1')).toHaveText(newTitle)
  await expect(screen.getByRole('heading', /أسعار الجملة/)).toBeVisible()

  // 3. Hide the traders section and move «من نحن» above «تجهيز العرايس», then publish
  await app.open('/admin/content')
  await waitForHydration(browser)
  await screen.getByRole('switch', 'إظهار «قسم التجار»').tap()
  await screen.getByRole('button', 'طلّع «من نحن» لفوق').tap()
  await screen.getByRole('button', 'طلّع «من نحن» لفوق').tap()
  await expect(screen.getByText('اتحفظت المسودة')).toBeVisible()
  await screen.getByRole('button', 'انشر').tap()
  await screen.getByRole('dialog').getByRole('button', 'انشر دلوقتي').tap()
  await expect(screen.getByText('كل حاجة منشورة')).toBeVisible()

  const layout = (await publicHome()).layout
  expect(layout.hidden).toContain('tradersTeaser')
  expect(layout.order.indexOf('aboutTeaser')).toBeLessThan(layout.order.indexOf('bridalTeaser'))

  await openHome()
  await expect(screen.getByRole('heading', /أسعار الجملة/)).toBeHidden()
  const headings = await browser.locator('main h2').allTextContents()
  const aboutIndex = headings.findIndex((text) => text.includes('من نحن'))
  const bridalIndex = headings.findIndex((text) => text.includes('تجهيز العرايس'))
  expect(aboutIndex).toBeGreaterThanOrEqual(0)
  expect(aboutIndex).toBeLessThan(bridalIndex)

  // 4. Restore the previous version (traders visible, original order) and publish it
  await app.open('/admin/content')
  await waitForHydration(browser)
  await screen.getByRole('button', 'سجل النسخ').tap()
  await browser.locator('[role="dialog"] button').filter({ hasText: 'استرجع' }).first().tap()
  await screen.getByRole('button', 'استرجع كمسودة').tap()
  await expect(screen.getByText(/اترجعت النسخة كمسودة/)).toBeVisible()
  expect((await publicHome()).layout.hidden).toContain('tradersTeaser')

  await screen.getByRole('button', 'انشر').tap()
  await screen.getByRole('dialog').getByRole('button', 'انشر دلوقتي').tap()
  await expect(screen.getByText('كل حاجة منشورة')).toBeVisible()

  await openHome()
  await expect(browser.locator('h1')).toHaveText(newTitle)
  await expect(screen.getByRole('heading', /أسعار الجملة/)).toBeVisible()
})
