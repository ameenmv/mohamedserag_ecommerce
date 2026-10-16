import { afterEach, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { createSeed } from './support/seed.js';

let seed = createSeed();

afterEach(async () => {
  await seed.cleanup();
  seed = createSeed();
});

test('seeds a product and enters admin dashboard with admin session cookie', async ({
  app,
  browser,
  screen,
}) => {
  const product = await seed.product({
    name: 'شاشة تجريبية لاختبار الجلسة',
    priceEgp: 12000,
  });

  expect(product.id).toBeDefined();
  expect(product.slug).toBe(`e2e-${seed.runId}-1`);
  expect(product.modelCode).toBe(`E2E-${seed.runId}-1`);
  expect(product.price).toBe(1200000);

  const session = await seed.adminSession();
  expect(session.cookieName).toBe('serag_sid');
  expect(session.cookieValue).toBeDefined();

  await browser.setCookies([
    {
      name: session.cookieName,
      value: session.cookieValue,
      url: app.baseUrl ?? 'http://localhost:3000',
    },
  ]);

  await app.open('/admin');
  await expect(screen.getByRole('heading', /أهلاً/)).toBeVisible();
});
