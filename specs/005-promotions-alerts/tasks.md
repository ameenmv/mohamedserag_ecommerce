---
description: "Tasks for Slice 4 — Promotions & Stock Alerts"
---

# Tasks: Slice 4 — Promotions & Stock Alerts

**Input**: `specs/005-promotions-alerts/` (spec, plan, research, data-model, contracts)

**Tests**: Requested — shared unit tests, API e2e per endpoint, TesterArmy browser e2e per story. Workflow: Claude briefs → Gemini Flash implements → Claude reviews, runs gates + `pnpm test:e2e`, checks the browser → commit + push on `005-promotions-alerts`. Branches are never deleted.

## Phase 1: Foundational — shared promotions domain

- [ ] T001 [P] `packages/shared/src/promotions.ts` (Zod-free): flash state helpers (`isFlashActive`, `flashStatus`), `effectivePriceFor`, coupon evaluation `evaluateCoupon(coupon, lines, { now, activeUses, phoneUses })` with reason codes and Egyptian Arabic messages, `couponStatus`; tests
- [ ] T002 [P] `packages/shared/src/promotions-schema.ts`: flash sale input, coupon input (code normalization), notify-me input (phone via phone schema, honeypot), admin list queries; tests; export both
- [ ] T003 `catalog.ts`/`cart.ts` types: `flash` on ProductCard/Detail; CartProductRecord gains `categoryId`, `brandId`, `oldPrice`, `flashPrice`; CartQuote coupon gains `reasonCode`

## Phase 2: User Story 1 — Flash sale prices (P1) 🎯

- [ ] T004 [US1] API `promotions/flash-pricing.service.ts` (active sale prices for product ids in one query) used by catalog cards, product detail, search, cart quote and order creation; bridal stays on regular prices
- [ ] T005 [US1] `GET /api/offers`
- [ ] T006 [US1] API e2e: running/scheduled/ended sale prices on cards, detail, quote, order line; bridal unchanged; /offers
- [ ] T007 [US1] Web: price component shows flash state, badge and client countdown on cards and product page; `/offers` page (fixes the header link); i18n
- [ ] T008 [US1] TesterArmy: flash price on card/product/cart/order, then revert after end

## Phase 3: User Story 2 — Coupons (P1)

- [ ] T009 [US2] API real `CouponService` (quote evaluation) + order transaction (row lock, limits, redemption, 409s); redemption release/re-activate in `OrderStatusService`; coupons excluded from bridal
- [ ] T010 [US2] API e2e: percent/fixed/min order/dates/scope/flash+old-price exclusion, total limit under parallel orders, per-phone limit, release on cancel/reject and re-activate on confirm
- [ ] T011 [US2] Web checkout coupon field (apply/remove, reason messages, saving line), `coupon_applied` event
- [ ] T012 [US2] TesterArmy: apply valid/invalid codes, eligible-only discount, order shows discount

## Phase 4: User Story 4 — Admin promotions (P1)

- [ ] T013 [US4] API admin flash sales + coupons CRUD (overlap 409, end-now, deactivate-on-delete, usage stats) + API e2e
- [ ] T014 [US4] Web `/admin/promotions` (tabs: flash sales, coupons) with editors; sidebar entry
- [ ] T015 [US4] TesterArmy: create a flash sale and a coupon in admin, see them on the storefront/checkout

## Phase 5: User Story 3 — Notify me (P2)

- [ ] T016 [US3] API public `POST /notify-me` + admin list/detail/mark-sent (WhatsApp log) + API e2e
- [ ] T017 [US3] Web product-page notify form on out-of-stock products; `/admin/notify` page; `notify_me_requested` event
- [ ] T018 [US3] TesterArmy: request twice → one entry; restock → send link marks sent

## Phase 6: Polish

- [ ] T019 English + 320 px pass, a11y, hydration check of countdowns
- [ ] T020 Docs: docs/PHASE-1.md Slice 4; README roadmap
- [ ] T021 Review: security (coupon limits, notify spam, PII in admin list), consistency with spec

## Dependencies & Strategy

- Phase 1 blocks all. US1 before US2 (coupon eligibility needs flash state). US4 API can follow US2. US3 is independent after Phase 1.
- Chunks: A = T001–T006 (API flash), B = T007–T008 (web flash), C = T009–T012 (coupons), D = T013–T015 (admin), E = T016–T018 (notify-me), F = T019–T021.
