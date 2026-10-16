# Implementation Plan: Phase 1 Launch

**Branch**: `002-phase1-launch` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md) | **Product**: [docs/PRD.md](../../docs/PRD.md) v1.1 | **Revision**: 2 (after Gemini 4 Argon review, see end)

> Read this before anything is installed. Nothing in this plan has been run yet.

## Summary

Build the Phase 1 store as a pnpm + Turborepo monorepo: a Nuxt 4 app (storefront + `/admin`) and a NestJS API on PostgreSQL via Prisma, styled with Tailwind and shadcn-vue in the Serag brand. Work ships in 8 slices (spec.md), each with end-to-end tests written with TesterArmy's `e2e` runner. Claude plans and reviews each task; Gemini 4 Argon (via `agy`) writes the code; Claude re-runs every check before accepting.

## Technical Context

| Item | Choice |
|---|---|
| Runtime | Node.js 24 LTS (local is 24.14.1; `e2e` needs ≥ 24.8). Pinned in `.nvmrc` and `engines` |
| Package manager | pnpm (workspaces) + Turborepo for task caching |
| Web | Nuxt 4, Vue 3, TypeScript strict, Tailwind CSS 4, shadcn-vue, `@nuxt/image`, `@nuxtjs/i18n` (Arabic only, ready for English) |
| API | NestJS (latest stable), TypeScript strict, class-validator replaced by shared **Zod** schemas via `nestjs-zod` so web and API validate with the same rules. One Zod version for the whole repo, pinned in the pnpm `catalog:` and checked against `nestjs-zod` and the shadcn-vue form resolver before install |
| Proxy awareness | NestJS `trust proxy` = 1 behind Caddy so rate limits use the real client IP; Nuxt SSR `useApi` forwards `cookie` and `x-forwarded-for` to the API |
| Database | PostgreSQL 17 on the **Debian** image (`postgres:17`, not Alpine) with a UTF-8 locale so `pg_trgm` treats Arabic letters as word characters; Prisma ORM (schema, migrations, seed) |
| Search | Postgres: a normalized search column (Arabic letters folded, Arabic-Indic digits converted, synonyms expanded) + `pg_trgm` trigram index. No external search service in P1 |
| Auth (admin) | Email + password (argon2 hashes), httpOnly secure session cookie, CSRF token, login rate limit; `@RequirePermission('orders.update')` guard on every admin route |
| Money | Integer piastres in the DB and API (`2890000` = 28,900 ج.م), formatted only in the UI. Seed, CSV import and admin money inputs work in whole EGP and convert ×100 / ÷100 at the boundary (`packages/shared/money`) |
| Public tokens | 24-char random (nanoid) for order thank-you, bridal edit/share and confirm links |
| Images | Uploaded by the API to a `uploads` Docker volume that is mounted into `api` (write), `web` (read, `image.ipx.fs.dir`) and `caddy`; served through `@nuxt/image` (IPX) as AVIF/WebP with sizes |
| Unit tests | Vitest (web, shared, api). The API uses `unplugin-swc` + `@swc/core` in `vitest.config.ts` so decorator metadata (Nest DI, `nestjs-zod` DTOs) works |
| API tests | Vitest + Supertest against a throwaway Postgres (Testcontainers or the compose `db-test` service) |
| E2E tests | TesterArmy `e2e` (Playwright under the hood), in `tests/e2e` |
| Performance | Lighthouse CI on `/`, a category page and a product page |
| Lint/format | ESLint (flat config, `@nuxt/eslint`) + Prettier; `vue-tsc` and `tsc --noEmit` typechecks |
| Analytics | Privacy-friendly analytics (tool = decision D5) with funnel events `product_view`, `add_to_cart`, `checkout_start`, `order_placed`, `bridal_list_created`, `bridal_reserved` |
| CI | GitHub Actions: install → lint → typecheck → unit → API tests → build → compose up → e2e → Lighthouse |
| Hosting | One VPS, Docker Compose: `web`, `api`, `db`, `caddy` (TLS + reverse proxy); nightly `pg_dump` kept 30 days |

Exact versions are the latest stable at install time and get locked by `pnpm-lock.yaml`; the setup task records them in `docs/STACK.md`.

## Constitution Check

| Principle | How this plan meets it |
|---|---|
| I One stack, monorepo | Exactly the stack above; prototypes stay as design references in `prototype/` |
| II Arabic RTL | `<html lang="ar" dir="rtl">` from `app.vue`; Tailwind logical properties (`ms-`, `pe-`); copy in `locales/ar.json` |
| III One brand system | Brand tokens in `packages/ui/tokens.css`, mapped into Tailwind `@theme` and shadcn-vue CSS variables, light + dark |
| IV API-first, permissions | Web talks only to the API; permission guard + shared Zod schemas |
| V Accessible, fast, mobile | shadcn-vue (Reka UI) primitives are accessible; Lighthouse CI gate; 320 px e2e viewport |
| VI WhatsApp channel | `packages/shared/whatsapp.ts` builds every prefilled `wa.me` link from templates |

## Project Structure

```text
serag/                                  # current repo root
├── apps/
│   ├── web/                            # Nuxt 4: storefront + /admin
│   │   ├── app/
│   │   │   ├── pages/                  # /, /shop, /c/[slug], /b/[slug], /p/[slug], /compare, /wishlist, /help-me-choose/[category], /bridal/..., /cart, /checkout, /order/..., /guides, /pages, /traders
│   │   │   │   └── admin/              # /admin/* (layout: admin, middleware: auth)
│   │   │   ├── components/{store,admin,ui}/   # ui = shadcn-vue generated components
│   │   │   ├── composables/            # useCart, useWishlist, useCompare, useApi
│   │   │   └── layouts/                # default (store), admin
│   │   ├── server/routes/              # /feeds/google.xml, /sitemap.xml proxies
│   │   └── nuxt.config.ts
│   └── api/                            # NestJS
│       ├── src/modules/                # auth, catalog, search, cart, orders, payments, bridal, promotions, reviews, notify, content, settings, reports, feeds, media
│       ├── src/common/                 # permission guard, zod pipe, money, tokens, audit log
│       └── prisma/{schema.prisma, migrations/, seed.ts}
├── packages/
│   ├── shared/                         # Zod schemas, DTO types, enums (statuses), Arabic normalize(), phone normalize(), money, whatsapp templates
│   ├── ui/                             # brand tokens.css, fonts, Tailwind preset
│   └── config/                         # eslint, tsconfig bases
├── tests/
│   └── e2e/                            # e2e.config.ts, specs per slice, fixtures
├── prototype/                          # current *.html, admin/, assets/ moved here (design reference)
├── docker/{compose.yml, compose.dev.yml, compose.e2e.yml, Caddyfile}
├── docs/{PRD.md, STACK.md}
├── specs/
├── .github/workflows/ci.yml
├── turbo.json, pnpm-workspace.yaml, package.json, .nvmrc, .env.example
```

## Setup Plan (Slice 0, in order)

Each step ends with a check that must pass before the next one starts.

| # | Step | Check |
|---|---|---|
| S1 | Create branch `002-phase1-launch`; move prototype files (`*.html`, `config.js`, `support.js`, `vendor/`, `assets/`, `admin/`, `archives/`, `Header.html`, `Footer.html`, `handover.html`) into `prototype/` with `git mv` | Prototype still opens from `prototype/index.html` |
| S2 | Root workspace: `package.json` (private, engines node ≥ 24.8), `pnpm-workspace.yaml`, `turbo.json` (build, dev, lint, typecheck, test, test:e2e), `.nvmrc`, `.editorconfig`, `.gitignore`, `.env.example` | `pnpm install` succeeds |
| S3 | `packages/config` (tsconfig bases, ESLint flat config, Prettier) | `pnpm lint` runs on an empty tree |
| S4 | `packages/shared`: Zod, `normalizeArabic()`, `normalizePhone()`, `money`, status enums, WhatsApp link builder — with unit tests | `pnpm --filter shared test` green (incl. «تلاجه»→«ثلاجه», «٤٥٠»→«450», `+20 10 1234 5678`→`01012345678`) |
| S5 | `packages/ui`: brand tokens (green/gold/cream, dark theme) as a Tailwind 4 CSS-first `tokens.css` with `@theme` (no JS preset), plus the shadcn-vue CSS variables; fonts (Lalezar, IBM Plex Sans Arabic, Outfit via `@nuxt/fonts`) | Token snapshot test |
| S6 | `apps/web`: `pnpm create nuxt@latest apps/web` (Nuxt 4), add Tailwind 4 (`@tailwindcss/vite`, importing `packages/ui/tokens.css`), `shadcn-nuxt` + `shadcn-vue init` with `components.json` aliases pointed at Nuxt 4's `app/components/ui` and `app/lib`, `@nuxt/image`, `@nuxt/fonts`, `@nuxtjs/i18n` (ar), `@nuxt/eslint`; RTL `app.vue`; store and admin layouts with the prototype's header/sidebar look | `pnpm --filter web build`; a shadcn Button renders in brand colors; home renders RTL with brand fonts |
| S7 | `apps/api`: `nest new apps/api --package-manager pnpm --strict`; switch tests to Vitest with `unplugin-swc`; add `nestjs-zod`, helmet, rate limiter, `trust proxy`, config module, `/health` | `GET /health` → 200; one DI test passes under Vitest |
| S7b | `docker/compose.dev.yml` (Debian `postgres:17` `db` + `db-test`, UTF-8 locale) and `docker compose -f docker/compose.dev.yml up -d` | `psql` connects to both databases |
| S8 | Prisma: schema for every entity in PRD §9 (incl. Payment, StockMovement, CouponRedemption, WhatsAppMessage, AuditLog) **and the product `searchText` column with the `pg_trgm` extension + index**; Claude runs `prisma migrate dev` and `prisma generate`; seed from `prototype/config.js` catalog (EGP → piastres, `searchText` filled with `normalizeArabic`) + admin seed (orders, CMS, settings, zones) + one admin user from env | Fresh DB: migrate + seed succeed; 20 products with non-empty `searchText` |
| S9 | Auth + permissions: login/logout/me, session cookie, CSRF, `@RequirePermission`, role «مدير» with all keys, audit log interceptor on admin mutations | API tests: anonymous → 401, logged-in → 200, missing permission → 403 |
| S10 | Docker: `compose.yml` (web, api, db, caddy, shared `uploads` volume) and `compose.e2e.yml` override that sets `ALLOW_TEST_SEED=true` and `TEST_SEED_SECRET` for the API | `docker compose -f docker/compose.yml up` serves the site on https://localhost; an uploaded image is served by `web` |
| S10b | Test seed module in the API: `/api/test/seed/*` and `/api/test/reset`, registered only when `ALLOW_TEST_SEED=true` **and** each request carries the `x-test-seed-secret` header; never enabled in the production compose file | API test: without the flag the routes don't exist (404); with flag but wrong secret → 403 |
| S11 | E2E: in `tests/e2e` run `npx e2e@latest init` → **Web (Playwright)**, model provider **None** for now (decision D1); point it at the app started with `compose.yml` + `compose.e2e.yml`; write the smoke suite (home RTL, admin login, health) and a seed helper that calls `/api/test/seed/*` with the secret | `npx e2e run` green locally |
| S12 | CI: `.github/workflows/ci.yml` with the full pipeline + `@e2e-dev/github` PR comment; Lighthouse CI config | Green run on the branch (needs a GitHub remote — decision D2) |
| S13 | `docs/STACK.md`: versions, commands, env vars, how to run tests, how to delegate to Argon | Reviewed by Claude |

## Testing Strategy

| Layer | What | Where | Gate |
|---|---|---|---|
| Unit | Pure logic: Arabic normalize, phone, money, coupon eligibility, bridal totals and lock math, availability derivation, quiz scoring, status transitions | `packages/shared`, `apps/*/**/*.spec.ts` | Every PR |
| API | Each endpoint: validation, permissions (401/403), state transitions, stock movements, token secrecy | `apps/api/test` with a real Postgres | Every PR |
| E2E | Each slice's independent test + acceptance scenarios from spec.md, at 1280 px and 375 px | `tests/e2e/<slice>.e2e.ts` | Every PR to main |
| Exploratory | `npx e2e explore '<goal>'` runs (agent) before each slice is accepted, e.g. «اشتري تلاجة وادفع بإنستا باي» | Local, report saved in `tests/e2e/reports/` | Slice acceptance (needs D1) |
| Performance & a11y | Lighthouse CI budgets (SC-002) | CI | main |

E2E conventions:
- Deterministic locators first (`getByRole`, `getByLabel` with Arabic names) so most specs need no model.
- Agent steps (`agent.act`, `agent.assert`) only where wording or layout is expected to change (CMS content, quiz results), and only after D1 is decided. Cached `act` steps live in `.e2e/cache/` and are committed; CI runs read-only cache.
- Each spec seeds its own data through the test seed module (S10b: `ALLOW_TEST_SEED=true` + secret header, only in `compose.e2e.yml`) and cleans up after itself.
- Viewports: 1280 px, 375 px, and 320 px for the store's main journeys (constitution V).
- `checkout-*.e2e.ts` measures product page → order placed and fails if it exceeds 90 s (SC-003).
- Admin credentials come from env (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`) and are never written in specs.

## Slice Delivery (after setup)

| Slice | Main modules | E2E specs |
|---|---|---|
| 1 Catalog & discovery | catalog, search, media; store pages `/shop`, `/c`, `/b`, `/p`, `/compare`, `/wishlist`; admin products, categories, brands, spec templates, CSV import | `catalog.e2e.ts`, `search.e2e.ts`, `compare-wishlist.e2e.ts`, `admin-products.e2e.ts` |
| 2 Cart, checkout, payments | cart quote, orders, payments, confirm tokens, stock movements, WhatsApp templates; `/cart`, `/checkout`, `/order/:no/thanks`; admin orders + `/admin/confirm/:token` | `checkout-cod.e2e.ts`, `checkout-transfer.e2e.ts`, `cod-deposit.e2e.ts`, `confirm-link.e2e.ts` |
| 3 Bridal builder | bridal tiers/lists/reservations, lock extend/reprice | `bridal-build-share.e2e.ts`, `bridal-reserve-lock.e2e.ts` |
| 4 Promotions & alerts | flash sales (scheduler), coupons + redemptions, notify-me | `flash-sale.e2e.ts`, `coupons.e2e.ts`, `notify-me.e2e.ts` |
| 5 Reviews | reviews + moderation | `reviews.e2e.ts` |
| 6 Content & SEO | content versions, pages, guides, quiz, landing SEO, sitemap, merchant feed, traders | `cms-publish.e2e.ts`, `quiz.e2e.ts`, `seo-feed.e2e.ts` |
| 7 Dashboard, reports, settings | dashboard, reports, settings | `dashboard-reports.e2e.ts`, `settings.e2e.ts` |

Definition of done for every slice: unit + API + e2e green in CI, Lighthouse budgets met, 375 px screenshots reviewed, no console errors, PRD stories of the slice checked off in `tasks.md`.

## How the Work Gets Done (Claude ↔ Argon)

1. Claude turns one task from `tasks.md` into a self-contained brief (goal, files, acceptance, commands that must pass).
2. Gemini 4 Argon (relay `--model gemini-4-argon-high`; the label already sets the effort) implements it on the slice branch. It may write anywhere under the repo's app/package/test folders once the agy write rule is widened from `admin/` to the monorepo folders (decision D3); it cannot run shell commands, so it does not install packages.
3. Claude installs any dependencies the brief named, runs lint, typecheck, unit, API and e2e tests, reads the full diff, and either fixes small issues or sends a follow-up brief.
4. Claude commits per task with a message that names the task ID; the user reviews each slice before it merges.

Setup steps S1–S13 are run by Claude directly, because they are mostly CLI scaffolding that Argon cannot execute. Whenever Argon writes something that needs a command (Prisma schema → migrate/generate, new dependency → install), the command is a separate Claude step in tasks.md before the next task starts.

## Decisions Needed Before Starting

| ID | Decision | Recommendation |
|---|---|---|
| D1 | Model provider for `e2e` agent steps (`npx e2e login` with a ChatGPT/Copilot/SuperGrok subscription, OpenRouter key, Vercel AI Gateway, or none) | Start with **None** (deterministic tests only); add a provider when Slice 6 needs agent assertions |
| D2 | GitHub remote for CI | Create a private repo and push the branch |
| D3 | Widen the agy write rule from `admin/` to `apps/`, `packages/`, `tests/` | Yes, needed for Argon to code the slices |
| D4 | Move prototype files into `prototype/` | Yes, keeps the root clean; history is kept by `git mv` |
| D5 | Analytics tool for KPIs and funnel events | Umami, self-hosted as one more container in `compose.yml` (free, cookie-less, no consent banner needed) |

## Risks

| Risk | Mitigation |
|---|---|
| shadcn-vue + Tailwind 4 + Nuxt 4 versions drift | Pin at install, record in STACK.md, upgrade only on purpose |
| Arabic search quality with Postgres only | Unit-tested normalizer + trigram; revisit Meilisearch only if Slice 1 tests show misses |
| Argon can't run commands, so it may write code that doesn't compile | Briefs include exact types and file paths; Claude runs every gate before accepting |
| E2E agent steps cost money / flake | Deterministic first; agent steps cached; CI read-only cache with one retry |
| Placeholder store data at launch | PRD §13 list tracked as a blocker for go-live, not for development |

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Turborepo | Caches build/test across 4 packages in CI | Plain pnpm scripts rebuild everything each run |
| Shared Zod package | One validation source for web and API (constitution IV) | class-validator would duplicate rules in the web app |

## Review Log

| Date | Reviewer | Verdict | Applied |
|---|---|---|---|
| 2026-10-16 | Gemini 4 Argon (Medium), verified by Claude | Changes requested: 3 blockers, 8 major, 1 minor | Dev DB compose moved before Prisma (S7b); `unplugin-swc` for Nest + Vitest; test seed module with flag + secret and `compose.e2e.yml` (S10b); Tailwind 4 `@theme` tokens and Nuxt 4 shadcn paths; single pinned Zod; Debian Postgres + `searchText` in the first migration; shared uploads volume; `trust proxy` and SSR header forwarding; Claude runs migrate/generate after Argon's schema; shared product card/composables task before parallel page tasks; missing tasks for analytics, command palette/shortcuts/undo, bridal out-of-stock, on-request lead time, cookware set contents and brand logos, 320 px and 90 s checks; EGP ↔ piastres at boundaries. New decision D5 (analytics). |
