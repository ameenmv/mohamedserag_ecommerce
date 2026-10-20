import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { ensureStoreContact } from './support/store-contact.js'
import { createSeed, type SeedAdminSessionResult } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

interface SectionState {
  value: unknown
  version: string | null
}

interface StoreValue {
  name: string
  phone: string
  whatsapp: string
  tradersWhatsapp: string
  address: string
  hours: string
}

interface PaymentsValue {
  methods: Record<string, { enabled: boolean; name: string; account?: string | null; hint?: string | null }>
}

interface ZoneValue {
  id: string
  name: string
  fee: number
  places: { governorate: string; city?: string }[]
}

let seed = createSeed()
let session: SeedAdminSessionResult | null = null
/** Original values of the sections this test changes, restored after it. */
const originals = new Map<string, unknown>()

function adminHeaders(s: SeedAdminSessionResult): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Cookie: `${s.cookieName}=${s.cookieValue}`,
    'x-csrf-token': s.csrfToken,
  }
}

async function readSection(s: SeedAdminSessionResult, section: string): Promise<SectionState> {
  const res = await fetch(apiUrl('/api/admin/settings'), { headers: adminHeaders(s) })
  expect(res.status).toBe(200)
  const body = (await res.json()) as { sections: Record<string, SectionState> }
  const state = body.sections[section]
  if (!state) throw new Error(`settings section ${section} missing`)
  return state
}

async function saveSection(s: SeedAdminSessionResult, section: string, value: unknown): Promise<void> {
  const { version } = await readSection(s, section)
  const res = await fetch(apiUrl(`/api/admin/settings/${section}`), {
    method: 'PUT',
    headers: adminHeaders(s),
    body: JSON.stringify({ value, version }),
  })
  if (res.status !== 200) throw new Error(`saving ${section} failed (${res.status}): ${await res.text()}`)
}

afterEach(async () => {
  if (session) {
    for (const [section, value] of originals) {
      await saveSection(session, section, value)
    }
  }
  originals.clear()
  session = null
  await seed.cleanup()
  seed = createSeed()
})

test('settings changes reach the storefront: store numbers, payment methods, zone fee, template preview and a stale-save conflict', async ({
  app,
  screen,
  browser,
}) => {
  // WhatsApp links only render once the store numbers are real
  await ensureStoreContact(seed)
  const s = await loginWithAdminSession(browser, seed, app)
  session = s

  const store = (await readSection(s, 'store')).value as StoreValue
  const payments = (await readSection(s, 'payments')).value as PaymentsValue
  const zones = (await readSection(s, 'zones')).value as ZoneValue[]
  const lowStock = (await readSection(s, 'lowStock')).value
  originals.set('store', store).set('payments', payments).set('zones', zones).set('lowStock', lowStock)

  // 1. Store phone and traders WhatsApp → footer and /traders
  await saveSection(s, 'store', { ...store, phone: '01011112222', whatsapp: '01033334444', tradersWhatsapp: '01055556666' })
  // The home page is SWR-cached for 60 s (FR-016 allows a minute), so check an uncached page
  await app.open('/cart')
  await waitForHydration(browser)
  await expect(browser.locator('footer a[href^="tel:"]').first()).toHaveAttribute('href', /01011112222/)
  await app.open('/traders')
  await expect(browser.locator('main a[href*="wa.me"]').first()).toHaveAttribute('href', /201055556666/)

  // 2. Disable Vodafone Cash and change the catch-all zone fee → checkout
  await saveSection(s, 'payments', {
    methods: { ...payments.methods, vodafone_cash: { ...payments.methods.vodafone_cash, enabled: false } },
  })
  const catchAll = zones.find((zone) => zone.places.length === 0)
  if (!catchAll) throw new Error('no catch-all zone to edit')
  await saveSection(
    s,
    'zones',
    zones.map((zone) => (zone.id === catchAll.id ? { ...zone, fee: 45500 } : zone)),
  )

  const product = await seed.product({ name: `مكواة إعدادات ${seed.runId}`, priceEgp: 900, stock: 5 })
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()
  await app.open('/checkout')
  await waitForHydration(browser)
  await expect(browser.locator('input[type="radio"][value="cod"]')).toHaveCount(1)
  await expect(browser.locator('input[type="radio"][value="vodafone_cash"]')).toHaveCount(0)
  await browser.locator('#checkout-governorate').selectOption('أسوان')
  await browser.locator('#checkout-city').fill('أسوان')
  await expect(screen.getByText('455 ج.م').first()).toBeVisible()

  // 3. Template edit → live preview with sample values
  await app.open('/admin/settings?tab=templates')
  await waitForHydration(browser)
  const template = browser.locator('textarea').first()
  await template.fill('أهلاً {{customerName}}، طلبك {{orderNo}} اتأكد')
  await expect(screen.getByText('أهلاً أحمد محمد، طلبك SR-2026-000124 اتأكد').first()).toBeVisible()
  // Unsaved edits block leaving the page, so discard the template change first
  await screen.getByRole('button', 'تجاهل').tap()
  await expect(template).not.toHaveValue('أهلاً {{customerName}}، طلبك {{orderNo}} اتأكد')

  // 4. A save that another admin overtook → conflict dialog, then load the latest
  await app.open('/admin/settings?tab=lowStock')
  await waitForHydration(browser)
  const threshold = browser.locator('input[type="number"]').first()
  await expect(threshold).toBeEnabled()
  await saveSection(s, 'lowStock', { defaultThreshold: 11 })
  await threshold.fill('12')
  await screen.getByRole('button', 'احفظ').tap()
  await expect(screen.getByText('الإعدادات دي اتغيرت من مكان تاني')).toBeVisible()
  await screen.getByRole('button', 'حمّل آخر نسخة').tap()
  await expect(threshold).toHaveValue('11')
})
