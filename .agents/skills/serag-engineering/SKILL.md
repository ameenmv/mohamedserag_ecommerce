---
name: serag-engineering
description: The Serag repo's architecture, conventions, and definition of done; load before writing, reviewing, or planning ANY code in this repo (web, api, shared, tests), and before writing a delegation brief.
---

# Serag Engineering Handbook

The Serag store (`mohamedserag_ecommerce`) is a modern e-commerce platform for home appliances and bridal preparation ("جهاز العروسة") based in Mansoura, Egypt, operating since 1972. It is built as a pnpm + Turborepo monorepo:

- `apps/web`: Nuxt 4 storefront and `/admin` portal (Vue 3, Tailwind 4, shadcn-vue, `@nuxtjs/i18n`).
- `apps/api`: NestJS 12 REST API on PostgreSQL 17 via Prisma 7, session auth, audit logging, and seed helpers.
- `packages/shared`: Pure TypeScript domain logic, Zod schemas, Arabic/phone normalizers, money, enums, WhatsApp templates, and zones. Zero framework dependencies.
- `packages/ui`: Brand tokens (CSS `@theme` and TypeScript exports) for the Serag palette and shadcn theme.
- `packages/config`: Shared ESLint flat configuration, Prettier, and TypeScript base configurations.
- `tests/e2e`: Browser end-to-end test suite powered by TesterArmy's `e2e` runner (Playwright under the hood).
- `docker/`: Compose environments (`compose.dev.yml` for DBs, `compose.yml` for full stack, `compose.e2e.yml` for testing), Caddy reverse proxy, and Dockerfiles.
- `prototype/`: Original static HTML storefront and admin (design and catalog reference only; do not edit).

---

## Golden Rules

Every coding agent working in this repo must follow these rules without exception:

1. **Thin Pages**: Route pages under `apps/web/app/pages/` handle only routing, page meta/SEO, and high-level composition. Business logic belongs in composables, UI in components.
2. **Single Responsibility**: One clear purpose per component, composable, or utility. Never create multi-purpose god files.
3. **No Hardcoded UI Strings**: Every user-facing label, placeholder, and message must use i18n keys present in **both** `apps/web/i18n/locales/ar.json` and `en.json`. The `i18n-messages.test.ts` gate strictly fails if keys diverge.
4. **Logical CSS for RTL**: Use logical spacing and borders (`ms-`, `pe-`, `start-`, `end-`, `border-s-`, `border-e-`). Directional icons must use `rtl:` variants (e.g. `rtl:-scale-x-100`).
5. **Shared Logic in `packages/shared`**: Schemas, enums, money math, normalizers, and domain rules live in `@serag/shared` with zero framework dependencies.
6. **Zod at Every Boundary**: Validate API payloads, queries, params, JSON columns, and client forms through Zod schemas.
7. **Strict Typing, Zero `any`**: TypeScript strict mode is enforced repo-wide (`noUncheckedIndexedAccess`). Never use `any` or unsanitized type casts.
8. **Match Nuxt Auto-Import Directory Naming**: Component filenames in nested folders must match Nuxt's auto-import prefix (e.g. `components/admin/dashboard/AdminDashboardWelcomeHeader.vue` registers as `<AdminDashboardWelcomeHeader>`). Mismatches cause runtime component resolution errors.
9. **Unidirectional Dependencies & No Circular Imports**: Apps depend on packages, never packages on apps. Composables and modules must never import each other cyclically.
10. **Integer Piastres for Money**: Money is always stored and calculated as integer piastres (`1 EGP = 100 piastres`). Convert at user input and display boundaries only (`formatEgpWithUnit`).
11. **Hydration-Safe Forms**: Keep inputs and submit buttons disabled until mounted (`hydrated = true`), and submit forms via POST only. Never allow premature native submits to leak credentials into URL parameters.
12. **Never Commit Secrets**: Secrets, session keys, and database URLs live in `.env` or Docker env files. Never commit `.env` or write credentials into tests.
13. **Fail-Closed API Permissions**: Admin endpoints must declare `@RequirePermission(...)` or `@AnyAdmin()`. Unannotated admin routes are rejected with `403 Forbidden` by `PermissionGuard`.
14. **Gates Must Pass Green**: A task is never done until `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e` pass with zero warnings.

---

## Engineering Judgment: Avoid Over-Engineering

We prize senior, pragmatic simplicity over premature abstraction.

### What to Avoid:
- **No abstraction until the second real caller**: Do not write generic helpers or utilities for single-use code.
- **No wrapper around a library that adds nothing**: Use `@vueuse/core`, `reka-ui`, or `$fetch` directly unless policy requires wrapping (e.g. `adminFetch` enforcing CSRF).
- **No speculative "base" classes or services**: Build concrete controllers, services, and components.
- **No external state management library**: Nuxt's SSR-safe `useState` is sufficient; do not introduce Pinia or Redux.
- **Prefer deleting code**: Delete obsolete code, unused props, and dangling returns rather than keeping dead paths.
- **Comments explain *why*, not *what***: Do not restate obvious code. Document security constraints, business rules, or non-obvious browser quirks.
- **Small, focused changes**: Scope each commit to one task matching the Phase 1 plan.

### What is NOT Optional:
- **Boundary Validation**: Zod validation pipes on the API and form validation on the client.
- **Accessibility (a11y)**: Accessible semantic HTML, proper ARIA labels, form error linkages (`aria-invalid`, `aria-describedby`), 44px minimum touch targets, and skip links.
- **i18n Parity**: Arabic (primary RTL) and English (LTR) mirroring with matching key trees.
- **Tests for Pure Logic**: Unit tests for normalizers, money, state machines, and pure utils.
- **Explicit Error & Empty States**: Every UI view must gracefully handle loading, empty, and error states.

---

## Reference Guide

Read the reference document that corresponds to your task before writing code:

| Area | Topic | Reference File |
|---|---|---|
| Architecture & Monorepo | Repository layout, package boundaries, admin auth data flow, API modules | [architecture.md](references/architecture.md) |
| Web & UI Components | Nuxt 4, Vue 3 conventions, auto-import rules, shadcn-vue, styling, a11y, forms | [frontend.md](references/frontend.md) |
| Internationalization | RTL/LTR, locale files, key namespaces, route prefixing, error key mapping | [i18n.md](references/i18n.md) |
| Backend & Database | NestJS 12 modules, in-house Zod pipe, Prisma 7, guards, audit log, test seeds | [backend.md](references/backend.md) |
| Quality Gates & Testing | Exact gate commands, test locations, e2e conventions, browser verification | [testing-and-gates.md](references/testing-and-gates.md) |
| AI Agent Delegation | Orchestrator/implementer roles, brief template, real review checklist | [delegation.md](references/delegation.md) |

---

## Definition of Done (DoD) Checklist

Before marking any task or PR as done, verify each item:

- [ ] **Lint**: `pnpm lint` passes with 0 errors and 0 warnings (ESLint and oxlint).
- [ ] **Typecheck**: `pnpm typecheck` passes with zero TypeScript errors across all workspaces.
- [ ] **Unit Tests**: `pnpm test` passes all unit tests (shared, ui, web, api).
- [ ] **API Tests**: `pnpm --filter @serag/api test:e2e` passes against the real test database.
- [ ] **E2E Tests**: `pnpm test:e2e` passes browser end-to-end tests for affected flows.
- [ ] **Build**: `pnpm build` succeeds for all apps and packages.
- [ ] **i18n Parity**: Every new or modified key is added to both `ar.json` and `en.json`.
- [ ] **No Console Warnings**: Dev tools show zero Nuxt "Duplicated imports" or Vue "Failed to resolve component" warnings.
- [ ] **Manual UI Inspection**: Verified in browser at both 1280px and 375px/320px in Arabic (RTL) and English (LTR).
