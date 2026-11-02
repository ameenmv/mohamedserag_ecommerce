import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { ensureStoreContact } from './support/store-contact.js'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'
import { apiUrl } from './api-url.js'
import { BRIDAL_SKIP } from './support/features.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('bridal share: view mode omits edit controls, reveals showroom contact, suppresses editToken over API, and handles unknown token', { skip: BRIDAL_SKIP }, async ({
  app,
  screen,
  browser,
}) => {
  // WhatsApp links only render once the store numbers are real
  await ensureStoreContact(seed)
  // 1. Create a list via API with a seeded product
  const product = await seed.product({
    name: `ثلاجة مشاركة تجربة ${seed.runId}`,
    categorySlug: 'refrigerators',
    priceEgp: 18000,
    stock: 5,
  })

  const createRes = await fetch(apiUrl('/api/bridal/lists'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product.id }),
  })
  expect(createRes.status).toBe(201)
  const { editToken } = (await createRes.json()) as { editToken: string }

  // 2. Read shareToken via GET with the edit token
  const getRes = await fetch(apiUrl(`/api/bridal/lists/${editToken}`))
  expect(getRes.status).toBe(200)
  const view = (await getRes.json()) as { shareToken: string; editToken?: string }
  const shareToken = view.shareToken
  expect(shareToken).toBeDefined()
  expect(view.editToken).toBe(editToken)

  // 3. Open share URL in the browser
  await app.open(`/bridal/${shareToken}`)
  await waitForHydration(browser)

  // 4. Assert read-only view: no swap, remove, or stepper controls
  await expect(browser.locator('button[aria-label*="تبديل"]')).toHaveCount(0)
  await expect(browser.locator('button[aria-label*="إزالة"]')).toHaveCount(0)
  await expect(browser.locator('button[aria-label*="زيادة"]')).toHaveCount(0)
  await expect(browser.locator('button[aria-label*="تقليل"]')).toHaveCount(0)

  // 5. Assert «كلّموا المعرض» WhatsApp button is visible
  await expect(screen.getByText('كلّموا المعرض')).toBeVisible()

  // 6. Direct HTTP fetch of shareToken MUST NOT return editToken
  const shareApiRes = await fetch(apiUrl(`/api/bridal/lists/${shareToken}`))
  expect(shareApiRes.status).toBe(200)
  const shareData = (await shareApiRes.json()) as Record<string, unknown>
  expect(shareData).not.toHaveProperty('editToken')

  // 7. Open not-found token URL and assert friendly error page
  await app.open('/bridal/not-a-real-token-xxxxxxxxxxxxxxxx')
  await waitForHydration(browser)
  await expect(screen.getByText('القايمة دي مش موجودة')).toBeVisible()
})
