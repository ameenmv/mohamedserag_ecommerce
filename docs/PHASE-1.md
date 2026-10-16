# Phase 1 — Launch: progress

> المرحلة الأولى (الإطلاق) — إحنا دلوقتي في **Slice 0: الأساس**. الأساس شغال: المستودع، الموقع، الـ API، قاعدة البيانات، البيانات التجريبية، ودخول الأدمن، وكل اختبارات المتصفح ناجحة. فاضل بيانات الاختبار، التحليلات، والـ CI.

**Updated:** 16 Oct 2026 · **Branch:** `002-phase1-launch` · **Source of truth:** [PRD](PRD.md) · [spec](../specs/002-phase1-launch/spec.md) · [plan](../specs/002-phase1-launch/plan.md) · [tasks](../specs/002-phase1-launch/tasks.md)

## Where we are

| Slice | Scope | Status |
|---|---|---|
| **0 — Foundation** | Monorepo, web + API, database, seed, admin auth, Docker, CI | 🟡 **In progress** (about 80%) |
| 1 — Catalog & discovery | Categories, brands, product pages, Arabic search, filters, compare, wishlist, admin products | ⚪ Next |
| 2 — Cart, checkout & payments | Zones, COD, transfers, large-COD deposit, one-tap confirm | ⚪ Planned |
| 3 — Bridal builder «جهّز بيتك» | Tiers, sharing, deposit and price lock | ⚪ Planned |
| 4 — Promotions & stock alerts | Flash sales, coupons, notify-me | ⚪ Planned |
| 5 — Reviews | Moderation, verified buyers | ⚪ Planned |
| 6 — Content, CMS & SEO | Homepage CMS, guides, quiz, Merchant feed | ⚪ Planned |
| 7 — Dashboard, reports & settings | Counters, reports, settings | ⚪ Planned |

## Slice 0 — task by task

`C` = Claude did it directly · `A` = Argon (Gemini) wrote it, Claude reviewed and tested it.

| Task | What | Who | Status |
|---|---|---|---|
| T001 | Branch, move the prototype into `prototype/` | C | ✅ |
| T002 | Root workspace: pnpm, Turborepo, env example | C | ✅ |
| T003 | `packages/config`: tsconfig, ESLint, Prettier | C | ✅ |
| T004 | `packages/shared`: Arabic/phone normalizers, money, enums, order flow, WhatsApp, zones (44 tests) | A | ✅ |
| T005 | `packages/ui`: brand tokens light/dark (contrast tested) | A | ✅ |
| T006 | Nuxt 4 app: Tailwind 4, shadcn-vue, fonts, images, i18n, RTL | C | ✅ |
| T007 | Store shell (header, footer, bottom nav) and admin shell (sidebar, Ctrl/⌘ K, «G ثم حرف», undo toasts, dark mode) | A | ✅ |
| T008 | NestJS 12 API: SWC tests, helmet, throttling, Zod pipe, DB health | C | ✅ |
| T008b | Dev and test Postgres 17 in Docker | C | ✅ |
| T009 | Prisma schema for every PRD entity + Arabic trigram search index | A | ✅ |
| T009b | First migration + generated client + `PrismaService` | C | ✅ |
| T010 | Seed: 26 products in piastres, specs, synonyms, zones, settings, bridal tiers, pages, 6 demo orders, admin from env (idempotent) | A | ✅ |
| T011 | Admin auth: hashed sessions, CSRF, fail-closed permission guard, audit log, login page | A | ✅ |
| T012 | Docker: full stack compose, e2e overlay, Caddy, Dockerfiles | C | ✅ (images not built in CI yet) |
| T012b | Test seed endpoints behind a flag + secret | A | ⏳ Next |
| T012c | Analytics (Umami) + funnel events | A | ⏳ Next |
| T013 | e2e runner + smoke and admin-login suites | C | ✅ 6/6 passing |
| T014 | GitHub Actions CI + Lighthouse CI | C | 🟡 Drafted locally, not pushed |
| T015 | [`STACK.md`](STACK.md) | C | 🟡 Draft, final pass at the end of Slice 0 |

**Slice 0 is done when** `docker compose up` brings the stack up, `/` shows the RTL brand shell, `/admin` redirects to login, the seeded admin reaches the dashboard, and the smoke suite passes in CI.

## Quality gates (current)

| Gate | Result |
|---|---|
| Lint + typecheck (all packages) | ✅ |
| Unit tests: shared 44 · ui 3 · api 26 · web 10 | ✅ |
| API tests against the real test database | ✅ 8/8 |
| Browser e2e (smoke + admin login) | ✅ 6/6 |
| Production builds (API, web) | ✅ |
| Lighthouse budgets | ⏳ runs once CI is on |

## Found and fixed during review

- **Credentials in the URL:** the login form could submit natively before Vue hydrated, which put the email and password in the URL. The form is now POST-only and its inputs and button stay disabled until hydration. The e2e suite caught this.
- **Unknown npm package:** the shadcn-vue CLI rewrote imports to an npm package named `cn`. The imports now point back at our own helper, and the package is removed.
- **Version pins:** Prisma stays on 7.10 (8.x is a release candidate), TypeScript stays on 6.0 (the Nest CLI doesn't support 7 yet), and `nestjs-zod` is replaced by our own Zod pipe because it doesn't support Nest 12.
- **Schema and code cleanups:** duplicate timestamps and a redundant quiz slug are removed. The Arabic «الحث الحراري» induction parsing is fixed.

## Waiting on the store owner (PRD §13)

- Real phone and WhatsApp numbers, address and working hours (placeholders for now)
- Fawry: which method to use, or drop it
- City lists for each delivery zone
- Contents of the bridal tiers
- A lawyer's review of the returns policy

## Next steps

1. T012b test seed and T012c analytics (Argon) → review → e2e.
2. Push the CI workflow once you approve it, and get a first green run on GitHub.
3. Build the Docker images, then close Slice 0.
4. Start Slice 1 (catalog & discovery): T020 API catalog → T021 search → T021b shared web pieces → pages → admin products → e2e.

## How to check it yourself

```bash
pnpm db:up
pnpm --filter @serag/api exec prisma migrate dev
pnpm --filter @serag/api exec prisma db seed
pnpm dev            # http://localhost:3000 and /admin
pnpm test:e2e       # browser tests
```
