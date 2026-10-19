import { afterEach, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginWithAdminSession, waitForHydration } from './support/auth.js';
import { createSeed } from './support/seed.js';

let seed = createSeed();

afterEach(async () => {
  await seed.cleanup();
  seed = createSeed();
});

// The topbar's action row and the catalog/promotions tab strips used to push every admin page
// wider than a 320px phone, in both directions.
const PATHS = [
  '/admin',
  '/admin/orders',
  '/admin/products',
  '/admin/catalog',
  '/admin/catalog?tab=brands',
  '/admin/catalog?tab=spec-templates',
  '/admin/bridal',
  '/admin/promotions',
  '/en/admin',
  '/en/admin/catalog',
  '/en/admin/promotions',
];

test('admin pages do not scroll horizontally at 320px in Arabic and English', async ({
  app,
  browser,
}) => {
  await loginWithAdminSession(browser, seed, app);
  await browser.setViewport({ width: 320, height: 700 });

  for (const path of PATHS) {
    await app.open(path);
    await waitForHydration(browser);
    const { scrollWidth, clientWidth } = await browser.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect({ path, scrollWidth }).toEqual({ path, scrollWidth: clientWidth });
  }
});
