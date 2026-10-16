# Stack and Developer Guide

How the Serag store is built, run and tested. Product scope: [PRD.md](PRD.md). Phase 1 plan: [specs/002-phase1-launch/plan.md](../specs/002-phase1-launch/plan.md). Progress: [docs/PHASE-1.md](PHASE-1.md).

## Versions (locked by `pnpm-lock.yaml`)

| Tool | Version | Note |
|---|---|---|
| Node.js | 24 (`.nvmrc`), ≥ 24.8 | required by the `e2e` runner |
| pnpm | 10.33 | workspaces + `catalog:` for shared versions |
| Turborepo | 2.11 | task runner and cache |
| TypeScript | 6.0 | TS 7 (native compiler) skipped until Nest CLI, vue-tsc and Prisma support it |
| Nuxt | 4.6 | storefront + `/admin` |
| Tailwind CSS | 4.3 | CSS-first, brand tokens in `packages/ui/tokens.css` |
| shadcn-vue (`shadcn-nuxt`) | 2.8 | components in `apps/web/app/components/ui` |
| NestJS | 12 | ships with Vitest, ESM and oxlint |
| Prisma | 7.10.1 | `prisma-client` generator (ESM) + `@prisma/adapter-pg`; 8.x is still a release candidate |
| PostgreSQL | 17 (Debian image) | `pg_trgm` for Arabic search; UTF-8 locale |
| Zod | 4.6 | one version for the repo; validation pipe written in-house because `nestjs-zod` does not support Nest 12 yet |
| Vitest | 5 (shared, ui, web), Nest's own | API uses `unplugin-swc` for decorator metadata |
| e2e (TesterArmy) | 0.21 | Playwright under the hood, no AI gateway yet (decision D1) |

## Layout

```text
apps/web        Nuxt 4 app (storefront + /admin)
apps/api        NestJS API (+ prisma/)
packages/shared Zod schemas, enums, Arabic/phone normalizers, money, WhatsApp templates, zones, analytics
packages/ui     Brand tokens (CSS + TS)
packages/config tsconfig bases, ESLint config
tests/e2e       e2e runner config and specs
docker/         compose.dev.yml (DBs), compose.yml (full stack), compose.e2e.yml (test seed on), Caddyfile, Dockerfiles
prototype/      the original HTML prototype and HTML admin (design reference only)
```

In `apps/web`, route pages under `app/pages/` are thin composition entry points handling routes, layouts, and SEO metadata. UI is organized by domain under `components/store/`, `components/admin/` (sidebar, topbar, dashboard, login subcomponents), `components/form/`, and `components/common/`. Stateful reactive logic lives in composables (`useAdminSession`, `useAdminAuth`, `useApiClient`, `useLoginForm`, `useNavActive`), while pure, framework-agnostic logic lives in unit-tested utilities (`utils/`). For complete directory layout and layering rules, see [.agents/skills/serag-engineering/references/architecture.md](../.agents/skills/serag-engineering/references/architecture.md).

### Internationalization (i18n)

Serag is bilingual, supporting Arabic (primary/default) and English:
- **Locales & URLs:** Powered by `@nuxtjs/i18n` with strategy `prefix_except_default`. Arabic (`ar`, RTL) is served at `/` and English (`en`, LTR) under `/en/...` (e.g. `/en/admin/login`). Active locale is persisted in the `serag_locale` cookie, and document attributes (`lang`, `dir`, hreflang links) are bound reactively via `useLocaleHead`.
- **Message dictionaries:** Translation strings live in `apps/web/i18n/locales/ar.json` and `en.json`.
- **Parity testing:** Key parity is strictly enforced by `apps/web/test/i18n-messages.test.ts`. Every user-facing UI string must exist in both files with identical key structures and no empty strings.

## Root scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Run web (:3000) and API (:4000) concurrently in watch mode via Turborepo |
| `pnpm build` | Production build across all packages and apps |
| `pnpm lint` | Lint code monorepo-wide with ESLint and oxlint |
| `pnpm typecheck` | Monorepo-wide TypeScript type checking |
| `pnpm test` | Run unit test suites across all packages (Vitest) |
| `pnpm test:e2e` | Run browser end-to-end test suite (`e2e run`) |
| `pnpm db:up` | Start local Postgres containers (5432 dev, 5433 test) and wait until healthy |
| `pnpm db:down` | Stop local Postgres containers (data preserved in volumes) |
| `pnpm db:setup` | All-in-one local setup: `db:up` → `db:migrate` → `db:generate` → `db:seed` |
| `pnpm db:migrate` | Apply Prisma schema migrations to the dev database |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:seed` | Build `@serag/shared` and seed demo catalog, zones, settings and admin user |
| `pnpm db:studio` | Launch Prisma Studio GUI to inspect or edit records |
| `pnpm format` | Format repository code with Prettier |

## Run locally

```bash
cp .env.example .env
pnpm install
pnpm db:setup                                # Postgres (5432 dev, 5433 test) + migrate + generate + seed
pnpm dev                                     # web :3000, api :4000
```

In development (`nuxt dev`), the admin login form at `http://localhost:3000/admin/login` is automatically prefilled using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env` (fallback `admin@serag.local` / `change-me`) via `$development.runtimeConfig.public.devLogin`. In production builds, `devLogin` credentials always ship as empty strings.

## Test

```bash
pnpm test                                    # unit tests in every package (Vitest: shared, ui, web, api)
pnpm --filter @serag/api test:e2e            # API tests against the real test DB (5433)
pnpm test:e2e                                # browser e2e (needs the app running; APP_URL defaults to http://localhost:3000)
pnpm --filter @serag/e2e explore "<goal>"    # exploratory agent run (needs a gateway, see D1)
```

The e2e runner sends anonymous usage telemetry by default; turn it off with `pnpm --filter @serag/e2e exec e2e telemetry disable`.

## Test seed module (E2E only)

The API includes a test seed module (`apps/api/src/test-seed/`) so browser e2e tests can seed isolated test data (products, orders, admin sessions) and clean them up without relying on slow UI workflows or dirtying the demo catalog.

- **Security & gating:**
  - Active **only** when `ALLOW_TEST_SEED=true` **and** `TEST_SEED_SECRET` is at least 16 characters long.
  - If either condition is not met, `TestSeedModule` does not register its controller; requests to `/api/test/*` return **404 Not Found**.
  - When enabled, every request must include the header `x-test-seed-secret: <TEST_SEED_SECRET>`. Missing or mismatching headers return **403 Forbidden** (verified using `timingSafeEqual`).
  - **Never enable in production:** `ALLOW_TEST_SEED` must always remain `false` in production environments.
- **Available routes:**
  - `POST /api/test/seed/product`: seed an isolated product tagged with a `runId`.
  - `POST /api/test/seed/order`: seed an isolated order tagged with a `runId`.
  - `POST /api/test/seed/admin-session`: create a valid signed admin session without UI login.
  - `DELETE /api/test/run/:runId`: clean up all products and orders created for a given `runId`.
  - `POST /api/test/reset`: wipe all test-seeded data.

## Analytics (Umami)

Serag uses self-hosted, privacy-friendly, cookie-less analytics powered by Umami.

- **Tracker routing:** Caddy reverse-proxies the tracker script under `/stats/script.js` and event ingestion under `/stats/api/send`.
- **Funnel events:** Canonical funnel event names are defined in `@serag/shared` (`FUNNEL_EVENTS`):
  - `product_view`
  - `add_to_cart`
  - `checkout_start`
  - `order_placed`
  - `bridal_list_created`
  - `bridal_reserved`
  - `whatsapp_click` (already wired to WhatsApp CTA buttons)
  - `search`
- **Nuxt composable (`useAnalytics`):**
  - Tracks canonical events on the client side.
  - Includes a pre-load queue that buffers up to 20 events before the Umami script finishes loading, and flushes them automatically.
  - Safe against SSR (silently no-ops on the server or when the tracker is blocked/unconfigured).
- **Configuration:** Set `NUXT_PUBLIC_UMAMI_WEBSITE_ID` in `.env` (or Docker environment) to your Umami website ID. In Docker, `NUXT_PUBLIC_UMAMI_HOST` defaults to `/stats`.
- **Dashboard UI access:** The Umami dashboard UI is not reachable under `/stats` (only the tracker script and `/api/send` are proxied). Access the dashboard via `docker compose port umami 3000` or an SSH tunnel. A dedicated subdomain will be set up in production.

## Full stack in Docker

The production-like stack runs via `docker/compose.yml`:

```bash
SESSION_SECRET=$(openssl rand -hex 32) UMAMI_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker/compose.yml up -d --build
```

### Services

- `db`: PostgreSQL 17 with UTF-8 encoding and healthcheck.
- `migrate`: one-shot service running `prisma migrate deploy` on startup; exits with code 0 once done.
- `api`: NestJS 12 API running under a non-root `node` user with healthcheck on `/api/health`.
- `web`: Nuxt 4 SSR app running under a non-root `node` user with healthcheck on `/`. Browser API base is set to same-origin `/api`.
- `umami`: Umami analytics running against its own Postgres database.
- `caddy`: Caddy 2 reverse proxy serving `/` (web), `/api/*` (api), `/uploads/*` (shared volume), `/stats/*` (umami).

### Initial seed command

To seed demo data and the initial admin user in Docker, run the `seed` tool service:

```bash
ADMIN_EMAIL=admin@serag.local ADMIN_PASSWORD=change-me \
  docker compose -f docker/compose.yml --profile tools run --rm seed
```

### Running E2E tests against Docker

Use the test seed overlay (`docker/compose.e2e.yml`):

```bash
SESSION_SECRET=$(openssl rand -hex 32) UMAMI_SECRET=$(openssl rand -hex 32) \
  TEST_SEED_SECRET=ci-test-seed-secret-must-be-32-chars-long-min \
  docker compose -f docker/compose.yml -f docker/compose.e2e.yml up -d --build

APP_URL=http://localhost API_URL=http://localhost/api \
  TEST_SEED_SECRET=ci-test-seed-secret-must-be-32-chars-long-min \
  pnpm test:e2e
```

## CI workflow (`.github/workflows/ci.yml`)

The GitHub Actions CI workflow contains three jobs:

1. **`checks`:** Runs on `ubuntu-latest` with a Postgres 17 service. Steps:
   - Lint (`pnpm lint`)
   - Typecheck (`pnpm typecheck`)
   - Unit tests (`pnpm test` — 114 tests across 4 packages)
   - API tests (`pnpm --filter @serag/api test:e2e` — 17 tests against real DB)
   - Build (`pnpm build`)
   - Browser e2e (`pnpm --filter @serag/e2e exec e2e run` — 7 tests via TesterArmy runner)
2. **`docker`:** Validates Docker builds (`docker compose build`) and runs `compose-smoke` with the e2e overlay (`/api/health` 200, RTL `dir="rtl"` check on `/`).
3. **`lighthouse`:** Builds web and validates mobile Lighthouse performance budgets on `/`:
   - Performance ≥ 0.90
   - Accessibility = 1.0 (100%)
   - Largest Contentful Paint (LCP) < 2.5 s
   - Cumulative Layout Shift (CLS) < 0.1

*Note: The CI workflow is committed locally and verified; the first remote GitHub run is pending push.*

## Working with AI agents

All coding agents and contributors must follow the engineering guidelines in [AGENTS.md](../AGENTS.md) and load the repository skill at [.agents/skills/serag-engineering/SKILL.md](../.agents/skills/serag-engineering/SKILL.md) before writing, modifying, or reviewing code. Architecture patterns, conventions, and definition-of-done checklists are documented in its reference guides.

## Working with Argon and Flash

Claude writes a brief per task in `specs/002-phase1-launch/tasks.md`, Gemini implements it through `agy` (`.agents/skills/agy-delegate`), and Claude installs dependencies, runs every gate and reviews the diff before committing. Gemini may write to `apps/`, `packages/`, `tests/`, `docker/`, `docs/`, `.github/`, the `serag-engineering` skill, `AGENTS.md` and `CLAUDE.md`, and runs no shell commands.

**Model note:** Tasks up to T011 were implemented by Gemini 4 Argon (`A`). After Argon's quota was exhausted on ~16 Oct (resets ~23 Oct), tasks T012b, T012c, T014, and T015 were implemented by Gemini 3.8 Flash (`F`) via Antigravity, and reviewed/verified by Claude (`C`).
