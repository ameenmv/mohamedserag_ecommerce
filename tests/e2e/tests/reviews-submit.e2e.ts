import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/auth.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('shopper submits review, handles validation, analytics without PII, duplicate refusal, and keyboard navigation', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed product and open its product page
  const product = await seed.product({
    name: `منتج اختبار تقييمات ${seed.runId}`,
    priceEgp: 3500,
    stock: 10,
  })

  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)

  // 2. Reviews section and «اكتب تقييمك» button are visible
  await expect(screen.getByRole('heading', { name: 'التقييمات' })).toBeVisible()
  const writeReviewBtn = screen.getByRole('button', 'اكتب تقييمك')
  await expect(writeReviewBtn).toBeVisible()

  // Open the review form
  await writeReviewBtn.tap()

  // 3. Client-side validation: submit without stars and short text (10 chars)
  await browser.locator('#review-text').fill('1234567890')
  await screen.getByRole('button', 'إرسال التقييم').tap()

  await expect(screen.getByText('اختار عدد النجوم')).toBeVisible()
  await expect(screen.getByText('التقييم لازم يكون 20 حرف على الأقل')).toBeVisible()

  // 4. Stub Umami analytics before valid submission to verify funnel event without PII
  await browser.evaluate(() => {
    const w = window as unknown as {
      __events: Array<{ event: string; data?: Record<string, unknown> }>
      umami: unknown
    }
    w.__events = []
    w.umami = { track: (event: string, data?: Record<string, unknown>) => w.__events.push({ event, data }) }
  })

  // 5. Pick 4 stars, valid text (≥ 20 chars), name, and Egyptian mobile in Arabic digits «٠١٠١٢٣٤٥٦٧٨»
  await browser.locator('label[for="review-star-4"]').tap()
  await expect(browser.locator('#review-star-4')).toBeChecked()

  // Keyboard: arrow keys move the selection within the star radiogroup (direction follows RTL/LTR)
  await browser.locator('#review-star-4').focus()
  await browser.locator('#review-star-4').press('ArrowRight')
  await expect(browser.locator('#review-star-4')).not.toBeChecked()
  await browser.locator('input[name="review-stars"]:checked').press('ArrowLeft')
  await expect(browser.locator('#review-star-4')).toBeChecked()

  await browser.locator('#review-text').fill('منتج ممتاز جداً وخامة عالية وضمان معتمد وأنصح بالشراء')
  await browser.locator('#review-name').fill('أحمد سراج')
  await browser.locator('#review-phone').fill('٠١٠١٢٣٤٥٦٧٨')

  // Submit valid review (POST 1 of 2)
  await screen.getByRole('button', 'إرسال التقييم').tap()

  // 6. Assert thank-you confirmation message is visible
  await expect(screen.getByText('شكراً! تقييمك هيظهر بعد المراجعة')).toBeVisible()

  // 7. Assert exactly one review_submitted event fired with only productId and stars = 4 (no PII)
  const events = await browser.evaluate(() =>
    (window as unknown as { __events: Array<{ event: string; data?: Record<string, unknown> }> }).__events.map(
      (e) => ({ event: e.event, data: e.data ?? null }),
    ),
  )
  const reviewEvents = events.filter((e) => e.event === 'review_submitted')
  expect(reviewEvents).toHaveLength(1)
  expect(reviewEvents[0]!.data).toEqual({ productId: product.id, stars: 4 })
  expect(JSON.stringify(events)).not.toMatch(/01012345678|٠١٠١٢٣٤٥٦٧٨|أحمد سراج|ممتاز/)

  // 8. Scenario 2: Reload the page, open the form again, submit with the same phone -> «انت قيّمت المنتج ده قبل كده»
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)

  await screen.getByRole('button', 'اكتب تقييمك').tap()
  await browser.locator('label[for="review-star-5"]').tap()
  await expect(browser.locator('#review-star-5')).toBeChecked()

  await browser.locator('#review-text').fill('محاولة ثانية بنفس رقم الهاتف لاختبار منع التكرار تماماً')
  await browser.locator('#review-name').fill('أحمد سراج')
  await browser.locator('#review-phone').fill('٠١٠١٢٣٤٥٦٧٨')

  // Submit duplicate review (POST 2 of 2)
  await screen.getByRole('button', 'إرسال التقييم').tap()

  // Assert duplicate inline error message and disabled submit button
  await expect(screen.getByText('انت قيّمت المنتج ده قبل كده')).toBeVisible()
  await expect(screen.getByRole('button', 'إرسال التقييم')).toBeDisabled()
})
