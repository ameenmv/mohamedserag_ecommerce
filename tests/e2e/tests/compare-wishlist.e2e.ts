import { afterEach, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { createSeed } from './support/seed.js';
import { waitForHydration } from './support/hydration.js';


// Stable seeded catalog fridges. Tests running in parallel seed (and then delete) their own products
// in the same category, so "the first card" can be another test's temporary product.
const CATALOG_FRIDGES = [
  'ثلاجة ديفروست 14 قدم',
  'ثلاجة ديفروست 350 لتر',
  'ثلاجة نوفروست بابين 450 لتر',
  'ثلاجة نوفروست ديجيتال 400 لتر',
] as const;

let seed = createSeed();

afterEach(async () => {
  await seed.cleanup();
  seed = createSeed();
});

test('compare: adding 2 products shows compare bar and navigates to compare table with price and spec rows', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/c/refrigerators');
  await waitForHydration(browser);

  // Add 2 products to compare
  for (const [i, name] of CATALOG_FRIDGES.slice(0, 2).entries()) {
    await browser.locator(`button[aria-label="إضافة ${name} للمقارنة"]`).tap();
    await expect(screen.getByRole('link', `المقارنة: ${i + 1}`)).toBeVisible();
  }

  // The compare bar appears with count 2
  const compareBarLink = screen.getByRole('link', 'قارن (2)');
  await expect(compareBarLink).toBeVisible();

  // Go to /compare
  await compareBarLink.tap();
  await expect(browser).toHaveURL(/\/compare/);

  // Table rows include السعر and a refrigerator spec label
  await expect(screen.getByRole('rowheader', 'السعر')).toBeVisible();
  await expect(screen.getByRole('rowheader', 'السعة باللتر')).toBeVisible();
});

test('replace dialog: adding a 4th product opens replacement dialog and choosing one keeps count at 3', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/c/refrigerators');
  await waitForHydration(browser);

  for (const [i, name] of CATALOG_FRIDGES.slice(0, 3).entries()) {
    await browser.locator(`button[aria-label="إضافة ${name} للمقارنة"]`).tap();
    await expect(screen.getByRole('link', `المقارنة: ${i + 1}`)).toBeVisible();
  }

  // Adding a 4th product opens the «تبدّل أنهي منتج؟» dialog
  await browser.locator(`button[aria-label="إضافة ${CATALOG_FRIDGES[3]} للمقارنة"]`).tap();
  await expect(screen.getByRole('heading', 'تبدّل أنهي منتج؟')).toBeVisible();

  // Choose one to replace
  const replaceButton = browser.locator('div[role="dialog"] button[aria-label*="استبدال"]').first();
  await replaceButton.tap();

  // Dialog closes and count remains at 3
  await expect(screen.getByRole('link', 'قارن (3)')).toBeVisible();
});

test('wishlist price drop badge is visible and moving to cart removes wishlist entry and increments cart badge', async ({
  app,
  screen,
  browser,
}) => {
  const product = await seed.product({
    name: `ثلاجة عائلية للتجربة ${seed.runId}`,
    priceEgp: 15000,
  });

  // Navigate to app origin to seed localStorage
  await app.open('/');
  await browser.evaluate(
    (item) => {
      localStorage.setItem('serag:wishlist:v1', JSON.stringify([item]));
    },
    {
      productId: product.id,
      priceAtAdd: 1800000, // 18,000 EGP in piastres (higher than current price of 15,000 EGP)
      addedAt: Date.now(),
    },
  );

  // Open wishlist page
  await app.open('/wishlist');

  // «السعر نزل» badge is visible
  await expect(screen.getByText('السعر نزل')).toBeVisible();

  // Move product to cart via «انقل للسلة»
  const moveToCartButton = screen.getByRole('button', /انقل.*للسلة/);
  await moveToCartButton.tap();

  // Header cart badge increases to 1
  await expect(screen.getByRole('link', /السلة:\s*1/)).toBeVisible();

  // Wishlist entry is removed
  await expect(screen.getByText('السعر نزل')).toBeHidden();
});
