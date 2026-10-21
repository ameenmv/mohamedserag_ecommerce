import type { Browser } from '@e2e-dev/web';

/**
 * Waits for the Vue / Nuxt application to mount on the client.
 * In SSR mode, initial HTML is delivered before client-side hydration completes.
 * Interacting with reactive components (clicking buttons, checking checkboxes,
 * opening sheets, submitting forms) before hydration causes event listeners to be missing.
 */
export async function waitForHydration(browser: Browser, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  // A client-side redirect or reload can replace the page while we poll; start over on the new one
  for (;;) {
    try {
      await pollHydration(browser, Math.max(deadline - Date.now(), 1000));
      return;
    } catch (error) {
      const navigated = error instanceof Error && /context was destroyed|navigation/i.test(error.message);
      if (!navigated || Date.now() >= deadline) throw error;
    }
  }
}

async function pollHydration(browser: Browser, timeoutMs: number): Promise<void> {
  await browser.evaluate(async (timeout) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      // `__vue_app__` exists as soon as Vue mounts, but Nuxt finishes hydrating later (after async
      // setup / Suspense resolves). `$nuxt.isHydrating` flips to false only when listeners are live.
      const nuxtEl = document.querySelector('#__nuxt') as {
        __vue_app__?: { config: { globalProperties: { $nuxt?: { isHydrating?: boolean } } } };
      } | null;
      const nuxtApp = nuxtEl?.__vue_app__?.config.globalProperties.$nuxt;
      if (nuxtApp && nuxtApp.isHydrating === false) {
        // Allow microtasks and reactive event listeners to settle
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Timeout waiting for Nuxt hydration');
  }, timeoutMs);
}
