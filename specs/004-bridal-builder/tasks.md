---
description: "Tasks for Slice 3 — «جهّز بيتك» Bridal Builder"
---

# Tasks: Slice 3 — «جهّز بيتك» Bridal Builder

**Input**: Design documents from `specs/004-bridal-builder/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Requested (unit tests for shared math, API e2e per endpoint, TesterArmy browser e2e per story). Workflow per chunk: Claude briefs → Gemini Flash implements → Claude reviews, runs all gates and `pnpm test:e2e` → commit + push on `004-bridal-builder`. Branches are never deleted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US6 from spec.md

## Phase 1: Setup

- [x] T001 Migration `bridal_tiers.highlights` (jsonb, default `'[]'`) and `orders.lock_days` (int, nullable) in `apps/api/prisma/migrations/20261018160000_bridal_highlights_lock_days/migration.sql` + `apps/api/prisma/schema.prisma`
- [x] T002 Seed tiers with fixed room keys (`kitchen, laundry, living, bedrooms, small_appliances, kitchenware`) placed by product category and 3–4 Arabic highlights each in `apps/api/prisma/seed.ts`

## Phase 2: Foundational — shared bridal domain (blocks all stories)

- [x] T003 [P] `packages/shared/src/bridal.ts`: `BRIDAL_ROOM_KEYS` (order fixed), `CATEGORY_ROOM` map + `roomForCategory(slug)` (fallback `small_appliances`), limits (qty 1–10, ≤ 40 per room, ≤ 120 per list), `normalizeRooms` (rooms in fixed key order, duplicate productIds in a room merged with qty summed and capped at 10), `priceRooms(rooms, products)` → per-room subtotals, total, itemCount, unavailable count, `tierDifference`, `bridalDeposit(total, pct)` (Math.round), `lockEndDate(from, days)` (end of day Africa/Cairo), `lockState({bridalStatus, lockedUntil}, now)` → `{ expired, daysLeft }`; Zod-free; with `bridal.test.ts`
- [x] T004 [P] `packages/shared/src/bridal-schema.ts`: `bridalRoomsSchema`, `createBridalListSchema`, `saveBridalListSchema`, `bridalReserveSchema` (reuses checkout customer/phone schemas; transfer methods only; optional `preferredDate` YYYY-MM-DD not before today Cairo), `bridalTierUpdateSchema` (name 1–40, highlights ≤ 4 × 1–60), `bridalSettingsSchema` (depositPct 1–50, lockDays 7–180) and admin action schemas (`deliveryDate`, `lockExtend`), response types; with `bridal-schema.test.ts`; export both from `index.ts`
- [x] T005 [P] `packages/shared/src/payment.ts`: deposit rule helper `reachesDeposit(order, amount)`; `whatsapp.ts`: `bridal_repriced` template; `analytics.ts`: `bridal_list_shared`; tests updated
- [x] T006 `StoreSettingsService.getBridal()` with defaults in `apps/api/src/settings/store-settings.service.ts`

## Phase 3: User Story 1 — Build a list from a tier (P1) 🎯 MVP

- [x] T007 [US1] `apps/api/src/bridal/` module: `bridal-pricing.ts` (load products incl. category slug, visible/archived, price; uses shared `priceRooms`), `bridal-tiers.service.ts` (`GET /bridal/tiers`), `bridal-lists.service.ts` (create from tier or product, read by token with mode, save draft only), `GET /bridal/alternatives`, controller with throttling; register in `app.module.ts`
- [x] T008 [US1] API e2e `apps/api/test/bridal-lists.e2e-spec.ts`: tiers totals, create, read edit vs share (no editToken), save validation (room keys, qty, size), share-token PATCH 403, alternatives same category
- [x] T009 [P] [US1] `pages/bridal/index.vue` + `components/store/bridal/StoreBridalTierCard.vue`, `StoreBridalTiers.vue`, «ابدئي من الصفر», «كمّلي قايمتك» via `composables/useBridalDevice.ts` (localStorage `serag:bridal:edit`, after hydration)
- [x] T010 [US1] `pages/bridal/[token].vue` + `composables/useBridalList.ts` (state, optimistic edits, debounced 600 ms PATCH, save status) + components `StoreBridalRoom`, `StoreBridalItemRow` (qty stepper, remove, «بدّلي», «نفذ — اختاري بديل»), `StoreBridalSwapSheet` (alternatives with price difference), `StoreBridalAddSheet` (search + room picker), `StoreBridalTotalsBar` (sticky on mobile: total, «الفرق عن الباقة», reserve disabled reasons); i18n ar/en under `store.bridal`
- [x] T011 [US1] TesterArmy `tests/e2e/tests/bridal-builder.e2e.ts`: start from a tier, swap, remove, qty, add, totals, reload keeps list, 375/320 px no horizontal scroll

## Phase 4: User Story 2 — Share with family (P1)

- [x] T012 [US2] View mode on `pages/bridal/[token].vue` (no edit controls, «كلّموا المعرض»), `StoreBridalShareButton` (wa.me text with count, total, share link), not-found state «القايمة دي مش موجودة»
- [x] T013 [US2] TesterArmy `tests/e2e/tests/bridal-share.e2e.ts`: share link read-only, response has no editToken, wrong token page

## Phase 5: User Story 3 — Reserve with deposit and lock (P1)

- [x] T014 [US3] `bridal-reserve.service.ts`: reserve quote endpoint and idempotent `POST /bridal/lists/:token/reserve` (re-price, availability, zone fee, deposit %, lockDays snapshot, order type bridal at awaiting_deposit/bridalStatus awaiting_deposit, order number + tokens like retail, list → awaiting_deposit with customer name/phone) 
- [x] T015 [US3] Payments: deposit rule (stay at awaiting_deposit until paid ≥ deposit, for bridal and large COD), on completion for bridal set bridalStatus locked + lockedUntil; `OrderStatusService` skips stock deduction on confirmed for bridal; confirm responses add `locked`; confirm page and order page show paid/remaining and the `bridal_locked` WhatsApp message with the date
- [x] T016 [US3] API e2e `apps/api/test/bridal-reserve.e2e-spec.ts`: quote, idempotency, PRICE_CHANGED, UNAVAILABLE, frozen list (PATCH 409), partial then full deposit → locked with lockedUntil, no stock change, price change after lock doesn't alter order; large-COD partial deposit stays awaiting_deposit
- [x] T017 [US3] Web: `StoreBridalReserveSheet` (form reusing checkout fields, governorate/city → live quote, deposit and lock days, transfer methods, idempotency key, price-changed notice) + `composables/useBridalReserve.ts`; reserved/frozen banner on the list; thank-you page bridal copy (deposit proof, «هنكلمك نتفق على ميعاد التوصيل والتركيب», «التقسيط متاح في المعرض» WhatsApp)
- [x] T018 [US3] TesterArmy `tests/e2e/tests/bridal-reserve.e2e.ts`: reserve → thank-you → list frozen → confirm half via link (still awaiting) → confirm rest → locked

## Phase 6: User Story 4 — Admin runs reservations (P2)

- [x] T019 [US4] `apps/api/src/admin-bridal/bridal-reservation.service.ts` + controller: delivery-date (stock reason `bridal_delivery_agreed`, shortages), lock-extend, reprice (WhatsApp url), `GET /admin/bridal/expiring`; cancel marks list cancelled; order list `type` filter + bridal columns; detail `bridal` block
- [x] T020 [US4] API e2e `apps/api/test/admin-bridal.e2e-spec.ts`: permissions/CSRF, delivery date stock + cancel restore, extend validation, reprice totals and new lock, expiring list
- [ ] T021 [US4] Web admin: orders list type filter + bridal status/days-left badges; order detail bridal panel (status, lock end, days left, expired badge, actions dialogs: delivery date, extend, re-price with old/new totals + WhatsApp button); dashboard card `AdminDashboardExpiringLocks`
- [ ] T022 [US4] TesterArmy `tests/e2e/tests/bridal-admin.e2e.ts`: filter, agree delivery, extend/re-price on an expired seeded reservation, dashboard card

## Phase 7: User Story 5 — Tiers and settings (P2)

- [x] T023 [US5] `admin-bridal-tiers.controller.ts`/service: tiers GET/PUT, settings GET/PUT (`bridal.manage`, CSRF, audit) + API e2e
- [ ] T024 [US5] `pages/admin/bridal.vue` + `components/admin/bridal/*`: three tier tabs, per-room product list with search add, qty, remove, flagged items, highlights, settings form; nav entry already at `/admin/bridal`

## Phase 8: User Story 6 — Product page button & funnel (P3)

- [ ] T025 [US6] `StoreProductPageBridalButton.vue` on `pages/p/[slug].vue` (eager; adds to device draft list or creates one; toast with link); analytics events `bridal_list_created`, `bridal_list_shared`, `bridal_reserved`
- [ ] T026 [US6] TesterArmy: add from product page and funnel events (umami stub)

## Phase 9: Polish & Cross-Cutting

- [ ] T027 English pass, 320 px pass, a11y labels, Lighthouse check of /bridal
- [ ] T028 Docs: `docs/PHASE-1.md` slice 3 status, README roadmap box
- [ ] T029 Review: security (tokens, PII on share page), speckit-analyze consistency

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 block everything. US1 (T007–T011) first; US2 builds on US1's page. US3 needs US1 (+ Slice 2 payments). US4 needs US3. US5 needs only Phase 2. US6 needs US1.
- Within a story: shared → API (+ API e2e) → web → browser e2e.

## Parallel Opportunities

- T003, T004, T005 in parallel. T009 alongside T007 once contracts are fixed. US5 can run in parallel with US3/US4 (different modules).

## Implementation Strategy

1. Chunk A = Phase 1 + Phase 2 + US1 API (T001–T008).
2. Chunk B = US1 web + US2 (T009–T013) → MVP demo: build and share.
3. Chunk C = US3 (T014–T018) → reservations with deposit.
4. Chunk D = US4 + US5 (T019–T024); Chunk E = US6 + polish (T025–T029).
5. Each chunk is one commit on `004-bridal-builder`, pushed after gates + TesterArmy e2e pass.
