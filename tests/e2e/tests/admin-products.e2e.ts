import { afterEach, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginWithAdminSession, waitForHydration } from './support/auth.js';
import { createSeed } from './support/seed.js';

let seed = createSeed();

afterEach(async () => {
  await seed.cleanup();
  seed = createSeed();
});

test('create product through UI, verify preview, save, land on detail page, and delete via UI', async ({
  app,
  screen,
  browser,
}) => {
  await loginWithAdminSession(browser, seed, app);
  await app.open('/admin/products/new');
  await waitForHydration(browser);

  const productName = `ثلاجة تجربة إضافة ${seed.runId}`;
  const modelCode = `E2E-${seed.runId}-ui`;

  // Fill basic product information
  await screen.getByLabel('اسم المنتج').fill(productName);
  await screen.getByLabel('كود الموديل').fill(modelCode);
  await screen.getByLabel('القسم').selectOption({ label: 'ثلاجات وفريزر' });
  await screen.getByLabel('الماركة').selectOption({ label: 'سامسونج' });
  await screen.getByLabel('سعر البيع (ج.م)').fill('25000');

  // Fill technical specs from refrigerators template
  await screen.getByLabel('السعة باللتر').fill('400');
  await screen.getByLabel('نظام التبريد').selectOption({ label: 'نوفروست' });

  // Live preview card shows the typed name before saving
  await expect(screen.getByRole('complementary', 'معاينة كارت المنتج')).toContainText(productName);

  // Save the product
  // The button's accessible name also includes its «Ctrl+S» hint.
  const createButton = screen.getByRole('button', /إضافة المنتج/);
  await createButton.tap();

  // Lands on /admin/products/<id> with success toast
  await expect(browser).toHaveURL(/\/admin\/products\/[a-zA-Z0-9_-]+$/);
  await expect(screen.getByText('تم إضافة المنتج بنجاح')).toBeVisible();

  // Clean up: delete through the UI
  await app.open('/admin/products');
  await waitForHydration(browser);
  await screen.getByPlaceholder('اسم المنتج أو كود الموديل...').fill(modelCode);

  const rowActionBtn = screen.getByRole('button', {
    name: new RegExp(`إجراءات المنتج «${productName}»`),
  });
  await expect(rowActionBtn).toBeVisible();
  await rowActionBtn.tap();

  await screen.getByRole('menuitem', 'حذف').tap();
  await screen.getByRole('button', 'نعم، احذف').tap();

  await expect(screen.getByText(new RegExp(`تم حذف «${productName}» بنجاح`))).toBeVisible();
});

test('delete protection: product in an order shows «لا يمكن حذف المنتج» dialog with «أرشفة بدلاً من الحذف»', async ({
  app,
  screen,
  browser,
}) => {
  const productName = `منتج محمي بطلب ${seed.runId}`;
  const product = await seed.product({
    name: productName,
    priceEgp: 5000,
  });

  await seed.order({
    items: [{ productId: product.id, qty: 1 }],
    paymentMethod: 'cod',
    status: 'confirmed',
  });

  await loginWithAdminSession(browser, seed, app);
  await app.open('/admin/products');
  await waitForHydration(browser);

  await screen.getByPlaceholder('اسم المنتج أو كود الموديل...').fill(product.modelCode);

  const rowActionBtn = screen.getByRole('button', {
    name: new RegExp(`إجراءات المنتج «${productName}»`),
  });
  await expect(rowActionBtn).toBeVisible();
  await rowActionBtn.tap();

  await screen.getByRole('menuitem', 'حذف').tap();
  await screen.getByRole('button', 'نعم، احذف').tap();

  // Dialog appears indicating deletion is forbidden
  await expect(screen.getByRole('heading', 'لا يمكن حذف المنتج')).toBeVisible();
  await expect(screen.getByRole('button', 'أرشفة بدلاً من الحذف')).toBeVisible();

  // Close the dialog
  await screen.getByRole('button', 'إغلاق').tap();
  await expect(screen.getByRole('heading', 'لا يمكن حذف المنتج')).toBeHidden();
});

test('archive with undo on a seeded product restores product from archive', async ({
  app,
  screen,
  browser,
}) => {
  const productName = `منتج أرشيف وتراجع ${seed.runId}`;
  const product = await seed.product({
    name: productName,
    priceEgp: 8000,
  });

  await loginWithAdminSession(browser, seed, app);
  await app.open('/admin/products');
  await waitForHydration(browser);

  await screen.getByPlaceholder('اسم المنتج أو كود الموديل...').fill(product.modelCode);

  const rowActionBtn = screen.getByRole('button', {
    name: new RegExp(`إجراءات المنتج «${productName}»`),
  });
  await expect(rowActionBtn).toBeVisible();
  await rowActionBtn.tap();

  // Archive product
  await screen.getByRole('menuitem', 'أرشفة').tap();

  // Toast displays «تراجع» button
  const undoButton = screen.getByRole('button', 'تراجع');
  await expect(undoButton).toBeVisible();
  await undoButton.tap();

  // Product is restored from archive and is active in store
  await expect(browser.locator('tbody tr').filter({ hasText: product.modelCode })).toContainText('ظاهر في المتجر');
});

test('CSV import preview shows 1 update and 1 not found without applying', async ({
  app,
  screen,
  browser,
}) => {
  const product = await seed.product({
    name: `منتج استيراد تجريبي ${seed.runId}`,
    priceEgp: 10000,
  });

  await loginWithAdminSession(browser, seed, app);
  await app.open('/admin/products/import');
  await waitForHydration(browser);

  const csvContent = `model_code,price\n${product.modelCode},12500\nUNKNOWN-CODE-999,5000\n`;

  // Dispatch file into file input via DataTransfer in browser evaluate
  await browser.evaluate((csv) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!input) throw new Error('File input not found');
    const file = new File([csv], 'products-update.csv', { type: 'text/csv' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, csvContent);

  // The preview shows 1 تعديل and 1 غير موجود in the summary tabs
  await expect(screen.getByRole('tab', /تعديلات جاهزة/)).toContainText('1');
  await expect(screen.getByRole('tab', /غير موجود/)).toContainText('1');

  // The apply button displays «طبّق 1 تعديل»
  const applyButton = screen.getByRole('button', 'طبّق 1 تعديل');
  await expect(applyButton).toBeVisible();

  // Do NOT apply
});
