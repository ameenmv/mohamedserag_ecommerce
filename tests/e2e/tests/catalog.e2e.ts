import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { waitForHydration } from './support/hydration.js';

test('category page displays heading, lists product cards, filters by brand, and clears filter chip', async ({
  app,
  screen,
  browser,
}) => {
  // Desktop sidebar filters; the phone filter sheet has its own test below (CI reruns journeys at 375/320 px)
  await browser.setViewport({ width: 1280, height: 720 });
  await app.open('/c/refrigerators');
  await waitForHydration(browser);

  // Heading shows category name
  await expect(screen.getByRole('heading', 'ثلاجات وفريزر')).toBeVisible();

  // Product cards are listed
  await expect(browser.locator('article').first()).toBeVisible();
  const initialCount = await browser.locator('article').count();
  expect(initialCount).toBeGreaterThan(0);

  // Ticking the Samsung brand filter updates the URL to ?brand=samsung
  const samsungCheckbox = screen.getByRole('checkbox', /سامسونج/);
  await samsungCheckbox.check();
  await expect(browser).toHaveURL(/brand=samsung/);

  // Every card shows the brand سامسونج
  await expect(browser.locator('article').first()).toBeVisible();
  const brandLabels = await browser.locator('article span.text-serag-gold').allTextContents();
  expect(brandLabels.length).toBeGreaterThan(0);
  for (const brand of brandLabels) {
    expect(brand.trim()).toBe('سامسونج');
  }

  // The Samsung filter chip appears, and removing it clears the URL
  const removeChipButton = screen.getByRole('button', /إزالة فلتر سامسونج/);
  await expect(removeChipButton).toBeVisible();
  await removeChipButton.tap();
  await expect(browser).not.toHaveURL(/brand=samsung/);
});

test('filters survive a reload with sort value and ascending prices', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/c/refrigerators?brand=samsung&sort=price_asc');

  // The sort select shows price_asc
  const sortSelect = screen.getByLabel(/ترتيب حسب/);
  await expect(sortSelect).toHaveValue('price_asc');

  // Verify prices on cards are in ascending order
  await expect(browser.locator('article').first()).toBeVisible();
  const prices = await browser.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('article'));
    return cards
      .map((card) => {
        // The current price (cards with reviews also show a numeric rating count)
        const numEl = card.querySelector('[data-price]');
        return numEl ? parseInt(numEl.textContent?.replace(/[^\d]/g, '') || '0', 10) : 0;
      })
      .filter((p) => p > 0);
  });

  expect(prices.length).toBeGreaterThan(1);
  for (let i = 1; i < prices.length; i++) {
    expect(prices[i]!).toBeGreaterThanOrEqual(prices[i - 1]!);
  }
});

test('mobile viewport filter button opens bottom sheet, live count updates, and applying updates URL', async ({
  app,
  screen,
  browser,
}) => {
  await browser.setViewport({ width: 375, height: 812 });
  await app.open('/c/refrigerators');
  await waitForHydration(browser);

  // The «فلترة» button opens the bottom sheet
  const mobileFilterButton = screen.getByRole('button', 'فلترة');
  await expect(mobileFilterButton).toBeVisible();
  await mobileFilterButton.tap();

  const sheet = screen.getByRole('dialog');
  await expect(sheet).toBeVisible();

  // Ticking a brand updates the live count on the apply button
  const samsungCheckbox = sheet.getByRole('checkbox', /سامسونج/);
  await samsungCheckbox.check();

  const applyButton = screen.getByRole('button', /اعرض \d+ منتج/);
  await expect(applyButton).toBeVisible();

  // Applying updates the URL
  await applyButton.tap();
  await expect(browser).toHaveURL(/brand=samsung/);
});

test('unknown category /c/nope shows the 404 page', async ({ app, screen }) => {
  await app.open('/c/nope');
  await expect(screen.getByText(/404/)).toBeVisible();
  await expect(screen.getByRole('heading', 'الصفحة دي مش موجودة')).toBeVisible();
  await expect(screen.getByRole('button', 'تسوّق كل المنتجات')).toBeVisible();
});

test('/en/c/refrigerators renders dir="ltr" with English UI text', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/en/c/refrigerators');

  await expect(browser.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(browser.locator('html')).toHaveAttribute('lang', /^en(-|$)/);

  // English UI elements are present
  await expect(screen.getByRole('navigation', 'Breadcrumb').getByRole('link', 'Home')).toBeVisible();
  await expect(screen.getByLabel(/Sort by/)).toBeVisible();
});
