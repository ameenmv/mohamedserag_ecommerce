import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { apiUrl } from './api-url.js';

test('API health reports the database is up', async () => {
  const res = await fetch(apiUrl('/api/health'));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'ok', db: 'ok' });
});

test('home renders the Arabic RTL CMS home', async ({ app, browser }) => {
  await app.open('/');
  await expect(browser.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(browser.locator('html')).toHaveAttribute('lang', /^ar(-|$)/);
  // Exactly one h1: the hero title from the published home content (or the built-in default)
  await expect(browser.locator('h1')).toHaveCount(1);
  await expect(browser.locator('h1')).toBeVisible();
});

test('admin redirects to login when signed out', async ({ app, browser }) => {
  await app.open('/admin');
  await expect(browser).toHaveURL(/\/admin\/login\?next=(%2F|\/)admin/);
});

test('admin API rejects requests without a session', async () => {
  const res = await fetch(apiUrl('/api/admin/auth/me'));
  expect(res.status).toBe(401);
});
