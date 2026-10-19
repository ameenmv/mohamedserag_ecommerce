import { afterEach, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginWithAdminSession, waitForHydration } from './support/auth.js';
import { createSeed } from './support/seed.js';

let seed = createSeed();

afterEach(async () => {
  await seed.cleanup();
  seed = createSeed();
});

const ADMIN_MOBILE_PATHS = [
  '/admin',
  '/admin/orders',
  '/admin/products',
  '/admin/catalog',
  '/admin/catalog?tab=brands',
  '/admin/catalog?tab=spec-templates',
  '/admin/bridal',
  '/admin/promotions',
  '/admin/promotions?tab=coupons',
  '/admin/notify',
  '/en/admin',
  '/en/admin/catalog',
  '/en/admin/promotions',
  '/en/admin/notify',
] as const;

test('admin portal pages do not horizontally overflow at 320px viewport in RTL and LTR', async ({
  app,
  browser,
}) => {
  await loginWithAdminSession(browser, seed, app);
  await browser.setViewport({ width: 320, height: 700 });

  for (const path of ADMIN_MOBILE_PATHS) {
    await app.open(path);
    await waitForHydration(browser);
    const { scrollWidth, clientWidth } = await browser.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      scrollWidth,
      `Expected ${path} not to overflow horizontally at 320px viewport (scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth})`,
    ).toBeLessThanOrEqual(clientWidth);
  }
});
