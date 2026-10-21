# Implementation Plan: Slice 2 — Cart, Checkout & Payments

**Branch**: `003-slice2-checkout` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-slice2-checkout/spec.md`

## Summary

Turn the browser cart into real orders and run them through payment confirmation and delivery. The server cart quote, idempotent order creation and the token-protected thank-you lookup already exist (old T030). This plan adds the payment/status engine (confirm, reject, partial payments, transitions, stock movements, history, audit), the storefront cart/checkout/thank-you pages, the admin orders screens with WhatsApp updates, CSV export and invoice print, the one-tap `/admin/confirm/:token` page, and e2e coverage including the 90-second checkout budget.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 24

**Primary Dependencies**: Nuxt 4 + @nuxtjs/i18n + shadcn-vue + Tailwind 4 (web); NestJS 12 + Prisma 7 (api); Zod 4 in `@serag/shared`. No new dependencies.

**Storage**: PostgreSQL (existing `orders`, `order_items`, `order_events`, `payments`, `stock_movements`, `whatsapp_messages`, `settings`); one new column `orders.internal_notes`.

**Testing**: Vitest unit (shared, web, api), API e2e with a real test Postgres (`apps/api/test`), browser e2e with the TesterArmy runner (`tests/e2e`, `e2e run`).

**Target Platform**: Linux VPS with Docker; mobile browsers first (Android Chrome), desktop admin.

**Project Type**: Web application (SSR storefront + admin) with a REST API, pnpm/Turborepo monorepo.

**Performance Goals**: product page → placed order < 90 s (SC-001); confirm action responds < 1 s.

**Constraints**: money in integer piastres; RTL Arabic UI with English locale; 320 px with no horizontal scroll; fail-closed permissions; CSRF on admin mutations; tokens never leak order data without the right token/session.

**Scale/Scope**: one store, tens of orders a day at launch; ~6 new storefront/admin pages, ~12 endpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I One stack | Nuxt + NestJS + Prisma only; no new dependency (CSV and print are hand-rolled) | ✅ |
| II Arabic RTL, Egyptian voice | All copy via i18n ar/en; statuses use PRD Arabic labels; Latin digits for money and numbers | ✅ |
| III One brand system | Existing tokens and shadcn-vue themed components; invoice print uses the same tokens | ✅ |
| IV API-first, permission-checked | Every admin order endpoint uses `orders.read` / `orders.update` / `orders.confirmPayment`; shared Zod schemas | ✅ |
| V Accessible, fast, mobile-first | Sticky mobile total, 44 px targets, 320 px checks in e2e; checkout is SSR with client-only cart hydration | ✅ |
| VI WhatsApp is the channel | Proof message, reject reply and each status update are prefilled `wa.me` links; opening is recorded | ✅ |
| Constraints | Placeholders (`[رقم الواتساب]`) shown as-is; customer phone shown only in admin, never publicly | ✅ |

Post-design re-check: ✅ no violations (see Complexity Tracking: none).

## Project Structure

### Documentation (this feature)

```text
specs/003-slice2-checkout/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Entities, states, stock rules
├── quickstart.md        # How to validate the slice end to end
├── contracts/
│   └── api.md           # REST contracts (public + admin)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
packages/shared/src/
├── cart.ts, cart-schema.ts, order-schema.ts, settings-schema.ts   # exist (T030)
├── order-flow.ts           # transitions + initialStatus (exists) — extend with payment rules
├── payment.ts (+ schema)   # confirm/reject inputs, paid/remaining math
├── order-admin-schema.ts   # admin list query, status change, notes inputs
└── whatsapp.ts             # templates (add order_cancelled), waLink, renderTemplate

apps/api/src/
├── orders/                 # public: cart quote, create, thanks (exist)
├── admin-orders/           # list, detail, status, notes, payments, confirm-token, CSV, WhatsApp log
│   ├── order-status.service.ts     # transitions + history + stock movements (single place)
│   ├── order-payments.service.ts   # confirm / reject / record
│   └── ...controllers
└── settings/               # StoreSettingsService (exists) — add templates + store WhatsApp

apps/web/app/
├── pages/cart.vue, checkout.vue, order/[no]/thanks.vue
├── pages/admin/orders/index.vue, [id].vue, [id]/invoice.vue, admin/confirm/[token].vue
├── components/store/cart/*, store/checkout/*, store/thanks/*
├── components/admin/orders/*, admin/confirm/*
└── composables/useCheckout.ts, useCartQuote.ts, useAdminOrders.ts, useOrderActions.ts

tests/e2e/tests/
└── checkout-cod, checkout-transfer, cod-deposit, confirm-link, order-admin .e2e.ts
```

**Structure Decision**: Keep the existing monorepo layout. Public order endpoints stay in `apps/api/src/orders`; all admin order behaviour goes in a new `apps/api/src/admin-orders` module, with status changes and stock movements owned by one service so every path (confirm link, order page, cancel) behaves the same.

## Complexity Tracking

No constitution violations.
