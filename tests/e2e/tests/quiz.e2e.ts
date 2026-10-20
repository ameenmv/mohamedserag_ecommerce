import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed, type SeedAdminSessionResult } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

interface QuizResults {
  items: { product: { name: string }; reason: string | null }[]
  fallback: boolean
}

let seed = createSeed()
let session: SeedAdminSessionResult | null = null
let restore: { categoryId: string; definition: unknown } | null = null

function adminHeaders(s: SeedAdminSessionResult): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Cookie: `${s.cookieName}=${s.cookieValue}`,
    'x-csrf-token': s.csrfToken,
  }
}

async function results(answers: Record<string, string>): Promise<QuizResults> {
  const res = await fetch(apiUrl('/api/quiz/refrigerators/results'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `198.51.100.${Math.floor(Math.random() * 200) + 20}` },
    body: JSON.stringify({ answers }),
  })
  expect(res.status).toBe(200)
  return (await res.json()) as QuizResults
}

afterEach(async () => {
  // Put the seeded fridge quiz back exactly as it was
  if (session && restore) {
    await fetch(apiUrl(`/api/admin/quiz/${restore.categoryId}`), {
      method: 'PUT',
      headers: adminHeaders(session),
      body: JSON.stringify(restore.definition),
    })
  }
  restore = null
  session = null
  await seed.cleanup()
  seed = createSeed()
})

test('fridge quiz: answers give reasoned picks, all «مش متأكد» falls back to popular, an admin rule edit changes the reason', async ({
  app,
  screen,
  browser,
}) => {
  const answerQuiz = async (choices: string[]) => {
    await app.open(`/help-me-choose/refrigerators?v=${seed.runId}-${Math.random().toString(36).slice(2, 6)}`)
    await waitForHydration(browser)
    for (const [index, choice] of choices.entries()) {
      await screen.getByRole('radio', choice).tap()
      const last = index === choices.length - 1
      await screen.getByRole('button', last ? 'شوف الترشيحات' : 'التالي').tap()
    }
    await expect(screen.getByRole('heading', /ترشيحاتنا ليك/)).toBeVisible()
  }

  // 1. Big family + saving power: the storefront shows the API's top pick with its reason
  const expected = await results({ 'fridge-family': 'fridge-fam-large', 'fridge-power': 'fridge-pow-saves', 'fridge-doors': 'unsure' })
  expect(expected.fallback).toBe(false)
  const top = expected.items[0]
  if (!top?.reason) throw new Error('expected a reasoned top pick from the seeded catalog')

  await answerQuiz(['5 أو أكتر', 'آه، يفرق معايا', 'مش متأكد'])
  await expect(browser.locator('main').getByText(top.product.name).first()).toBeVisible()
  await expect(screen.getByText(`ليه رشحناه: ${top.reason}`).first()).toBeVisible()

  // 2. All «مش متأكد»: the popularity fallback with its note
  await answerQuiz(['مش متأكد', 'مش متأكد', 'مش متأكد'])
  await expect(screen.getByText(/مفيش نتيجة مطابقة تماماً/)).toBeVisible()
  await expect(screen.getByText('من الأكثر طلباً في القسم').first()).toBeVisible()

  // 3. Admin gives the big-family rule 5 points and a new reason: the top pick now explains with it
  session = await loginWithAdminSession(browser, seed, app)
  const list = await fetch(apiUrl('/api/admin/quiz'), { headers: adminHeaders(session) })
  const { items } = (await list.json()) as { items: { categoryId: string; categorySlug: string }[] }
  const fridge = items.find((row) => row.categorySlug === 'refrigerators')
  if (!fridge) throw new Error('refrigerators quiz category missing')
  const state = await fetch(apiUrl(`/api/admin/quiz/${fridge.categoryId}`), { headers: adminHeaders(session) })
  restore = { categoryId: fridge.categoryId, definition: ((await state.json()) as { definition: unknown }).definition }

  const newReason = `مساحة لكل العيلة ${seed.runId.slice(-5)}`
  await app.open('/admin/content?tab=quiz')
  await waitForHydration(browser)
  await screen.getByRole('button', /تعديل اختبار قسم «ثلاجات/).tap()
  await expect(browser.locator('#quiz-rule-reason-0')).toBeVisible()
  await browser.locator('#quiz-rule-points-0').fill('5')
  await browser.locator('#quiz-rule-reason-0').fill(newReason)
  await screen.getByRole('button', 'احفظ').tap()
  await expect(screen.getByText('اتحفظ الاختبار')).toBeVisible()

  await answerQuiz(['5 أو أكتر', 'مش متأكد', 'مش متأكد'])
  await expect(screen.getByText(`ليه رشحناه: ${newReason}`).first()).toBeVisible()
})
