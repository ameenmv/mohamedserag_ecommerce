# Implementation Plan: Slice 3 — «جهّز بيتك» Bridal Builder

**Branch**: `004-bridal-builder` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-bridal-builder/spec.md`

## Summary

Let a bride start from a tier, edit her list room by room, share it read-only, and reserve it with a deposit that locks prices. The `bridal_tiers` and `bridal_lists` tables, the `bridal` order type, the bridal statuses, the `bridal_delivery_agreed` stock reason and the seeded tiers already exist. This plan adds the shared bridal domain (rooms, list math, schemas), public bridal endpoints (tiers, create/read/save list, alternatives, reserve), the storefront pages `/bridal` and `/bridal/:token`, deposit-aware payment confirmation with the price lock, admin reservation actions (agree delivery, extend, re-price), an expiring-locks dashboard card, the tier and settings editor, and the product-page «أضيفي لجهاز العروسة» button. Reservations are orders of type `bridal`, so payments, the one-tap confirm page, history, audit, WhatsApp log, CSV and invoice from Slice 2 are reused.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 24

**Primary Dependencies**: Nuxt 4 + @nuxtjs/i18n + shadcn-vue + Tailwind 4 (web); NestJS 12 + Prisma 7 (api); Zod 4 in `@serag/shared`. No new dependencies.

**Storage**: PostgreSQL. Existing `bridal_tiers`, `bridal_lists`, `orders` (`type`, `bridal_status`, `locked_until`, `preferred_date`, `agreed_delivery_date`, `bridal_list_id`), `stock_movements`, `settings` (`bridal`). New columns: `bridal_tiers.highlights` (jsonb string array) and `orders.lock_days` (int, nullable).

**Testing**: Vitest unit (shared, web, api), API e2e with the test Postgres (`apps/api/test`), browser e2e with the TesterArmy runner (`tests/e2e`).

**Target Platform**: Linux VPS with Docker; mobile browsers first; desktop admin.

**Project Type**: Web application (SSR storefront + admin) with a REST API, pnpm/Turborepo monorepo.

**Performance Goals**: list edits saved within 2 s (debounced 600 ms); /bridal SSR with tier totals computed server-side; no new JS on other storefront pages beyond the product-page button.

**Constraints**: money in integer piastres; RTL Arabic with English locale; 320 px with no horizontal scroll; tokens are 32-byte random base64url; edit token never returned to share-token requests; fail-closed admin permissions with CSRF; Zod only in `*-schema.ts` files.

**Scale/Scope**: tens of lists a day; ~3 storefront pages/sections, ~2 admin screens, ~12 endpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I One stack | Nuxt + NestJS + Prisma only; no new dependency | ✅ |
| II Arabic RTL, Egyptian voice | Copy via i18n ar/en in Egyptian Arabic addressed to the bride (feminine); room labels in both locales; Latin digits for money | ✅ |
| III One brand system | Existing tokens, shadcn-vue Sheet/Dialog/Card; gold accent for tiers as on home | ✅ |
| IV API-first, permission-checked | Public bridal endpoints validated by shared Zod schemas and throttled; admin endpoints use `orders.update` / `orders.confirmPayment` / `bridal.manage` with CSRF and `@Audit` | ✅ |
| V Accessible, fast, mobile-first | 44 px targets, swap/add in bottom Sheet on mobile, sticky total bar, 320 px checks in e2e; list page renders server-side | ✅ |
| VI WhatsApp is the channel | Share, proof, «كلّموا المعرض», installments, lock confirmation and re-price messages are prefilled `wa.me` links; admin openings logged | ✅ |
| Constraints | Share page never shows customer phone or edit token; placeholders shown as-is | ✅ |

Post-design re-check: ✅ no violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-bridal-builder/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/shared/src/
├── bridal.ts               # NEW: rooms, category→room map, limits, list math (subtotals, total, diff, issues), lock math
├── bridal-schema.ts        # NEW: rooms/list/save/reserve/tier/settings/admin action schemas
├── settings-schema.ts      # add bridalSettingsSchema
├── payment.ts              # deposit rule: awaiting_deposit moves on only when paid ≥ deposit
├── whatsapp.ts             # add bridal_repriced template; share/contact text helpers
└── analytics.ts            # add bridal_list_shared

apps/api/prisma/
├── migrations/<ts>_bridal_highlights_lock_days/
└── seed.ts                 # tiers use fixed room keys + highlights

apps/api/src/
├── bridal/                 # NEW public module
│   ├── bridal-tiers.service.ts       # tiers with current totals
│   ├── bridal-lists.service.ts       # create / read by token (mode) / save
│   ├── bridal-pricing.ts             # resolve products → priced rooms (shared math)
│   ├── bridal-reserve.service.ts     # idempotent reservation (order type bridal)
│   └── bridal.controller.ts
├── admin-bridal/           # NEW admin module
│   ├── admin-bridal-tiers.controller.ts / service   # tiers + settings (bridal.manage)
│   ├── bridal-reservation.service.ts                # agree delivery, extend, re-price
│   └── admin-bridal-actions.controller.ts           # /admin/orders/:id/{delivery-date,lock-extend,reprice}, /admin/bridal/expiring
├── admin-orders/           # payments: deposit rule + lock start; stock: reason param; list: type filter
└── settings/               # StoreSettingsService.getBridal()

apps/web/app/
├── pages/bridal/index.vue, bridal/[token].vue, admin/bridal.vue
├── components/store/bridal/*        # tiers, list rooms, item row, swap sheet, add sheet, totals bar, share, reserve form
├── components/admin/bridal/*        # tier editor, settings form, reservation actions, expiring card
├── composables/useBridalList.ts, useBridalReserve.ts, useBridalDevice.ts, useAdminBridal*.ts
└── components/store/product-page/StoreProductPageBridalButton.vue

tests/e2e/tests/
└── bridal-builder, bridal-share, bridal-reserve, bridal-admin .e2e.ts
```

**Structure Decision**: Public bridal behaviour lives in a new `apps/api/src/bridal` module; admin reservation actions and setup in `apps/api/src/admin-bridal`. Payment confirmation and stock stay owned by the Slice 2 services (extended, not duplicated), so retail orders and reservations follow one status/stock path.

## Complexity Tracking

No constitution violations.
