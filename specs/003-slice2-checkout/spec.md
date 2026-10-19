# Feature Specification: Slice 2 — Cart, Checkout & Payments

**Feature Branch**: `003-slice2-checkout`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Slice 2 — Cart, checkout & payments for the Serag store (PRD US-5.1 to US-5.5, US-6.1 to US-6.3, US-7.1, US-7.2, US-3.3). Real cart (drawer + /cart) synced to the server quote; guest checkout with zone by governorate + city and normalized Egyptian mobile; idempotent order creation; thank-you page with public token; COD, InstaPay, Vodafone Cash (Fawry only if enabled); transfer proof via prefilled WhatsApp with the admin confirm link; one-tap admin confirm page; large-COD deposit; partial payments; status flow with history; stock movements on confirm/cancel; prefilled WhatsApp status updates; admin orders list/detail, CSV export, internal invoice print. Cart quote, order creation and thank-you lookup on the server are already built. Coupons are a placeholder until Slice 4."

Product source of truth: [docs/PRD.md](../../docs/PRD.md) (E3, E5, E6, E7). Parent phase spec: [002-phase1-launch](../002-phase1-launch/spec.md) (Slice 2).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest places an order (Priority: P1)

A shopper adds products to the cart, reviews it in the cart drawer or cart page, fills a short guest checkout form (name, mobile, governorate, city/markaz, address, notes), picks a payment method and places the order. They land on a thank-you page that shows the order number, items, total, payment method and the next step.

**Why this priority**: Without placing orders there is no store. Everything else in this slice depends on orders existing.

**Independent Test**: Add two products → checkout with a Mansoura address and cash on delivery → the thank-you page shows the order with «هنكلمك نأكد الطلب»; the admin sees a new order at «جديد».

**Acceptance Scenarios**:

1. **Given** a cart with two in-stock products, **When** the shopper chooses governorate الدقهلية and city طلخا, **Then** the delivery fee shown is the Mansoura zone fee and the total updates before placing the order.
2. **Given** a product's price changed since it was added to the cart, **When** the shopper opens checkout or presses place order, **Then** the changed price is shown next to the old one and the order is not placed until the shopper sees the new total.
3. **Given** a mobile typed as «٠١٠ ١٢٣٤ ٥٦٧٨», **When** the order is placed, **Then** it is stored and shown as `01012345678`.
4. **Given** the shopper presses place order twice or the network retries, **When** the requests arrive, **Then** exactly one order is created and both lead to the same thank-you page.
5. **Given** the thank-you link without the right token, **When** anyone opens it, **Then** no order information is shown.
6. **Given** a cart item becomes out of stock before checkout, **When** the shopper reviews the cart, **Then** the item is marked «نفذ» and the order cannot be placed until it is removed.
7. **Given** an on-request product in the cart, **When** the shopper reaches checkout, **Then** its lead time text is shown.

---

### User Story 2 - Transfer payment confirmed from WhatsApp (Priority: P1)

A shopper pays by InstaPay or Vodafone Cash. The thank-you page shows the account details and a «ابعت إثبات التحويل على واتساب» button that opens WhatsApp to the store with the order number, amount, method and the admin confirmation link. The admin opens the link on their phone, logs in if needed, sees the order summary and confirms or rejects (with a reason) in one tap.

**Why this priority**: Transfers are the most common prepaid method and the store cannot dispatch without confirming them.

**Independent Test**: Place an InstaPay order → the WhatsApp proof link contains the order number, amount and confirm link → open the confirm link as admin and confirm → the order moves to «مؤكد», the payment is recorded and stock is deducted.

**Acceptance Scenarios**:

1. **Given** a transfer order at «بانتظار الدفع», **When** the admin confirms from the link, **Then** the order becomes «مؤكد», a confirmed payment (amount, method, time, admin) is recorded and stock is deducted with a stock movement per item.
2. **Given** the admin is not logged in, **When** they open the confirm link, **Then** they are asked to log in and return to the same confirm page.
3. **Given** the admin rejects with a reason, **Then** the order becomes «الدفع مرفوض» and a prefilled WhatsApp reply to the customer is offered.
4. **Given** an order at «الدفع مرفوض», **When** the admin confirms a new proof from the same link, **Then** it becomes «مؤكد».
5. **Given** a confirm link for an order that is already confirmed or cancelled, **When** it is opened, **Then** the page shows the current status and offers no confirm action.
6. **Given** a confirm link opened without an admin session, **Then** no order data is shown before login.

---

### User Story 3 - Large cash order needs a deposit (Priority: P1)

A shopper chooses cash on delivery for an order above the deposit threshold (default 30,000 ج.م). Checkout explains before placing the order that a deposit (default 10%) is needed by transfer. The order starts at «بانتظار العربون» and the deposit follows the same WhatsApp proof and confirm flow; the rest is paid on delivery.

**Why this priority**: Protects the store from fake big orders that waste a truck trip.

**Independent Test**: A COD cart above the threshold → checkout shows the deposit amount → order placed at «بانتظار العربون» → admin confirms the deposit → «مؤكد», paid amount equals the deposit and the remaining amount is due on delivery.

**Acceptance Scenarios**:

1. **Given** a COD cart above the threshold, **When** checking out, **Then** the deposit percentage and amount are explained before the order is placed.
2. **Given** a deposit is confirmed, **Then** the order shows paid and remaining amounts.
3. **Given** several partial transfers, **When** each is confirmed, **Then** the paid amount is their sum.

---

### User Story 4 - Admin manages orders through their life (Priority: P2)

The admin sees an orders list (filter by status, payment method, date; search by number, name or phone), opens an order, moves it through the status flow, cancels it when needed, records payments, adds internal notes, sends the customer a prefilled WhatsApp message for each status, exports orders as CSV and prints an internal invoice.

**Why this priority**: Day-to-day operation of the store; needed soon after the first orders arrive but confirmation (Story 2) covers the critical path.

**Independent Test**: Seed orders in several states → filter by «بانتظار الدفع» → open one → confirm → mark «خرج للتوصيل» then «تم التسليم» → history lists every change with time and admin → WhatsApp button text matches the status template → CSV export contains the order.

**Acceptance Scenarios**:

1. **Given** an order at «مؤكد», **When** the admin cancels it, **Then** it becomes «ملغي» and the deducted stock is restored with a stock movement.
2. **Given** any status change, **Then** it is stored in the order history with time and admin.
3. **Given** a status change, **When** the admin presses «ابعت للعميل على واتساب», **Then** WhatsApp opens with that status's template filled in and the order records that the message was opened.
4. **Given** an order at «تم التسليم» or «ملغي», **Then** no further status change is offered.
5. **Given** a filter set, **When** exporting CSV, **Then** the file contains the filtered orders with money in pounds and Arabic text readable in spreadsheet software.
6. **Given** an order, **When** printing the internal invoice, **Then** a printable page shows store details, customer, items, VAT-inclusive totals, payments and remaining amount.

---

### User Story 5 - Funnel is measurable (Priority: P3)

The store owner can see how many shoppers start checkout and how many place an order.

**Why this priority**: Needed for KPIs but not for selling.

**Independent Test**: Start checkout and place an order → the analytics events `checkout_start` and `order_placed` are recorded once each, without personal data.

**Acceptance Scenarios**:

1. **Given** a shopper opens checkout with items, **Then** `checkout_start` is sent once per visit.
2. **Given** an order is placed, **Then** `order_placed` is sent once with order total and item count, but no name or phone.

---

### Edge Cases

- Product archived, hidden or deleted after it was added to the cart → shown as unavailable; order blocked until removed.
- Requested quantity above stock for an auto-stock product → capped to stock with a visible note.
- Price change between cart and checkout → shown before placing (US-5.1).
- Two admins confirm the same order at the same moment → one confirmation, one payment, one stock deduction.
- Confirming an order whose items no longer have enough stock → confirmation still allowed (the store decides), stock may go to zero but never below; the admin sees a warning.
- Cancelling an order that never deducted stock (never confirmed) → no stock movement.
- Rejected payment followed by a new proof → same confirm link still works.
- Confirm token guessed or forwarded → useless without an admin session; thank-you token guessed → nothing shown.
- Payment method disabled after an order was placed → existing orders keep working.
- Governorate not in any zone → «باقي مصر» fee.
- Empty cart at checkout → checkout shows an empty state with a link to the shop.
- Very long notes or addresses → limited length with a clear message.

## Requirements *(mandatory)*

### Functional Requirements

**Cart & checkout**

- **FR-001**: The cart drawer and cart page MUST share one cart state stored in the browser and re-priced by the server on checkout.
- **FR-002**: The cart MUST allow changing quantity and removing items and MUST show subtotal, discount, delivery fee (once a zone is known) and total.
- **FR-003**: Checkout MUST collect full name, mobile, governorate, city/markaz, address and optional notes, and MUST NOT include a delivery date picker; it shows «لو محتاج يوم معيّن كلّمنا على واتساب» with a WhatsApp link.
- **FR-004**: The delivery zone and fee MUST be derived from governorate + city; unknown places fall back to the «باقي مصر» zone.
- **FR-005**: Mobile numbers MUST accept Arabic-Indic digits, spaces and `+20`, and MUST be normalized to `01[0125]XXXXXXXX` before storing.
- **FR-006**: Only payment methods enabled by the admin MUST be offered; Fawry is off unless the owner enables it.
- **FR-007**: The order summary MUST stay visible; on mobile the total and place-order button MUST be sticky.
- **FR-008**: Prices, availability and totals MUST be re-checked by the server when placing the order; any change MUST be shown before the order is placed.
- **FR-009**: Placing the same order more than once (double tap, retry) MUST create only one order.
- **FR-010**: Each order MUST get a readable number `SR-<year>-<6 digits>`.
- **FR-011**: The thank-you page MUST show order number, items, total, payment method and next step only when opened with the order's public token; otherwise it shows nothing about the order.
- **FR-012**: COD orders show «هنكلمك نأكد الطلب»; transfer orders show account details and a WhatsApp proof button whose message contains order number, amount, method and the admin confirmation link.
- **FR-013**: COD orders above the admin threshold MUST show the deposit percentage and amount before placing, and MUST start at «بانتظار العربون».
- **FR-014**: A coupon field MAY be shown; until Slice 4 any code returns «الكوبونات هتتفعل قريب» and no discount.

**Payments & confirmation**

- **FR-015**: Initial status MUST be «جديد» for COD, «بانتظار الدفع» for transfers and «بانتظار العربون» for large COD.
- **FR-016**: The admin confirm page MUST require an admin session, return to the same page after login, and show order summary, expected amount and method with «تأكيد الدفع» and «رفض» (reject requires a reason).
- **FR-017**: Confirm tokens MUST be random, tied to one order, valid until the order is confirmed or cancelled, and useless without an admin session.
- **FR-018**: Confirming MUST record a confirmed payment (amount, method, time, admin), add it to the paid amount and move the order to «مؤكد».
- **FR-019**: Rejecting MUST record a rejected payment with its reason, move the order to «الدفع مرفوض» and offer a prefilled WhatsApp reply to the customer.
- **FR-020**: An order at «الدفع مرفوض» MUST still be confirmable from the same link and from the order page.
- **FR-021**: The same confirm and reject actions MUST exist on the admin order page.
- **FR-022**: Partial payments MUST add up; the order shows paid and remaining amounts.

**Status flow, stock & updates**

- **FR-023**: Allowed transitions: جديد/بانتظار الدفع/بانتظار العربون → مؤكد → خرج للتوصيل → تم التسليم; ملغي from any state before تم التسليم; الدفع مرفوض from بانتظار الدفع/بانتظار العربون and back to مؤكد. Other transitions MUST be refused.
- **FR-024**: Every status change MUST be stored in the order history with time and admin.
- **FR-025**: Moving to «مؤكد» MUST deduct stock for each item once, and cancelling a confirmed order MUST restore it; each change is written as a stock movement (product, quantity, reason, order, admin, time). Stock never goes below zero.
- **FR-026**: Each status change MUST offer «ابعت للعميل على واتساب» with that status's prefilled template (editable in settings), and opening it MUST be recorded on the order.

**Admin orders**

- **FR-027**: The admin orders list MUST filter by status, payment method and date range, search by order number, customer name or phone, and paginate.
- **FR-028**: The order detail MUST show customer, items, totals, deposit, payments, history, WhatsApp messages and internal notes, and allow editing notes.
- **FR-029**: Orders MUST be exportable as CSV (filtered), readable in Excel with Arabic text.
- **FR-030**: An internal invoice MUST be printable from the order page.
- **FR-031**: All admin order actions MUST check the orders permission and be written to the audit log.

**Analytics**

- **FR-032**: The storefront MUST send `checkout_start` and `order_placed` funnel events without personal data.

### Key Entities

- **Cart line**: product, quantity, the price the shopper last saw; lives in the browser until checkout.
- **Order**: number, type, status, customer (name, normalized mobile, governorate, city, zone, address, notes), items with locked prices and tax rate, subtotal, discount, delivery fee, total, payment method, deposit percentage and amount, paid amount, public token, confirm token, idempotency key.
- **Order item**: product reference, name, model code, quantity, unit price, tax rate at order time.
- **Order event**: status, note, admin, time — the history.
- **Payment**: order, method, amount, status (confirmed / rejected), reject reason, admin, time.
- **Stock movement**: product, quantity (±), reason (order confirmed / order cancelled / …), order, admin, time.
- **WhatsApp message**: order, recipient, template key, variables, channel (link), status (opened), time.
- **Settings**: payment methods with account details, zones, COD deposit rule, WhatsApp templates, store WhatsApp number.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guest can go from a product page to a placed order in under 90 seconds (scripted end-to-end timing).
- **SC-002**: 100% of retried or double-submitted checkouts produce exactly one order.
- **SC-003**: An admin can confirm a transfer from the WhatsApp link on a phone in under 20 seconds after login, in at most two taps.
- **SC-004**: Stock after any sequence of confirm/cancel actions always equals initial stock minus quantities of currently confirmed (not cancelled) orders.
- **SC-005**: Opening a thank-you or confirm link without the right token or session reveals no order data in 100% of attempts.
- **SC-006**: Checkout, cart and confirm pages work at 320 px width with no horizontal scroll and meet the accessibility rules of the constitution.
- **SC-007**: Every status change and payment decision is traceable to an admin and a time.

## Assumptions

- Real zone city lists, payment account details, store WhatsApp number and the Fawry method arrive before go-live; the seeded placeholders (`[رقم الواتساب]`, `[رقم فودافون كاش]`) are shown as-is until then (PRD §13).
- One admin role exists at launch; the orders permission (`orders.update`) covers all order actions.
- Customer accounts, order tracking pages, online card payments and the WhatsApp Cloud API are out of scope (Phase 2).
- Coupons are a placeholder until Slice 4; bridal reservations reuse this payment flow in Slice 3.
- VAT is included in prices (14%); the internal invoice is not an e-receipt (ETA e-receipts are Phase 2).
- Already built in this branch's history: server cart quote, idempotent order creation with numbering and tokens, and the token-protected thank-you lookup (old task T030).
- Stock is deducted on «مؤكد» even for COD orders confirmed by phone; the store can cancel to restore it.
