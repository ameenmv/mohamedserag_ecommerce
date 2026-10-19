import { afterEach, test, type Browser } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { waitForHydration } from './support/hydration.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads the Product JSON-LD block from the page (other ld+json blocks may exist). */
async function readProductJsonLd(browser: Browser): Promise<Record<string, unknown>> {
  const raw = await browser.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((el) => el.textContent ?? ''),
  )
  for (const text of raw) {
    const parsed: unknown = JSON.parse(text)
    if (isRecord(parsed) && parsed['@type'] === 'Product') return parsed
  }
  throw new Error('Product JSON-LD not found')
}

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('Product A: displays approved reviews newest first, verified buyer badge, reply, JSON-LD, card rating, and no private phone leaks', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Seed Product A
  const prodAName = `منتج شاشة ذكية ${seed.runId}`
  const prodA = await seed.product({
    name: prodAName,
    priceEgp: 8500,
    stock: 10,
  })

  // Seed approved reviews 5★ (verifiedBuyer: true, reply), 4★, 3★ with increasing createdAt
  await seed.review({
    productId: prodA.id,
    name: 'سارة محمد',
    phone: '01011112222',
    stars: 5,
    text: 'شاشة ممتازة وألوان واضحة جداً وتغليف محترم وسرعة توصيل في نفس اليوم شكراً لكم',
    status: 'approved',
    verifiedBuyer: true,
    reply: 'شكراً لذوقك!',
    createdAt: '2026-10-01T10:00:00.000Z',
  })

  await seed.review({
    productId: prodA.id,
    name: 'محمود عبد الرحمن',
    phone: '01033334444',
    stars: 4,
    text: 'جهاز ممتاز وصوته نقي جداً وضمان معتمد وتعامل راقي من المعرض',
    status: 'approved',
    verifiedBuyer: false,
    createdAt: '2026-10-05T12:00:00.000Z',
  })

  await seed.review({
    productId: prodA.id,
    name: 'ياسر الشريف',
    phone: '01055556666',
    stars: 3,
    text: 'أداء مقبول وسعر مناسب في المتناول ولكن الريموت يحتاج بطاريات أقوى',
    status: 'approved',
    verifiedBuyer: false,
    createdAt: '2026-10-10T14:00:00.000Z',
  })

  // Plus one pending 1★ and one rejected 1★
  await seed.review({
    productId: prodA.id,
    name: 'عميل مستاء معلق',
    phone: '01077778888',
    stars: 1,
    text: 'تقييم معلق لم يوافق عليه بعد ولن يظهر في المتجر حالياً',
    status: 'pending',
    createdAt: '2026-10-15T08:00:00.000Z',
  })

  await seed.review({
    productId: prodA.id,
    name: 'حساب ملغي مرفوض',
    phone: '01099990000',
    stars: 1,
    text: 'تقييم مرفوض تماماً لمخالفة شروط النشر المعتمدة',
    status: 'rejected',
    createdAt: '2026-10-16T09:00:00.000Z',
  })

  // Open Product A page
  await app.open(`/p/${prodA.slug}`)
  await waitForHydration(browser)

  // Top rating and summary show «4.0» and «3 تقييمات»
  await expect(screen.getByText('4.0').first()).toBeVisible()
  await expect(screen.getByText('3 تقييمات').first()).toBeVisible()

  // The list shows exactly 3 reviews newest first (3★ text first)
  const reviewItems = browser.locator('[data-testid="review-item"]')
  await expect(reviewItems).toHaveCount(3)
  await expect(reviewItems.first()).toContainText('أداء مقبول وسعر مناسب')
  await expect(reviewItems.last()).toContainText('شاشة ممتازة وألوان واضحة')

  // One «اشترى من المعرض» badge
  await expect(screen.getByText('اشترى من المعرض')).toHaveCount(1)

  // Store reply visible
  await expect(screen.getByText('رد المعرض')).toBeVisible()
  await expect(screen.getByText('شكراً لذوقك!')).toBeVisible()

  // Pending and rejected texts are absent
  await expect(screen.getByText('تقييم معلق لم يوافق عليه بعد ولن يظهر في المتجر حالياً')).toBeHidden()
  await expect(screen.getByText('تقييم مرفوض تماماً لمخالفة شروط النشر المعتمدة')).toBeHidden()

  // JSON-LD contains aggregateRating with ratingValue 4 and reviewCount 3
  const productJsonLd = await readProductJsonLd(browser)
  expect(productJsonLd.aggregateRating).toMatchObject({
    '@type': 'AggregateRating',
    ratingValue: 4,
    reviewCount: 3,
  })

  // No phone number from the seeded reviews appears anywhere in the page HTML
  const pageHtml = await browser.evaluate(() => document.documentElement.outerHTML)
  expect(pageHtml).not.toContain('01011112222')
  expect(pageHtml).not.toContain('01033334444')
  expect(pageHtml).not.toContain('01055556666')
  expect(pageHtml).not.toContain('01077778888')
  expect(pageHtml).not.toContain('01099990000')

  // Card: open listing/search URL showing Product A -> card shows «4.0» and «3 تقييمات»
  await app.open(`/shop?q=${encodeURIComponent(prodAName)}`)
  await waitForHydration(browser)
  const cardA = browser.locator('article').filter({ hasText: prodAName })
  await expect(cardA).toBeVisible()
  await expect(cardA).toContainText('4.0')
  await expect(cardA).toContainText('3 تقييمات')
})

test('Product B: 12 approved reviews show 10 initially, «تحميل المزيد» loads all 12 and disappears', async ({
  app,
  screen,
  browser,
}) => {
  const prodBName = `منتج غسالة أوتوماتيك ${seed.runId}`
  const prodB = await seed.product({
    name: prodBName,
    priceEgp: 15000,
    stock: 15,
  })

  // Seed 12 approved reviews with ascending createdAt
  for (let i = 1; i <= 12; i++) {
    await seed.review({
      productId: prodB.id,
      name: `مشتري تجريبي ${i}`,
      phone: `0102555${String(i).padStart(4, '0')}`,
      stars: 5,
      text: `مراجعة وتقييم مفصل وتجربة تشغيل رقم ${i} للمنتج الممتاز`,
      status: 'approved',
      createdAt: new Date(Date.now() + i * 1000).toISOString(),
    })
  }

  await app.open(`/p/${prodB.slug}`)
  await waitForHydration(browser)

  const reviewItems = browser.locator('[data-testid="review-item"]')
  await expect(reviewItems).toHaveCount(10)

  const loadMoreButton = screen.getByRole('button', 'تحميل المزيد')
  await expect(loadMoreButton).toBeVisible()
  await loadMoreButton.tap()

  await expect(reviewItems).toHaveCount(12)
  await expect(loadMoreButton).toBeHidden()
})

test('Product C: with only a pending review shows empty state, no top rating, no aggregateRating in JSON-LD, and card has no rating', async ({
  app,
  screen,
  browser,
}) => {
  const prodCName = `منتج مروحة سقف ${seed.runId}`
  const prodC = await seed.product({
    name: prodCName,
    priceEgp: 950,
    stock: 10,
  })

  await seed.review({
    productId: prodC.id,
    name: 'علي عثمان',
    phone: '01044445555',
    stars: 4,
    text: 'مروحة هادئة جدا وتوزيع هواء ممتاز في انتظار اعتماد الإدارة',
    status: 'pending',
  })

  await app.open(`/p/${prodC.slug}`)
  await waitForHydration(browser)

  // Empty state visible in reviews section
  await expect(screen.getByText('لسه مفيش تقييمات — كن أول واحد يقيّم')).toBeVisible()

  // No rating link near product name/price
  await expect(browser.locator('a[href="#reviews-section"]')).toBeHidden()

  // JSON-LD has no aggregateRating
  const productJsonLd = await readProductJsonLd(browser)
  expect(productJsonLd.aggregateRating).toBeUndefined()

  // Product card on shop listing shows no «تقييم»
  await app.open(`/shop?q=${encodeURIComponent(prodCName)}`)
  await waitForHydration(browser)
  const cardC = browser.locator('article').filter({ hasText: prodCName })
  await expect(cardC).toBeVisible()
  await expect(cardC).not.toContainText('تقييم')
})
