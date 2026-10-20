# Tasks: Phase 1 Launch

**Input**: [spec.md](spec.md), [plan.md](plan.md), [docs/PRD.md](../../docs/PRD.md)
**Who**: `C` = Claude runs it directly (CLI/scaffolding), `A` = Argon writes it from Claude's brief, Claude reviews. `[P]` = can run in parallel with other `[P]` tasks of the same phase (different files).

## Phase 0: Setup (Slice 0) — blocks everything
- [x] T001 C Branch `002-phase1-launch`; `git mv` prototype files into `prototype/` (S1)
- [x] T002 C Root workspace files: package.json, pnpm-workspace.yaml, turbo.json, .nvmrc, .editorconfig, .gitignore, .env.example (S2)
- [x] T003 C `packages/config`: tsconfig bases, ESLint flat config, Prettier (S3)
- [x] T004 A `packages/shared`: Zod setup, status enums, money helpers, `normalizeArabic`, `normalizePhone`, WhatsApp link builder + unit tests (S4)
- [x] T005 A [P] `packages/ui`: brand tokens light/dark, Tailwind preset, font setup (S5)
- [x] T006 C Scaffold `apps/web` (Nuxt 4, Tailwind 4, shadcn-vue, image, fonts, i18n, eslint) (S6)
- [x] T007 A Web shells: RTL `app.vue`, store layout (header, footer, bottom nav from prototype), admin layout (sidebar, topbar, theme toggle, Ctrl/⌘+K command palette, «G ثم حرف» shortcuts, toasts with undo) (S6)
- [x] T008 C Scaffold `apps/api` (NestJS strict, Vitest + `unplugin-swc`, nestjs-zod, helmet, rate limit, trust proxy, config, /health) (S7)
- [x] T008b C `docker/compose.dev.yml` (Debian postgres:17 db + db-test) and start it (S7b)
- [x] T009 A Prisma schema for all PRD §9 entities, incl. product `searchText` + `pg_trgm` (S8)
- [x] T009b C Run `prisma migrate dev` + `prisma generate`; fix schema errors with Argon if any (S8)
- [x] T010 A Seed script: catalog from `prototype/config.js` (EGP → piastres, `searchText`, cookware `setContents`, brand logos from `prototype/assets/brands`), zones, settings, CMS content, demo orders, admin user from env (S8)
- [x] T011 A Auth module + `@RequirePermission` guard + audit-log interceptor + admin login page (S9)
- [x] T012 C Docker `compose.yml` (shared uploads volume) + `compose.e2e.yml` + Caddyfile (S10)
- [x] T012b A Test seed module `/api/test/seed/*` behind `ALLOW_TEST_SEED` + secret header, with API tests (S10b)
- [x] T012c A Analytics: provider wiring (D5) + funnel events helper in web
- [x] T013 C `npx e2e@latest init` in `tests/e2e` (Web/Playwright, provider per D1), base URL to compose + e2e override, seed helper, smoke suite (S11)
- [x] T014 C GitHub Actions CI + Lighthouse CI (S12)
- [x] T015 C `docs/STACK.md` (S13)

**Checkpoint**: smoke e2e green; `docker compose up` works.

## Phase 1: Slice 1 — Catalog & discovery
- [x] T020 F API catalog: categories, brands, spec templates, products (list with filters/sort/pagination, by slug, by ids), availability derivation
- [x] T021 F API search: query the `searchText` column with trigram similarity, synonyms from settings, keep `searchText` updated on product create/update
- [x] T021b F Web shared pieces before the page tasks: `ProductCard`, `useApi`, `useCart`, `useWishlist`, `useCompare`, header badges
- [x] T022 A [P] Web: product card component, `/shop`, `/c/[slug]`, `/b/[slug]` with URL-synced filters and mobile filter sheet
- [x] T023 A [P] Web: `/p/[slug]` product page (gallery, specs, cookware set contents, warranty + activation note, VAT label, availability incl. on-request lead time, zone delivery cost, WhatsApp ask, sticky mobile bar, related)
- [x] T024 A [P] Web: live search dropdown, compare bar + `/compare`, wishlist with `priceAtAdd`
- [x] T025 A Admin: products list/editor with live card preview, archive, images upload; categories, brands, spec templates
- [x] T026 A Admin: CSV import with preview matched on model code (prices in EGP, converted to piastres)
- [x] T027 A E2E: catalog, search, compare/wishlist, admin products specs
- [x] T028 C Slice review: gates, 375 px and 320 px checks, Lighthouse (a11y/SEO/best-practices 100; perf 63–70, LCP ≈ 4.2 s — follow-up before T091)

## Phase 2: Slice 2 — Cart, checkout & payments (detailed in [003-slice2-checkout](../003-slice2-checkout/tasks.md))
- [x] T030 A API cart quote (re-price, zone by governorate+city, coupon placeholder hook), order creation (idempotent), public token
- [x] T031 A API payments: record/confirm/reject, partial payments, confirm tokens, large-COD deposit rule, status machine, stock movements
- [x] T032 A [P] Web: cart drawer + `/cart`, `/checkout` (phone normalization, VAT label, deposit notice, on-request lead time), `/order/[no]/thanks`; funnel events `checkout_start`, `order_placed`
- [x] T033 A [P] Admin: orders list/detail, payment confirm/reject, status actions, WhatsApp template buttons, CSV export, internal invoice print
- [x] T034 A Admin: `/admin/confirm/[token]` mobile page with login redirect
- [x] T035 A E2E: COD, transfer, large-COD deposit, confirm link (incl. reject then confirm), thank-you token secrecy, product → order under 90 s
- [x] T036 C Slice review

## Phase 3: Slice 3 — Bridal builder
- [x] T040 A API bridal: tiers, lists (edit/share tokens, mode), swaps, freeze on reserve, reservation order, lock start on paid ≥ deposit, extend, reprice, agreed date → stock
- [x] T041 A Web: `/bridal` tiers, `/bridal/[token]` editor and read-only view, «نفذ — اختاري بديل» blocking reserve until swapped, WhatsApp share, reserve form
- [x] T042 A Admin: tier editor, bridal settings, reservation actions inside orders, expiring-locks list
- [x] T043 A E2E: build/share, out-of-stock item blocks reserve, reserve with two partial transfers, lock holds after catalog price change, expiry + extend
- [x] T044 C Slice review

## Phase 4: Slice 4 — Promotions & stock alerts
- [x] T050 A API flash sales (scheduler, overlap check), coupons with eligibility and redemptions, notify-me (dedupe, mark sent)
- [x] T051 A [P] Web: flash countdown on home and product, coupon field in checkout, notify-me form
- [x] T052 A [P] Admin: flash sales, coupons, notify-me lists
- [x] T053 A E2E: flash sale revert, coupon eligibility, notify-me
- [x] T054 C Slice review

## Phase 5: Slice 5 — Reviews
- [x] T060 A API reviews: submit (rate limit, honeypot, one per phone/product), moderation, verified-buyer rule, unpublish/delete, rating aggregate
- [x] T061 A Web review form + list; admin moderation queue
- [x] T062 A E2E reviews
- [x] T063 C Slice review

## Phase 6: Slice 6 — Content, CMS & SEO
- [x] T070 A API content: home sections draft/publish/versions, pages, guides, quiz rules
- [x] T071 A Web: CMS-driven home, pages, guides, traders page, quiz
- [x] T072 A Admin: CMS editor (from prototype), pages/guides editor, quiz editor
- [x] T073 A SEO: meta, structured data, sitemap, robots, canonical, Google Merchant feed
- [x] T074 A E2E: CMS publish, quiz, SEO/feed validation
- [x] T075 C Slice review

## Phase 7: Slice 7 — Dashboard, reports & settings
- [ ] T080 A API dashboard counters, reports (revenue on delivered, deposits separate, repeat rate) + CSV
- [ ] T081 A Admin dashboard (from prototype overview), reports pages, settings pages
- [ ] T082 A E2E dashboard/reports/settings
- [ ] T083 C Slice review

## Phase 8: Launch readiness
- [ ] T090 C Full regression e2e at 1280, 375 and 320 px; `npx e2e explore` runs on the main journeys; KPI funnel events visible in analytics
- [ ] T091 C Lighthouse budgets, accessibility pass, security headers check
- [ ] T092 C Replace placeholders with real store data (PRD §13), VPS deploy, backups verified
