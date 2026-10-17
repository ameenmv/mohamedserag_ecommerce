# Testing & Quality Gates Guide

This document defines the automated verification pipeline, test suites, e2e conventions, and manual browser checks required for all changes in the Serag repository.

---

## 1. Quality Gate Commands

Every code change must pass all quality gates before being merged or considered complete.

| Gate Command | Workspaces Checked | Tools Used | What It Validates |
|---|---|---|---|
| `pnpm lint` | Entire monorepo (`turbo run lint`) | ESLint flat config (`@nuxt/eslint`, `@serag/config`) + `oxlint` (API) | Code formatting, unused variables, forbidden syntax, style violations |
| `pnpm typecheck` | Entire monorepo (`turbo run typecheck`) | TypeScript `tsc --noEmit` + `nuxt typecheck` (`vue-tsc`) | Strict type correctness, interface compliance, no implicit `any` |
| `pnpm test` | All packages (`turbo run test`) | Vitest (shared, ui, web, api unit tests) | Pure logic, normalizers, money, i18n key parity, state transition units |
| `pnpm --filter @serag/api test:e2e` | `apps/api` only | Vitest + Supertest against real PostgreSQL (5433) | Endpoints, session cookie auth, permissions, CSRF, audit log, test seed |
| `pnpm test:e2e` | `tests/e2e` | TesterArmy `e2e` runner (Playwright) | End-to-end browser workflows, admin login, storefront brand shell, RTL layout |
| `pnpm build` | All packages & apps (`turbo run build`) | Nitro, Vite, Nest CLI, Prisma generate | Production artifact generation without build warnings or bundle errors |

### Targeted / Package-Specific Commands:
When working on a single package, run fast local gates:
```bash
# Web only
pnpm --filter @serag/web lint
pnpm --filter @serag/web typecheck
pnpm --filter @serag/web test

# API only
pnpm --filter @serag/api lint
pnpm --filter @serag/api typecheck
pnpm --filter @serag/api test
pnpm --filter @serag/api test:e2e

# Shared only
pnpm --filter @serag/shared test
pnpm --filter @serag/shared typecheck
```

---

## 2. Test Locations & Organization

Tests are distributed across the repository according to their level in the pyramid:

```text
mohamedserag_ecommerce/
├── packages/shared/src/
│   └── *.spec.ts              # Unit tests for Arabic normalizer, phone, money, zones, enums
├── packages/ui/
│   └── *.spec.ts              # Snapshot tests for brand theme tokens and contrast
├── apps/web/test/
│   ├── i18n-messages.test.ts  # Parity test: asserts ar.json and en.json key equivalence
│   ├── auth-utils.test.ts     # Tests for next-path redirects, email validator, error key mapper
│   └── shortcuts.test.ts      # Tests for admin G-chord sequence tracker and editable target checks
├── apps/api/
│   ├── src/**/*.spec.ts       # Service-level unit tests (mocking PrismaService)
│   └── test/
│       ├── global-setup.ts    # Migrates and seeds the real test database on port 5433
│       ├── auth.e2e-spec.ts   # Integration tests for admin auth, session, cookie, and CSRF
│       └── test-seed.e2e-spec.ts # Integration tests for the test seed security and cleanup
└── tests/e2e/tests/
    ├── smoke.e2e.ts           # Browser smoke: health, RTL brand shell, unauthorized admin redirect
    ├── admin-login.e2e.ts     # Browser login: invalid credentials error, valid login to dashboard
    └── test-seed.e2e.ts       # Browser test-seed helper verification with session cookie injection
```

---

## 3. Mandatory Unit Testing Scope

You must write or update unit tests for:
1. **Pure Utilities (`apps/web/app/utils/*`)**: Any function that performs text transformation, path resolution, calculation, or error mapping must have 100% test coverage.
2. **Shared Logic (`packages/shared/src/*`)**: Normalizers, money conversion functions (`egpToPiastres`, `piastresToEgp`, `formatEgp`), phone sanitizers, discount math, delivery zone resolvers, and Zod schemas.
3. **i18n Parity**: Always run `i18n-messages.test.ts` whenever any translation string is touched.
4. **State Machines & Sequences**: Complex sequential logic (such as the admin «G ثم حرف» shortcut tracker) must test all timing windows, edge cases, and reset conditions.

---

## 4. End-to-End (E2E) Testing Conventions

E2E tests use TesterArmy's `e2e` runner (`@e2e-dev/web`). Configuration lives in `tests/e2e/e2e.config.ts`.

### Best Practices:
- **Deterministic Locators**: Always prefer accessible semantic locators (`screen.getByRole`, `screen.getByLabel`) using Arabic accessible names:
  ```ts
  await screen.getByLabel('البريد الإلكتروني').fill(admin.username)
  await screen.getByRole('button', 'دخول').tap()
  ```
- **Isolated Test Seed**:
  - Use `createSeed()` from `tests/e2e/tests/support/seed.js` to seed isolated test entities (products, orders, admin sessions) tagged with a unique `runId`.
  - Always clean up in `afterEach()`:
    ```ts
    let seed = createSeed()
    afterEach(async () => {
      await seed.cleanup()
      seed = createSeed()
    })
    ```
- **No Hardcoded Credentials**:
  - Never write plaintext passwords in specs.
  - Read accounts from `credentials.user('admin')`, which loads from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.
- **Fast Execution**: Never insert arbitrary sleeps (`setTimeout` or `page.waitForTimeout`). Actions and assertions automatically retry until settle or timeout.

---

## 5. Zero Tolerance for Nuxt & Vue Warnings

Dev server and build warnings count as hard failures during review:

1. **"Duplicated imports"**:
   - Cause: Re-exporting an already auto-imported composable/util, or combining explicit and auto-imports.
   - Fix: Remove redundant explicit imports.
2. **"Failed to resolve component"**:
   - Cause: Template tag does not match the prefix generated by Nuxt's component directory scanner (e.g. `AdminWelcomeHeader` vs `AdminDashboardWelcomeHeader`).
   - Fix: Align the filename with the full folder prefix.
3. **"Hydration mismatch"**:
   - Cause: Server HTML output differs from client initial render (e.g. referencing `window` or `Date.now()` without SSR guards).
   - Fix: Guard with `import.meta.server` or `onMounted`.
4. **Unhandled Promise Rejections**:
   - Cause: Uncaught errors in async setup or event handlers.
   - Fix: Explicit `try/catch` and user feedback via toast or alert.

---

## 6. Manual Browser Verification Checklist

Automated tests catch regressions; manual checks catch visual defects. For any UI change, inspect the running app in a browser:

- [ ] **Dual Locale Verification**:
  - Test the Arabic default version at `/` (RTL layout, Lalezar/IBM Plex Sans fonts).
  - Test the English version at `/en` (LTR layout, Outfit font).
- [ ] **Directional Icon Flipping**:
  - Verify that back arrows, chevrons, and breadcrumbs flip correctly between LTR and RTL (`rtl:-scale-x-100`).
- [ ] **Responsive Breakpoints**:
  - Desktop view (1280px): Sidebar visible, desktop navigation strip present.
  - Tablet / Mobile view (375px & 320px): Bottom navigation visible, off-canvas sheets work, no horizontal scrollbar overflow.
- [ ] **Theme Switching**:
  - Verify both Light mode and Dark mode for contrast and readable text.
- [ ] **Numbers**:
  - Verify prices, quantities, and phone numbers use the `.num` tabular styling.
