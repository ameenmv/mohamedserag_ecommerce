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
  '/admin/reviews',
  '/admin/reports',
  '/admin/reports?tab=splits',
  '/admin/reports?tab=best-sellers',
  '/admin/reports?tab=bridal-funnel',
  '/admin/settings',
  '/admin/settings?tab=payments',
  '/admin/settings?tab=zones',
  '/admin/settings?tab=searchSynonyms',
  '/admin/settings?tab=templates',
  '/en/admin',
  '/en/admin/catalog',
  '/en/admin/promotions',
  '/en/admin/notify',
  '/en/admin/reviews',
  '/en/admin/reports',
  '/en/admin/reports?tab=splits',
  '/en/admin/settings?tab=zones',
  '/en/admin/settings?tab=templates',
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
