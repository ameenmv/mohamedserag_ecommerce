# Agent Guidelines for the Serag Repository

The Serag store (`mohamedserag_ecommerce`) is a modern e-commerce platform for home appliances and bridal preparation ("جهاز العروسة") based in Mansoura, Egypt, founded in 1972. It is built as a pnpm + Turborepo monorepo comprising a Nuxt 4 storefront and `/admin` portal (`apps/web`), a NestJS 12 REST API with PostgreSQL and Prisma 7 (`apps/api`), shared domain logic and Zod schemas (`packages/shared`), brand tokens (`packages/ui`), and a TesterArmy browser e2e test suite (`tests/e2e`).

> **MANDATORY**: Before writing, modifying, or reviewing any code, read the engineering handbook at [`.agents/skills/serag-engineering/SKILL.md`](.agents/skills/serag-engineering/SKILL.md).

## Core Golden Rules

1. **Thin Pages**: Route pages under `apps/web/app/pages/` only declare routes, layouts, SEO/meta, and high-level component composition. Business logic lives in composables.
2. **Single Responsibility**: One clear purpose per component, composable, or utility function. Avoid multi-purpose god files.
3. **No Hardcoded UI Strings**: Every user-facing string must use i18n keys present in **both** `apps/web/i18n/locales/ar.json` and `en.json`. Admin-panel strings (the `admin.*` keys) live in `apps/web/i18n/admin/ar.json` and `en.json` instead: they are loaded only on `/admin` routes (plugin `admin-i18n`) so the storefront's first load stays light. Never add `admin` keys to the `locales/` files.
4. **Logical CSS for RTL**: Use logical spacing and borders (`ms-`, `pe-`, `start-`, `end-`, `border-s-`). Directional icons must use `rtl:` variants (e.g. `rtl:-scale-x-100`).
5. **Shared Logic in `packages/shared`**: Schemas, enums, money math, normalizers, and domain rules live in `@serag/shared` with zero framework dependencies.
6. **Zod at Every Boundary**: Validate API inputs (body, query, params), JSON columns, and client forms through Zod schemas.
7. **Strict Typing, Zero `any`**: TypeScript strict mode is enforced monorepo-wide. Never use `any` or unsanitized type casts.
8. **Match Nuxt Auto-Import Naming**: In nested component folders, align filenames with directory hierarchy prefixes (e.g. `components/admin/dashboard/AdminDashboardWelcomeHeader.vue`).
9. **Integer Piastres for Money**: Store and calculate money as integer piastres (`1 EGP = 100 piastres`); convert only at user display boundaries (`formatEgpWithUnit`).
10. **Hydration-Safe Forms**: Keep inputs and submit buttons disabled until mounted (`hydrated = true`), and enforce POST-only login forms.
11. **Fail-Closed API Security**: Admin endpoints require `@RequirePermission(...)` or `@AnyAdmin()`. Unannotated admin routes are rejected with 403 Forbidden.

## Quality Gate Commands

Every change must pass all quality gates cleanly without warnings:

```bash
pnpm lint            # ESLint (packages, web) + oxlint (api)
pnpm typecheck       # TypeScript check (tsc --noEmit, nuxt typecheck)
pnpm test            # Unit tests across shared, ui, web, and api (Vitest)
pnpm test:e2e        # Browser end-to-end test suite (TesterArmy runner)
pnpm build           # Monorepo-wide production build
```

## Commit and Environment Rules

- **Do NOT commit unless explicitly asked by the user.**
- **NEVER commit `.env` or any file containing real secrets or credentials.**
