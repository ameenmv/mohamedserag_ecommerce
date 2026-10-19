import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'
import { apiUrl } from './api-url.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

test('admin moderates reviews: pending approve and reply, unpublish to rejected, delete frees phone slot, sidebar badge and dashboard card show pending count', async ({
  app,
  screen,
  browser,
}) => {
  let ipCounter = 20
  function nextIp() {
    ipCounter++
    return `198.51.100.${ipCounter}`
  }

  // 1. Seed product A
  const productAName = `تكييف شارب تقييمات ${seed.runId}`
  const productA = await seed.product({
    name: productAName,
    priceEgp: 15000,
    stock: 4,
  })

  // 2. Submit review 1 via public API with distinct phone and X-Forwarded-For
  const phone1 = '01098765432'
  const reviewer1 = 'محمد أحمد سراج'
  const review1Text = 'تجربة ممتازة جداً والتكييف تبريده سريع وهادي ما شاء الله'

  const res1 = await fetch(apiUrl('/api/reviews'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': nextIp(),
    },
    body: JSON.stringify({
      productId: productA.id,
      stars: 4,
      text: review1Text,
      name: reviewer1,
      phone: phone1,
    }),
  })
  expect(res1.ok).toBe(true)

  // 3. Admin logs in with session
  await loginWithAdminSession(browser, seed, app)

  // 4. Admin opens /admin/reviews
  await app.open('/admin/reviews')
  await waitForHydration(browser)

  // 5. The pending tab lists review 1 with the phone
  const pendingRow = browser.locator('tbody tr').filter({ hasText: phone1 })
  await expect(pendingRow).toBeVisible()
  await expect(pendingRow).toContainText(productAName)
  await expect(pendingRow).toContainText(reviewer1)
  await expect(pendingRow).toContainText(phone1)

  // 6. Approve it
  await pendingRow.getByRole('button', 'اعتماد').tap()

  // Row leaves pending tab
  await expect(pendingRow).toBeHidden()

  // 7. Switch to approved tab
  await screen.getByRole('tab', /معتمد/).tap()
  const approvedRow = browser.locator('tbody tr').filter({ hasText: phone1 })
  await expect(approvedRow).toBeVisible()

  // 8. Add a reply «شكراً لذوقك!»
  await approvedRow.getByRole('button', /رد المعرض/).tap()
  const replyDialog = screen.getByRole('dialog')
  await expect(replyDialog).toBeVisible()

  const replyInput = browser.locator('#admin-review-reply-input')
  await replyInput.fill('شكراً لذوقك!')
  await replyDialog.getByRole('button', 'حفظ الرد').tap()
  await expect(replyDialog).toBeHidden()

  // Approved tab shows it with the reply
  await expect(approvedRow).toContainText('شكراً لذوقك!')

  // 9. In the approved tab click «إخفاء» -> it moves to the rejected tab
  await approvedRow.getByRole('button', 'إخفاء').tap()
  await expect(approvedRow).toBeHidden()

  // Switch to rejected tab
  await screen.getByRole('tab', /مرفوض/).tap()
  const rejectedRow = browser.locator('tbody tr').filter({ hasText: phone1 })
  await expect(rejectedRow).toBeVisible()

  // 10. Delete it (confirm in the custom dialog) -> gone from all tabs
  await rejectedRow.getByRole('button', 'حذف').tap()
  const deleteDialog = screen.getByRole('dialog')
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', 'حذف').tap()
  await expect(deleteDialog).toBeHidden()

  // Assert gone from rejected tab
  await expect(browser.locator('tbody tr').filter({ hasText: phone1 })).toBeHidden()

  // Assert gone from approved tab
  await screen.getByRole('tab', /معتمد/).tap()
  await expect(browser.locator('tbody tr').filter({ hasText: phone1 })).toBeHidden()

  // Assert gone from pending tab
  await screen.getByRole('tab', /بانتظار المراجعة/).tap()
  await expect(browser.locator('tbody tr').filter({ hasText: phone1 })).toBeHidden()

  // 11. POST the same phone again for product A -> 201 (slot freed)
  const resRepeat = await fetch(apiUrl('/api/reviews'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': nextIp(),
    },
    body: JSON.stringify({
      productId: productA.id,
      stars: 5,
      text: 'تقييم جديد بعد مسح القديم للتأكد من تفريغ المكان بالكامل',
      name: reviewer1,
      phone: phone1,
    }),
  })
  expect(resRepeat.status).toBe(201)

  // 12. Open dashboard /admin -> sidebar «التقييمات» shows a pending badge and dashboard card shows the count
  await app.open('/admin')
  await waitForHydration(browser)

  // Dashboard card shows the pending count (other specs may leave pending reviews, so only assert it is not empty)
  const dashboardCard = browser.locator('[data-testid="admin-dashboard-pending-reviews"]')
  await expect(dashboardCard).toBeVisible()
  await expect(dashboardCard).toContainText('تقييمات بانتظار المراجعة')
  await expect(dashboardCard).not.toContainText('مفيش تقييمات مستنية')
  await expect(dashboardCard.getByRole('link', 'راجع التقييمات')).toBeVisible()

  // Sidebar «التقييمات» shows a pending badge
  const sidebarItem = browser.locator('nav a[href$="/admin/reviews"]').first()
  await expect(sidebarItem).toBeVisible()
  await expect(sidebarItem).toContainText('تقييم مستني المراجعة')
})
