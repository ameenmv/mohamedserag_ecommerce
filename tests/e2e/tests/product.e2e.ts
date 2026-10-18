import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { waitForHydration } from './support/hydration.js';

test('/p/samsung-fridge-450l-s1 shows h1, model code, VAT note, specs table, and WhatsApp link', async ({
  app,
  screen,
}) => {
  await app.open('/p/samsung-fridge-450l-s1');

  // H1 contains product name
  await expect(screen.getByRole('heading', { level: 1 })).toContainText('ثلاجة نوفروست بابين 450 لتر');

  // Model code is displayed
  await expect(screen.getByText(/الموديل:\s*SR-S1/)).toBeVisible();

  // VAT notice is present
  // The VAT note shows in the buy box (and again in the sticky bar), so take the first.
  await expect(screen.getByText('الأسعار شاملة ضريبة القيمة المضافة').first()).toBeVisible();

  // Specs table contains rows from the refrigerators template
  await expect(screen.getByRole('rowheader', 'السعة باللتر')).toBeVisible();
  await expect(screen.getByRole('rowheader', 'نظام التبريد')).toBeVisible();

  // WhatsApp link points to wa.me and contains the encoded product name
  const whatsappLink = screen.getByRole('link', 'اسأل على واتساب');
  await expect(whatsappLink).toBeVisible();

  const href = await whatsappLink.getAttribute('href');
  expect(href).toMatch(/^https:\/\/wa\.me\//);
  expect(decodeURIComponent(href ?? '')).toContain('ثلاجة نوفروست بابين 450 لتر');
});

test('quantity stepper plus add to cart updates header cart badge and localStorage', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/p/samsung-fridge-450l-s1');
  await waitForHydration(browser);

  // Increase quantity to 2
  const increaseButton = screen.getByRole('button', 'زيادة الكمية');
  await increaseButton.tap();
  await expect(screen.getByRole('group', 'الكمية')).toContainText('2');

  // Add to cart
  // Related-product cards and the sticky bar also have «أضف للسلة»; use the buy box button.
  const addToCartButton = browser.locator('#main-add-to-cart-button');
  await addToCartButton.tap();

  // The header cart badge reflects quantity 2
  const cartLink = screen.getByRole('link', /السلة:\s*2/);
  await expect(cartLink).toBeVisible();

  // LocalStorage serag:cart:v1 records quantity 2
  const cartJson = await browser.evaluate(() => localStorage.getItem('serag:cart:v1'));
  expect(cartJson).toBeTruthy();
  const cartItems = JSON.parse(cartJson!);
  expect(cartItems).toHaveLength(1);
  expect(cartItems[0].qty).toBe(2);
});

test('out-of-stock product edessa-cookware-7pc-c6 disables add button and displays set contents', async ({
  app,
  screen,
}) => {
  await app.open('/p/edessa-cookware-7pc-c6');

  // Add button is disabled with out-of-stock copy «نفذ»
  const outOfStockButton = screen.getByRole('button', 'نفذ');
  await expect(outOfStockButton).toBeVisible();
  await expect(outOfStockButton).toBeDisabled();

  // Set contents section «محتويات الطقم» is visible
  await expect(screen.getByRole('heading', 'محتويات الطقم')).toBeVisible();
});

test('unknown product /p/nope shows the 404 page', async ({ app, screen }) => {
  await app.open('/p/nope');
  await expect(screen.getByText(/404/)).toBeVisible();
});
