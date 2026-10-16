import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('wrong password shows the generic error', async ({ app, screen, browser }) => {
  await app.open('/admin/login');
  await screen.getByLabel('البريد الإلكتروني').fill('nobody@serag.local');
  await screen.getByLabel('كلمة المرور').fill('wrong-password');
  await screen.getByRole('button', 'دخول').tap();
  await expect(screen.getByText('البريد أو كلمة المرور غير صحيحة')).toBeVisible();
  await expect(browser).toHaveURL(/\/admin\/login/);
});

test('seeded admin signs in and lands on the dashboard', async ({ app, screen, browser }) => {
  const admin = credentials.user('admin');
  await app.open('/admin/login');
  await screen.getByLabel('البريد الإلكتروني').fill(admin.username);
  await screen.getByLabel('كلمة المرور').fill(admin.password);
  await screen.getByRole('button', 'دخول').tap();
  await expect(browser).toHaveURL(/\/admin$/);
  await expect(screen.getByText(/أهلاً/)).toBeVisible();
});
