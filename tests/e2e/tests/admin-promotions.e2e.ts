import { afterEach, test } from '@e2e-dev/web'
import { expect } from 'e2e'
import { createSeed } from './support/seed.js'
import { loginWithAdminSession, waitForHydration } from './support/auth.js'

let seed = createSeed()

afterEach(async () => {
  await seed.cleanup()
  seed = createSeed()
})

function toLocalDatetimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

test('admin creates flash sale via UI, storefront shows sale price and badge, ending sale reverts storefront to regular price', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Admin logs in with session
  await loginWithAdminSession(browser, seed, app)

  // 2. Seed a product (8,000 EGP, stock 3)
  const productName = `تلفزيون سامسونج فلاش ${seed.runId}`
  const product = await seed.product({
    name: productName,
    priceEgp: 8000,
    stock: 3,
  })

  // 3. Admin opens /admin/promotions
  await app.open('/admin/promotions')
  await waitForHydration(browser)

  // 4. Click «عرض جديد»
  await screen.getByRole('button', 'عرض جديد').first().tap()

  // 5. Fill flash sale sheet
  const flashSaleName = `عرض فلاش ${seed.runId}`
  await browser.locator('#flash-name').fill(flashSaleName)

  const startStr = toLocalDatetimeInputValue(new Date(Date.now() - 5 * 60_000))
  const endStr = toLocalDatetimeInputValue(new Date(Date.now() + 2 * 3600_000))
  await browser.locator('#flash-starts-at').fill(startStr)
  await browser.locator('#flash-ends-at').fill(endStr)

  // 6. Add product via product picker
  await screen.getByRole('button', 'إضافة منتج').first().tap()
  const pickerDialog = screen.getByRole('dialog', 'إضافة منتج لعرض الفلاش')
  await expect(pickerDialog).toBeVisible()

  await pickerDialog.getByRole('searchbox').fill(product.modelCode)
  await pickerDialog.getByText(productName).tap()
  await expect(pickerDialog).toBeHidden()

  // 7. Enter sale price 6,350
  const priceInput = browser.locator('[data-testid="flash-item-price"]').first()
  await priceInput.fill('6350')

  // 8. Save flash sale
  await screen.getByRole('button', 'إنشاء').first().tap()

  // 9. Assert row shows «شغال» (running) status
  const saleRow = browser.locator('tr').filter({ hasText: flashSaleName })
  await expect(saleRow).toBeVisible()
  await expect(saleRow.getByText('شغال')).toBeVisible()

  // 10. Storefront /p/<slug> shows 6,350 and flash badge
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)

  const productMain = browser.locator('main').first()
  await expect(productMain).toContainText('6,350')
  await expect(productMain).toContainText('عرض لفترة محدودة')

  // 11. Back in admin: «إنهاء العرض دلوقتي»
  await app.open('/admin/promotions')
  await waitForHydration(browser)

  const adminSaleRow = browser.locator('tr').filter({ hasText: flashSaleName })
  await expect(adminSaleRow).toBeVisible()
  await adminSaleRow.getByRole('button', 'إنهاء العرض دلوقتي').tap()

  // 12. Confirm in custom dialog
  const confirmDialog = screen.getByRole('dialog')
  await expect(confirmDialog).toBeVisible()
  await confirmDialog.getByRole('button', 'إنهاء العرض دلوقتي').tap()
  await expect(confirmDialog).toBeHidden()

  // 13. Status is now ended «منتهي»
  await expect(adminSaleRow.getByText('منتهي')).toBeVisible()

  // 14. Storefront shows regular price 8,000 again without flash badge
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)

  const productMainAfter = browser.locator('main').first()
  await expect(productMainAfter).toContainText('8,000')
  await expect(productMainAfter).not.toContainText('6,350')
  await expect(productMainAfter).not.toContainText('العرض بيخلص خلال')
})

test('admin creates coupon via UI, shopper applies it at checkout with -600 discount, admin deletes coupon', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Admin logs in with session
  await loginWithAdminSession(browser, seed, app)

  // 2. Seed a 6,000 EGP product for checkout
  const product = await seed.product({
    name: `غسالة ال جي كوبون ${seed.runId}`,
    priceEgp: 6000,
    stock: 5,
  })

  // 3. Admin opens /admin/promotions
  await app.open('/admin/promotions')
  await waitForHydration(browser)

  // 4. Switch to Coupons tab
  await screen.getByRole('tab', 'كوبونات الخصم').tap()
  await expect(browser).toHaveURL(/tab=coupons/)

  // 5. Click «كوبون جديد»
  await screen.getByRole('button', 'كوبون جديد').first().tap()

  // 6. Fill coupon code and percent value 10
  const couponCode = `E2E-${seed.runId.slice(-8).toUpperCase()}-UI`
  await browser.locator('#coupon-code').fill(couponCode)
  await browser.locator('#coupon-value').fill('10')

  // 7. Save coupon
  await screen.getByRole('button', 'إنشاء').first().tap()

  // 8. Assert row visible with status «شغال» and «0 / ∞»
  const couponRow = browser.locator('tr').filter({ hasText: couponCode })
  await expect(couponRow).toBeVisible()
  await expect(couponRow.getByText('شغال')).toBeVisible()
  await expect(couponRow.getByText(/0 \/ ∞/)).toBeVisible()

  // 9. Shopper adds product to cart
  await app.open(`/p/${product.slug}`)
  await waitForHydration(browser)
  await browser.locator('#main-add-to-cart-button').tap()
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible()

  // 10. Open /checkout and fill Talkha form
  await app.open('/checkout')
  await waitForHydration(browser)

  await browser.locator('#checkout-name').fill('محمود أحمد سراج')
  await browser.locator('#checkout-phone').fill('01012345678')
  await browser.locator('#checkout-governorate').selectOption('الدقهلية')
  await browser.locator('#checkout-city').fill('طلخا')
  await browser.locator('#checkout-address').fill('شارع البحر بجوار كوبري طلخا')
  await expect(screen.getByText('100 ج.م').first()).toBeVisible()
  await browser.locator('input[type="radio"][value="cod"]').check()

  // 11. Open coupon box, apply code
  await screen.getByText('عندك كود خصم؟').tap()
  const couponInput = browser.locator('#checkout-coupon')
  await expect(couponInput).toBeVisible()
  await couponInput.fill(couponCode)
  await screen.getByRole('button', 'تطبيق').tap()

  // 12. Assert «تم تطبيق الكود» and -600 discount
  await expect(screen.getByText(/تم تطبيق الكود/)).toBeVisible()
  await expect(screen.getByText('-600 ج.م').first()).toBeVisible()

  // 13. Back in admin: delete coupon
  await app.open('/admin/promotions?tab=coupons')
  await waitForHydration(browser)

  const adminCouponRow = browser.locator('tr').filter({ hasText: couponCode })
  await expect(adminCouponRow).toBeVisible()
  await adminCouponRow.getByRole('button', 'حذف الكوبون').tap()

  // 14. Confirm delete in dialog
  const deleteDialog = screen.getByRole('dialog')
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', 'حذف').tap()
  await expect(deleteDialog).toBeHidden()

  // 15. Assert row is gone
  await expect(browser.locator('tr').filter({ hasText: couponCode })).toBeHidden()
})

test('flash sale validation: sale price greater than or equal to regular price shows inline error and does not save', async ({
  app,
  screen,
  browser,
}) => {
  // 1. Admin logs in
  await loginWithAdminSession(browser, seed, app)

  // 2. Seed a product (8,000 EGP, stock 3)
  const productName = `بوتاجاز فريش تحقق ${seed.runId}`
  const product = await seed.product({
    name: productName,
    priceEgp: 8000,
    stock: 3,
  })

  // 3. Open /admin/promotions and click «عرض جديد»
  await app.open('/admin/promotions')
  await waitForHydration(browser)
  await screen.getByRole('button', 'عرض جديد').first().tap()

  // 4. Fill name and dates
  const flashSaleName = `عرض غير صالح ${seed.runId}`
  await browser.locator('#flash-name').fill(flashSaleName)

  const startStr = toLocalDatetimeInputValue(new Date(Date.now() - 5 * 60_000))
  const endStr = toLocalDatetimeInputValue(new Date(Date.now() + 2 * 3600_000))
  await browser.locator('#flash-starts-at').fill(startStr)
  await browser.locator('#flash-ends-at').fill(endStr)

  // 5. Add product via picker
  await screen.getByRole('button', 'إضافة منتج').first().tap()
  const pickerDialog = screen.getByRole('dialog', 'إضافة منتج لعرض الفلاش')
  await expect(pickerDialog).toBeVisible()
  await pickerDialog.getByRole('searchbox').fill(product.modelCode)
  await pickerDialog.getByText(productName).tap()

  // 6. Set sale price >= regular price (8500 >= 8000)
  const priceInput = browser.locator('[data-testid="flash-item-price"]').first()
  await priceInput.fill('8500')

  // 7. Click save
  await screen.getByRole('button', 'إنشاء').first().tap()

  // 8. Assert inline error is displayed
  await expect(
    screen.getByText('سعر العرض لازم يكون أقل من السعر الأصلي'),
  ).toBeVisible()

  // 9. Sheet remains open and input is still present
  await expect(browser.locator('#flash-name')).toBeVisible()
})
