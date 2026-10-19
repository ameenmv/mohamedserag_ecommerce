# Implementation Plan: Slice 4 — Promotions & Stock Alerts

**Branch**: `005-promotions-alerts` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

## Summary

Add flash sales (effective price at read time, countdowns, /offers), real coupons in the cart quote and order transaction with concurrency-safe limits and redemption release on cancel/reject, and notify-me requests with an admin waiting list and prefilled WhatsApp. Tables `flash_sales`, `flash_sale_items`, `coupons`, `coupon_redemptions`, `notify_requests` and the permissions `promotions.manage` / `notify.manage` already exist.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 24
**Primary Dependencies**: Nuxt 4, @nuxtjs/i18n, shadcn-vue, Tailwind 4; NestJS 12, Prisma 7; Zod 4 in `@serag/shared`. No new dependencies.
**Storage**: PostgreSQL. Existing tables; one migration: `coupons.code` unique on `upper(code)` handled by storing upper-case (no schema change needed) and `notify_requests.updated_at` index for ordering (optional).
**Testing**: Vitest unit, API e2e (`apps/api/test`), TesterArmy browser e2e (`tests/e2e`).
**Performance Goals**: effective-price lookup adds one indexed query per list/quote (`flash_sale_items` by productIds joined to active sales); no N+1.
**Constraints**: integer piastres; Cairo time for display; fail-closed admin permissions + CSRF; Zod only in `*-schema.ts`; storefront must not pull Zod into page chunks (Slice 3 perf rule).

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I One stack | No new dependency | ✅ |
| II Arabic RTL, Egyptian voice | All refusal reasons and copy in Egyptian Arabic + English | ✅ |
| III One brand system | Existing price component extended; gold flash badge | ✅ |
| IV API-first, permission-checked | Shared schemas; `promotions.manage`, `notify.manage`; audit + CSRF | ✅ |
| V Accessible, fast, mobile-first | Countdown uses `aria-live="off"` with a static label; 320 px checks | ✅ |
| VI WhatsApp is the channel | Notify-me sent via prefilled links, logged | ✅ |

## Project Structure

```text
packages/shared/src/
├── promotions.ts            # effectivePrice, flash state, coupon evaluation (pure), refusal reasons
├── promotions-schema.ts     # flash sale / coupon admin inputs, coupon apply input, notify-me input
├── cart.ts                  # CartProductRecord gains categoryId, brandId, oldPrice, flash; coupon eval uses lines
└── catalog.ts               # ProductCard/Detail gain `flash: { salePrice, endsAt } | null`

apps/api/src/
├── promotions/              # flash pricing service (active sale prices for ids), coupon service (real), public /offers + notify-me
├── admin-promotions/        # flash sales + coupons CRUD (promotions.manage)
├── admin-notify/            # waiting lists, mark sent (notify.manage)
├── catalog/                 # cards/detail/search use effective price
├── orders/                  # quote + order creation: effective price, coupon in tx, redemption
└── admin-orders/            # release/re-activate redemption on cancel / reject / confirm

apps/web/app/
├── pages/offers.vue, pages/admin/promotions/{index,flash/[id],coupons/[id]}.vue, pages/admin/notify.vue
├── components/store/product/StoreProductFlashBadge.vue, StoreProductCountdown.client.vue
├── components/store/offers/*, components/store/product-page/StoreProductPageNotifyMe.vue
├── components/store/checkout (coupon field becomes real)
└── components/admin/promotions/*, components/admin/notify/*
```

## Complexity Tracking

No constitution violations.
