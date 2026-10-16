# Stack and Developer Guide

How the Serag store is built, run and tested. Product scope: [PRD.md](PRD.md). Phase 1 plan: [specs/002-phase1-launch/plan.md](../specs/002-phase1-launch/plan.md).

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
packages/shared Zod schemas, enums, Arabic/phone normalizers, money, WhatsApp templates, zones
packages/ui     Brand tokens (CSS + TS)
packages/config tsconfig bases, ESLint config
tests/e2e       e2e runner config and specs
docker/         compose.dev.yml (DBs), compose.yml (full stack), compose.e2e.yml (test seed on), Caddyfile, Dockerfiles
prototype/      the original HTML prototype and HTML admin (design reference only)
```

## Run locally

```bash
cp .env.example .env
pnpm install
pnpm db:up                                   # Postgres on 5432 (dev) and 5433 (test)
pnpm --filter @serag/api exec prisma migrate dev
pnpm --filter @serag/api exec prisma db seed
pnpm dev                                     # web :3000, api :4000
```

## Test

```bash
pnpm test                                    # unit tests in every package
pnpm --filter @serag/api test:e2e            # API tests against the test DB
pnpm test:e2e                                # browser e2e (needs the app running; APP_URL defaults to http://localhost:3000)
pnpm --filter @serag/e2e explore "<goal>"    # exploratory agent run (needs a gateway, see D1)
```

The e2e runner sends anonymous usage telemetry by default; turn it off with `pnpm --filter @serag/e2e exec e2e telemetry disable`.

## Full stack in Docker

```bash
SESSION_SECRET=... docker compose -f docker/compose.yml up -d --build
# with the test seed module (for e2e only):
SESSION_SECRET=... docker compose -f docker/compose.yml -f docker/compose.e2e.yml up -d --build
```

## Working with Argon

Claude writes a brief per task in `specs/002-phase1-launch/tasks.md`, Gemini 4 Argon implements it through `agy` (`.agents/skills/agy-delegate`), and Claude installs dependencies, runs every gate and reviews the diff before committing. Argon may write to `apps/`, `packages/`, `tests/` and `docker/`, and runs no shell commands.
