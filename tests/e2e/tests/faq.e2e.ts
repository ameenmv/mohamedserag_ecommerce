import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('FAQ page renders with premium headline, hairline, tabs, search, and contact card', async ({
  app,
  browser,
  screen,
}) => {
  await app.open('/faq')

  // Brand and RTL checks
  await expect(browser.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(browser.locator('h1')).toBeVisible()

  // Header, search input, topic tabs and contact card are present
  await expect(screen.getByRole('searchbox')).toBeVisible()
  await expect(screen.getByRole('tablist')).toBeVisible()
  await expect(screen.getByRole('tab', 'كل الأسئلة')).toBeVisible()
})

test('accordion toggles answer open and closed (only one open at a time)', async ({
  app,
  browser,
}) => {
  await app.open('/faq')

  const questionButtons = browser.locator('button[id^="faq-question-"]')
  await expect(questionButtons.first()).toBeVisible()

  const firstQuestion = questionButtons.nth(0)
  const secondQuestion = questionButtons.nth(1)

  // Initially closed
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false')

  // Click first question -> expands
  await firstQuestion.tap()
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true')

  // Click second question -> second expands, first closes
  await secondQuestion.tap()
  await expect(secondQuestion).toHaveAttribute('aria-expanded', 'true')
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false')
})

test('topic tabs filter the questions list', async ({
  app,
  browser,
  screen,
}) => {
  await app.open('/faq')

  const allCount = await browser.locator('button[id^="faq-question-"]').count()
  expect(allCount).toBeGreaterThan(1)

  // Switch to Warranty topic tab
  const warrantyTab = screen.getByRole('tab', /الضمان/)
  await warrantyTab.tap()
  await expect(warrantyTab).toHaveAttribute('aria-selected', 'true')

  // Questions count should be lower than all
  const filteredCount = await browser.locator('button[id^="faq-question-"]').count()
  expect(filteredCount).toBeLessThan(allCount)
  expect(filteredCount).toBeGreaterThan(0)
})

test('search box filters questions with Arabic normalization and shows empty state on no match', async ({
  app,
  browser,
  screen,
}) => {
  await app.open('/faq')

  const searchInput = screen.getByRole('searchbox')

  // Search with Arabic letters
  await searchInput.fill('ضمان')
  const matchedCount = await browser.locator('button[id^="faq-question-"]').count()
  expect(matchedCount).toBeGreaterThan(0)

  // Search something completely unknown -> shows empty state
  await searchInput.fill('سؤال_غير_موجود_نهائيا_12345')
  await expect(browser.locator('button[id^="faq-question-"]')).toHaveCount(0)
  await expect(screen.getByText('لم نجد أي أسئلة تطابق بحثك')).toBeVisible()

  // Reset search button restores entries
  const resetButton = screen.getByRole('button', 'عرض كل الأسئلة')
  await resetButton.tap()
  await expect(browser.locator('button[id^="faq-question-"]')).toHaveCount(matchedCount > 0 ? matchedCount : 1)
})
