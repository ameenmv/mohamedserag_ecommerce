import type { Browser } from '@e2e-dev/web';
import type { App } from 'e2e';
import type { SeedAdminSessionResult, SeedHelper } from './seed.js';

/**
 * Injects a seeded admin session cookie into the browser context.
 */
export async function loginWithAdminSession(
  browser: Browser,
  seed: SeedHelper,
  app: App,
): Promise<SeedAdminSessionResult> {
  const session = await seed.adminSession();
  await browser.setCookies([
    {
      name: session.cookieName,
      value: session.cookieValue,
      url: app.baseUrl ?? 'http://localhost:3000',
    },
  ]);
  return session;
}

export { waitForHydration } from './hydration.js';
