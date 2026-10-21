import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed, type SeedAdminSessionResult } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

interface StoreSection {
  value: Record<string, string>
  version: string | null
}

let seed = createSeed()
let session: SeedAdminSessionResult | null = null
let originalHours: string | null = null

function headers(s: SeedAdminSessionResult): Record<string, string> {
  return { 'Content-Type': 'application/json', Cookie: `${s.cookieName}=${s.cookieValue}`, 'x-csrf-token': s.csrfToken }
}

async function readStore(s: SeedAdminSessionResult): Promise<StoreSection> {
  const res = await fetch(apiUrl('/api/admin/settings'), { headers: headers(s) })
  expect(res.status).toBe(200)
  return ((await res.json()) as { sections: { store: StoreSection } }).sections.store
}

async function saveHours(s: SeedAdminSessionResult, hours: string): Promise<void> {
  const store = await readStore(s)
  const res = await fetch(apiUrl('/api/admin/settings/store'), {
    method: 'PUT',
    headers: headers(s),
    body: JSON.stringify({ value: { ...store.value, hours }, version: store.version }),
  })
  if (!res.ok) throw new Error(`saving store hours failed (${res.status}): ${await res.text()}`)
}

afterEach(async () => {
  if (session && originalHours !== null) await saveHours(session, originalHours)
  session = null
  originalHours = null
  await seed.cleanup()
  seed = createSeed()
})

test('the overview warns while store details are placeholders and links to settings', async ({ app, browser, screen }) => {
  // Only the hours are changed: other specs rely on the phone and WhatsApp numbers
  const s = await loginWithAdminSession(browser, seed, app)
  session = s
  originalHours = (await readStore(s)).value.hours ?? ''
  await saveHours(s, '[مواعيد العمل]')

  await app.open('/admin')
  await waitForHydration(browser)
  const warning = browser.locator('[data-testid="admin-placeholder-warning"]')
  await expect(warning).toBeVisible()
  await expect(warning).toContainText('بيانات المعرض لسه مؤقتة')
  await expect(warning).toContainText('مواعيد العمل')
  await screen.getByRole('link', 'حدّث البيانات من الإعدادات').tap()
  await expect(browser).toHaveURL(/\/admin\/settings/)

  // Real hours → no warning (when no other store field is a placeholder)
  await saveHours(s, 'يوميًا من 10 صباحًا لـ 11 مساءً')
  const remaining = Object.entries((await readStore(s)).value).filter(
    ([key, value]) => key !== 'tradersWhatsapp' && (value.trim() === '' || value.includes('[')),
  )
  await app.open('/admin')
  await waitForHydration(browser)
  if (remaining.length === 0) {
    await expect(browser.locator('[data-testid="admin-placeholder-warning"]')).toHaveCount(0)
  }
})
