---
description: "Tasks for Slice 2 — Cart, Checkout & Payments"
---

# Tasks: Slice 2 — Cart, Checkout & Payments

**Input**: Design documents from `specs/003-slice2-checkout/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Requested by the spec and the phase plan (API e2e per endpoint, TesterArmy browser e2e per story, 90-second checkout budget). Workflow per task: Claude briefs → Gemini Flash implements → Claude reviews, runs all gates and the TesterArmy e2e runner (`pnpm test:e2e`) → commit + push on `003-slice2-checkout`.

**Mapping to the phase list** (`specs/002-phase1-launch/tasks.md`): T030 → T001–T003, T031 → T004–T010, T032 → T011–T019, T033 → T025–T032, T034 → T020–T022, T035 → T023–T024 + T033–T034, T036 → T037–T039.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 from spec.md

## Phase 1: Setup (already done)

- [x] T001 Migration `orders.idempotency_key` (unique) and sequence `order_no_seq` in `apps/api/prisma/migrations/20261018120000_order_idempotency_and_number_seq/migration.sql`
- [x] T002 Shared cart quote, order and settings schemas in `packages/shared/src/{cart,cart-schema,order-schema,settings-schema}.ts`; `StoreSettingsService` in `apps/api/src/settings/`
- [x] T003 Public `POST /api/cart/quote`, idempotent `POST /api/orders`, `GET /api/orders/:no/thanks?t=` in `apps/api/src/orders/` with `apps/api/test/orders.e2e-spec.ts`

---

## Phase 2: Foundational — payment & status engine (blocks US2–US4)

**Purpose**: One place that changes order status, records payments, writes history and moves stock, so the confirm link, the order page and cancel behave the same.

- [x] T004 Migration adding `internalNotes String? @map("internal_notes")` to `Order` (admin-only, "max 2000 chars") in `apps/api/prisma/schema.prisma` + new migration folder (Claude runs migrate/generate)
- [x] T005 [P] Shared payment rules in `packages/shared/src/payment.ts` + `payment-schema.ts`: `confirmPaymentInputSchema` ("amount int > 0", "note ≤ 300"), `rejectPaymentInputSchema` ("reason 3–300"), `orderStatusChangeSchema` (`to ∈ OrderStatus`, cancel needs "reason 3–300"), `remainingAmount`, `depositRemaining`, `defaultConfirmAmount` (remaining deposit for awaiting_deposit, else remaining total), `paymentConfirmableStatuses` = awaiting_payment | awaiting_deposit | payment_rejected; unit tests in `payment.test.ts`
- [x] T006 [P] Add `order_cancelled` template to `DEFAULT_TEMPLATES` and a `statusTemplateKey(status)` helper in `packages/shared/src/whatsapp.ts`; extend `StoreSettingsService` with `getTemplates()` and `getStoreWhatsapp()` in `apps/api/src/settings/store-settings.service.ts`
- [x] T007 `OrderStockService` in `apps/api/src/admin-orders/order-stock.service.ts`: on confirm deduct `taken = min(qty, stock)` per item with movement `qty = −taken`, reason `order_confirmed`; on cancel restore exactly the negated sum of that order's `order_confirmed` movements with reason `order_cancelled`; skip items with `productId = null`; return a shortage warning list
- [x] T008 `OrderStatusService` in `apps/api/src/admin-orders/order-status.service.ts`: `transition(tx, orderId, to, userId, note?)` using conditional `updateMany where { id, status in allowedFrom }` (0 rows → 409 «الطلب اتحدث، حدّث الصفحة»), writes `OrderEvent`, calls stock deduct on entering `confirmed` and restore on `cancelled`
- [x] T009 `OrderPaymentsService` in `apps/api/src/admin-orders/order-payments.service.ts`: `confirm(orderId, {amount,note}, userId)` → Payment(confirmed), `paidAmount += amount`, transition to `confirmed` when status is payment-confirmable, otherwise only adds a payment (statuses confirmed/out_for_delivery/delivered); `reject(orderId, {reason}, userId)` → Payment(rejected, reason), transition to `payment_rejected`; one `$transaction` each; `@Audit`
- [x] T010 API e2e for the engine in `apps/api/test/order-engine.e2e-spec.ts`: double confirm in parallel → one payment and one stock deduction; confirm with insufficient stock → stock 0 not negative and cancel restores exactly what was taken; cancel of a never-confirmed order → no movement; reject then confirm; partial payments add up; illegal transition → 409

**Checkpoint**: Engine ready; US2 and US4 can start.

---

## Phase 3: User Story 1 — Guest places an order (P1) 🎯 MVP

**Goal**: Cart drawer/page, checkout and thank-you page on the storefront.

**Independent Test**: add two products → checkout with الدقهلية/طلخا and COD → thank-you shows «هنكلمك نأكد الطلب»; the order exists at «جديد».

- [x] T011 [P] [US1] Public `GET /api/settings/checkout` (enabled payment methods with name/hint/account, codDeposit, storeWhatsapp, governorates from zones + a static Egypt governorates list) in `apps/api/src/settings/checkout-settings.controller.ts` + e2e in `apps/api/test/checkout-settings.e2e-spec.ts`
- [x] T012 [P] [US1] `useCartQuote` composable (debounced `POST /api/cart/quote` with `knownPrice` per line, keeps last quote, applies capped quantities back to the cart) in `apps/web/app/composables/useCartQuote.ts` + unit test
- [x] T013 [US1] Cart drawer and `/cart` page sharing `useCart` + `useCartQuote`: qty stepper, remove, line issues («نفذ», «الكمية المتاحة N», «السعر اتغير من X لـ Y»), subtotal/discount/fee/total in `apps/web/app/components/store/cart/*` and `apps/web/app/pages/cart.vue`
- [x] T014 [US1] `useCheckout` composable: form state with shared `createOrderInputSchema` client validation, idempotency key generated once per attempt and kept until success, place order with `expectedTotal`, 409 handling (show fresh quote), redirect to thank-you in `apps/web/app/composables/useCheckout.ts` + unit test
- [x] T015 [US1] `/checkout` page: fields name, mobile («٠١٠…» accepted), governorate select, city/markaz, address, notes; payment methods from settings; deposit notice when `quote.codDeposit.required`; lead time for on-request lines; «لو محتاج يوم معيّن كلّمنا على واتساب» link; coupon field returning the placeholder; sticky mobile total + place button; empty-cart state in `apps/web/app/pages/checkout.vue` and `apps/web/app/components/store/checkout/*`
- [x] T016 [US1] Thank-you page `/order/[no]/thanks?t=` showing number, items, totals, method, next step; COD «هنكلمك نأكد الطلب»; not-found state for wrong/missing token (no order data, `noindex`) in `apps/web/app/pages/order/[no]/thanks.vue` and `apps/web/app/components/store/thanks/*`
- [x] T017 [US1] Clear the cart after a successful order; header cart badge updates in `apps/web/app/composables/useCheckout.ts`
- [x] T018 [P] [US1] i18n keys for cart/checkout/thanks in both `apps/web/i18n/locales/ar.json` and `en.json`
- [x] T019 [US1] Browser e2e `tests/e2e/tests/checkout-cod.e2e.ts`: two products → Talkha fee → COD → thank-you; double-click place order → one order; product page → placed order < 90 s; 320 px no horizontal scroll on `/checkout`

**Checkpoint**: Shoppers can place COD orders end to end.

---

## Phase 4: User Story 2 — Transfer confirmed from WhatsApp (P1)

**Goal**: Transfer instructions + WhatsApp proof, one-tap admin confirm page.

**Independent Test**: InstaPay order → WhatsApp proof link has number, amount, confirm URL → admin confirms from the link → «مؤكد», payment recorded, stock reduced.

- [x] T020 [US2] Admin confirm-link API `GET /api/admin/confirm/:token`, `POST …/confirm`, `POST …/reject` (permission `orders.confirmPayment`, CSRF, `@HttpCode(200)`, uses `OrderPaymentsService`; reject response includes `rejectWhatsappUrl` from the `payment_rejected` template) in `apps/api/src/admin-orders/admin-confirm.controller.ts` + e2e `apps/api/test/admin-confirm.e2e-spec.ts` (401 without session, 404 unknown token, confirmed order shows status only)
- [x] T021 [US2] Thank-you transfer block: account details, amount (deposit amount for deposit orders), «ابعت إثبات التحويل على واتساب» built with `waLink` + `payment_proof` template including `<origin>/admin/confirm/<confirmToken>` in `apps/web/app/components/store/thanks/StoreThanksTransfer.vue`
- [x] T022 [US2] Mobile page `/admin/confirm/[token]` (auth middleware redirects to login with `returnTo` and back): summary, expected amount (editable), «تأكيد الدفع», «رفض» with required reason, then prefilled WhatsApp reply; status-only view when not confirmable in `apps/web/app/pages/admin/confirm/[token].vue` + `apps/web/app/components/admin/confirm/*`
- [x] T023 [US2] Browser e2e `tests/e2e/tests/checkout-transfer.e2e.ts` (InstaPay order, WhatsApp proof href contains order no and confirm URL) and `tests/e2e/tests/confirm-link.e2e.ts` (login redirect returns to the page, reject with reason then confirm → «مؤكد», stock reduced)

**Checkpoint**: Transfers can be confirmed from a phone.

---

## Phase 5: User Story 3 — Large COD deposit (P1)

**Independent Test**: COD cart above 30,000 ج.م → deposit explained → «بانتظار العربون» → confirm deposit → «مؤكد» with remaining amount.

- [x] T024 [US3] Browser e2e `tests/e2e/tests/cod-deposit.e2e.ts`: deposit notice with amount before placing, thank-you shows deposit transfer block, confirm deposit via link → «مؤكد», admin shows paid = deposit and remaining; two partial confirmations add up (API-level assertion via test seed)

(Deposit logic itself is delivered by T003, T009, T015, T021.)

---

## Phase 6: User Story 4 — Admin manages orders (P2)

**Independent Test**: filter «بانتظار الدفع» → open → confirm → dispatch → deliver; history complete; WhatsApp button logged; CSV contains the order.

- [ ] T025 [P] [US4] Shared admin schemas in `packages/shared/src/order-admin-schema.ts`: `adminOrderListQuerySchema` ("status?, paymentMethod?, from?, to? ISO dates, q? ≤ 60, page ≥ 1, pageSize ≤ 100"), `orderNotesSchema` ("internalNotes ≤ 2000"), `whatsappLogSchema`, `AdminOrderRow`, `AdminOrderDetail` types
- [ ] T026 [US4] Admin orders API in `apps/api/src/admin-orders/admin-orders.controller.ts`: list with filters/search (number, name, phone normalized)/pagination/status counts, detail (incl. `allowedTransitions`, payments, events, whatsappMessages), `PATCH status` via `OrderStatusService`, `PATCH notes`, `POST payments/confirm|reject` via `OrderPaymentsService`, `POST whatsapp` log; permissions `orders.read` / `orders.update` / `orders.confirmPayment`; e2e `apps/api/test/admin-orders.e2e-spec.ts`
- [ ] T027 [US4] CSV export `GET /api/admin/orders/export.csv` (same filters, UTF-8 BOM, money in EGP, Arabic headers) in `apps/api/src/admin-orders/admin-orders-export.service.ts` + e2e
- [ ] T028 [US4] Admin orders list page with status tabs + counts, filters, search, pagination in `apps/web/app/pages/admin/orders/index.vue` and `apps/web/app/components/admin/orders/AdminOrdersList*.vue`
- [ ] T029 [US4] Admin order detail page: customer (phone + WhatsApp chat link), items, totals, deposit, paid/remaining, payments with confirm/reject, status actions (only allowed transitions; cancel asks reason), history timeline, internal notes, WhatsApp status button (logs then opens) in `apps/web/app/pages/admin/orders/[id].vue` and `apps/web/app/components/admin/orders/AdminOrderDetail*.vue`
- [ ] T030 [US4] Internal invoice print page `apps/web/app/pages/admin/orders/[id]/invoice.vue` (store details placeholders, customer, items, VAT-inclusive totals, payments, remaining; print CSS)
- [ ] T031 [P] [US4] Admin sidebar entry and command-palette action for Orders in `apps/web/app/components/admin/` (existing nav files)
- [ ] T032 [US4] Browser e2e `tests/e2e/tests/order-admin.e2e.ts`: filter, confirm, dispatch, deliver, history entries, cancel restores stock, WhatsApp link href matches template, CSV download contains the order number

---

## Phase 7: User Story 5 — Funnel events (P3)

- [x] T033 [US5] Send `checkout_start` once per checkout visit and `order_placed` once (total, item count, no PII) via `useAnalytics` in `apps/web/app/composables/useCheckout.ts` + unit test
- [ ] T034 [US5] Assert events in `tests/e2e/tests/checkout-cod.e2e.ts` (analytics stub)

---

## Phase 8: Polish & Cross-Cutting

- [ ] T035 [P] English locale pass for all new pages (`/en/cart`, `/en/checkout`, `/en/order/...`) and RTL/LTR icon flips
- [ ] T036 [P] Update `docs/` and `specs/002-phase1-launch/tasks.md` (tick T030–T036 as their mapped tasks finish)
- [ ] T037 Slice review: all gates, `pnpm test:e2e` twice, 375/320 px checks on cart/checkout/thanks/confirm, Lighthouse a11y on `/checkout`
- [ ] T038 Run `quickstart.md` scenarios manually in the browser (ar + en)
- [ ] T039 Security pass: token secrecy (thanks/confirm), CSRF on every admin mutation, permissions on every admin route, no phone in public responses

---

## Dependencies & Execution Order

- Phase 1 done. Phase 2 (T004–T010) blocks US2 and US4; US1 (T011–T019) depends only on Phase 1 and can run in parallel with Phase 2.
- US2 needs Phase 2 + T016 (thank-you page). US3 needs US1 + US2. US4 needs Phase 2 (+ T025). US5 needs T014.
- Within a phase: shared schemas → API → web → e2e.

## Parallel Opportunities

- T005, T006 in parallel; T011, T012, T018 in parallel; T025 and T031 in parallel with T026.
- After Phase 2: US1 web work and US4 API work touch different apps and can run side by side.

## Implementation Strategy

1. MVP = Phase 2 + US1 (COD orders) → demo.
2. Add US2 (transfers + confirm link) and US3 (deposit e2e) → payments complete.
3. Add US4 (admin operations), US5 (funnel), then polish and review.
4. Each delegated chunk is one commit on `003-slice2-checkout`, pushed after gates + TesterArmy e2e pass. Branches are never deleted.
