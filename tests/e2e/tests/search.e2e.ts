import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { waitForHydration } from './support/hydration.js';

test('header search live results handles spelling variant and typo, showing Samsung fridge and category suggestion', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/');
  await waitForHydration(browser);

  // Open search sheet
  const searchTrigger = screen.getByRole('button', 'ابحث عن منتج');
  await searchTrigger.tap();

  // Type spelling variant plus typo «تلاجه سامسنج»
  const searchInput = screen.getByRole('searchbox', 'ابحث عن منتج');
  await searchInput.fill('تلاجه سامسنج');

  // Live results show Samsung fridge
  const results = screen.getByRole('dialog');
  await expect(results.getByText(/ثلاجة نوفروست/).first()).toBeVisible();
  await expect(results.getByText('سامسونج').first()).toBeVisible();

  // Category suggestion links to /c/refrigerators
  const categorySuggestion = results.getByRole('link', /ثلاجات/);
  await expect(categorySuggestion).toBeVisible();
  await expect(categorySuggestion).toHaveAttribute('href', /\/c\/refrigerators/);
});

test('search with no results shows «مفيش نتايج» and top-category links', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/');
  await waitForHydration(browser);

  // Open search sheet
  const searchTrigger = screen.getByRole('button', 'ابحث عن منتج');
  await searchTrigger.tap();

  // Fill nonsense query
  const searchInput = screen.getByRole('searchbox', 'ابحث عن منتج');
  await searchInput.fill('xyzxyz');

  // Verify empty results message
  // Shown once on screen and once in the aria-live announcement.
  await expect(screen.getByText(/مفيش نتايج/).first()).toBeVisible();

  // Top category links appear as recommendations
  await expect(screen.getByText('أشهر الأقسام')).toBeVisible();
  await expect(screen.getByRole('dialog').getByRole('link', /ثلاجات/)).toBeVisible();
});

test('submitting search form navigates to /shop?q=… with query in page heading', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/');
  await waitForHydration(browser);

  // Open search sheet
  const searchTrigger = screen.getByRole('button', 'ابحث عن منتج');
  await searchTrigger.tap();

  // Type query and submit
  const searchInput = screen.getByRole('searchbox', 'ابحث عن منتج');
  await searchInput.fill('سامسونج');

  const submitButton = screen.getByRole('button', 'بحث');
  await submitButton.tap();

  // URL navigates to /shop?q=...
  await expect(browser).toHaveURL(/\/shop\?q=/);

  // Heading contains the search query
  const pageHeading = screen.getByRole('heading', { level: 1 });
  await expect(pageHeading).toBeVisible();
  await expect(pageHeading).toContainText('سامسونج');
});
