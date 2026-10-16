import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { apiUrl } from './api-url.js';

test('API health reports the database is up', async () => {
  const res = await fetch(apiUrl('/api/health'));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'ok', db: 'ok' });
});

test('home renders the Arabic RTL brand shell', async ({ app, browser, screen }) => {
  await app.open('/');
  await expect(browser.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(browser.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(screen.getByRole('heading', 'معرض محمد سراج')).toBeVisible();
});

test('admin redirects to login when signed out', async ({ app, browser }) => {
  await app.open('/admin');
  await expect(browser).toHaveURL(/\/admin\/login\?next=(%2F|\/)admin/);
});

test('admin API rejects requests without a session', async () => {
  const res = await fetch(apiUrl('/api/admin/auth/me'));
  expect(res.status).toBe(401);
});
