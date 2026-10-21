# Feature Specification: Slice 3 — «جهّز بيتك» Bridal Builder

**Feature Branch**: `004-bridal-builder`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Phase 3 — the «جهّز بيتك» bridal builder (PRD E4: US-4.1 to US-4.6, plus US-3.3 bridal stock rules, US-12.3 bridal reservations in admin orders, US-12.5 bridal setup). The bride starts from a tier (أساسية / ذهبية / القصر), edits it room by room, shares a read-only link with her family on WhatsApp, and reserves with a deposit (default 10%) that locks regular prices and the zone delivery fee for 30 days. Deposits can arrive in several transfers; the lock starts when the deposit is fully paid. Stock is reserved only when the store agrees the delivery date. The admin can extend or re-price expired locks and edits the tiers and bridal settings."

Product source of truth: [docs/PRD.md](../../docs/PRD.md) (E4, US-3.3, US-6.3, US-7.1, US-12.3, US-12.5). Builds on [003-slice2-checkout](../003-slice2-checkout/spec.md): bridal deposits reuse its payment proof, one-tap confirm, payments and status history.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bride builds her list from a tier (Priority: P1)

A bride opens «جهّز بيتك», sees the three tiers side by side (أساسية، ذهبية، القصر) with total, room count, item count and highlights, and starts from one of them (or from an empty list). She lands on her own list, grouped by room (المطبخ، الغسيل، الصالة، أوض النوم، أجهزة صغيرة، أدوات المطبخ). For each item she can swap it for another product in the same category (seeing the price difference), remove it or change the quantity, and she can add any product from the catalog to any room. The total, each room's subtotal and the difference from the tier's starting total update as she edits. The list saves itself, and she can come back to it later with its private edit link (no account).

**Why this priority**: This is the signature feature. Without a list there is nothing to share or reserve.

**Independent Test**: Open /bridal → start from «ذهبية» → swap the fridge for a cheaper one, remove the microwave, set the AC quantity to 2 → the room subtotals, total and difference vs. the tier update → reload the edit link → the same list comes back.

**Acceptance Scenarios**:

1. **Given** three tiers set up in the admin, **When** the bride opens /bridal, **Then** each tier shows its name, total at current prices, room count, item count and highlights, and a start button.
2. **Given** she starts from a tier, **When** the list opens, **Then** it is a copy of that tier's rooms and items, and its address is a private edit link.
3. **Given** an item in her list, **When** she opens «بدّلي», **Then** she sees visible products from the same category with their price and the difference from the current item, and choosing one replaces it in the same room with the same quantity.
4. **Given** any edit (swap, remove, quantity, add), **When** it is made, **Then** the room subtotal, total and «الفرق عن الباقة» update immediately and the list is saved without pressing a button.
5. **Given** she closes the page, **When** she opens the edit link again (or returns to /bridal on the same device), **Then** her latest saved list is shown.
6. **Given** an item in her list is out of stock (or hidden from the store), **When** the list is shown, **Then** that item is marked «نفذ — اختاري بديل» and the reserve button stays disabled until she swaps or removes it.
7. **Given** she starts with an empty list, **When** she adds products from the catalog, **Then** they appear in the room she chose.

---

### User Story 2 - Bride shares the list with her family (Priority: P1)

The bride taps «شاركيها على واتساب». WhatsApp opens with a short summary (tier, item count, total) and a read-only link. Her family opens the link and sees the same rooms, items and totals, with a «كلّموا المعرض» WhatsApp button, but cannot change anything.

**Why this priority**: The family usually decides and pays; sharing is how a list becomes a reservation.

**Independent Test**: From an edit page tap share → the WhatsApp text contains the total and a link → open the link in another browser → the list shows in read-only mode with no edit controls, and the page never reveals the edit link.

**Acceptance Scenarios**:

1. **Given** an edit page, **When** she taps share, **Then** WhatsApp opens with the item count, total and the read-only link.
2. **Given** the read-only link, **When** anyone opens it, **Then** they see items, room subtotals and total, a «كلّموا المعرض» button and no swap, remove, quantity, add or reserve controls.
3. **Given** a read-only link, **When** its data is requested, **Then** the edit link is never part of the response.
4. **Given** a random or wrong link, **When** it is opened, **Then** a «القايمة دي مش موجودة» page is shown with a way to start a new list.

---

### User Story 3 - Bride reserves with a deposit and the price lock starts (Priority: P1)

The bride taps «احجزي بعربون». She sees the locked total (items at regular prices plus the zone delivery fee), the deposit (deposit % × locked total, default 10%) and the lock period (default 30 days). She fills name, phone, governorate, city, address, an optional preferred delivery date and notes, picks a transfer method and reserves. The reservation starts at «بانتظار العربون» and her list is frozen. The thank-you page shows the transfer details, «ابعتي إثبات التحويل على واتساب» (with the reservation number, deposit and the admin confirm link), «هنكلمك نتفق على ميعاد التوصيل والتركيب» and «التقسيط متاح في المعرض» with a WhatsApp button. The admin confirms the deposit from the link; the deposit may arrive in several transfers, and once the paid amount reaches the deposit the prices are locked until a stated end date.

**Why this priority**: Reservations with a deposit are the business goal of the feature (≥ 30 per month).

**Independent Test**: Reserve a list with InstaPay → reservation at «بانتظار العربون» and the list can no longer be edited → admin confirms half of the deposit → still «بانتظار العربون» with paid and remaining shown → admin confirms the rest → «محجوز (السعر مثبت)» with an end date 30 days ahead → a later catalog price change does not change the reservation.

**Acceptance Scenarios**:

1. **Given** a list with all items available, **When** she opens reserve, **Then** the locked total, deposit and lock days come from current regular prices, the zone fee and the admin settings, and coupons are not offered.
2. **Given** a product currently on a flash sale, **When** it is reserved, **Then** its regular price (not the sale price) is used.
3. **Given** the form is submitted twice or retried, **When** the requests arrive, **Then** exactly one reservation is created.
4. **Given** a price changed since the list was shown, **When** she reserves, **Then** the new total is shown and nothing is reserved until she sees it.
5. **Given** a reservation was created, **When** the edit link is opened, **Then** the list is shown read-only with the reservation status and no edit controls.
6. **Given** a reservation at «بانتظار العربون», **When** the admin confirms a payment smaller than the deposit, **Then** the paid amount increases and the status stays «بانتظار العربون».
7. **Given** the paid amount reaches the deposit, **When** the last payment is confirmed, **Then** the reservation becomes «محجوز (السعر مثبت)», the lock end date is today + lock days, and the WhatsApp confirmation offered to the admin states that date.
8. **Given** a locked reservation, **When** catalog prices change, **Then** the reservation's item prices and total do not change.
9. **Given** the admin rejects a proof, **Then** the reservation becomes «الدفع مرفوض» and the same link can confirm a new proof later.

---

### User Story 4 - Admin runs bridal reservations (Priority: P2)

The admin sees bridal reservations in the orders list (filter by type), with their bridal status and lock days left. On a reservation they record the agreed delivery date (which reserves stock), extend an expired lock to a new end date, or re-price it (items take current regular prices; the difference is shown and a prefilled WhatsApp message explains it). The dashboard lists locks ending within 7 days.

**Why this priority**: Without it, locks expire unnoticed and stock is not held for brides.

**Independent Test**: Filter orders by «جهاز عروسة» → open a locked reservation → record a delivery date → stock decreases with a «bridal_delivery_agreed» movement per item → cancel → stock is restored → on another reservation whose lock ended, re-price → new totals and the WhatsApp message show the difference.

**Acceptance Scenarios**:

1. **Given** reservations exist, **When** the admin filters by type «جهاز عروسة», **Then** only reservations show, each with its bridal status and days left on the lock.
2. **Given** a locked reservation, **When** the admin records the agreed delivery date, **Then** stock is deducted once per item with a «bridal_delivery_agreed» movement and the status becomes «اتفقنا على التوصيل».
3. **Given** a reservation whose stock was deducted, **When** it is cancelled, **Then** exactly that stock is restored; **given** stock was never deducted, cancelling changes no stock.
4. **Given** a lock end date in the past, **When** the reservation is shown, **Then** it shows «انتهى تثبيت السعر» with «مدّ التثبيت» and «حدّث الأسعار».
5. **Given** an expired lock, **When** the admin extends it, **Then** the new end date (later than today) is stored and written to the history.
6. **Given** an expired lock, **When** the admin re-prices, **Then** items take current regular prices, totals and the deposit amount are recomputed from the stored deposit %, the old and new totals and the difference are shown, a prefilled WhatsApp message explains it, a new lock starts from today for the lock days, and the change is written to the history.
7. **Given** locks ending within 7 days, **When** the admin opens the dashboard, **Then** they are listed with customer name, reservation number and days left, linking to the reservation.

---

### User Story 5 - Admin sets up tiers and bridal rules (Priority: P2)

The admin edits the three tiers: name, highlights and, per room, the default products and quantities. Out-of-stock or hidden products in a tier are flagged. The admin also edits the deposit percentage (default 10) and the lock days (default 30).

**Why this priority**: The builder must match what the showroom offers; seeded tiers are only a start.

**Independent Test**: Open /admin/bridal → add a product to «أساسية» المطبخ and change a quantity → save → /bridal shows the new total → set deposit to 15% → a new reservation shows a 15% deposit.

**Acceptance Scenarios**:

1. **Given** the tiers page, **When** the admin adds, removes or changes the quantity of a product in a room and saves, **Then** the storefront tier shows the change; lists already created are not changed.
2. **Given** a tier item is out of stock or hidden, **When** the tier editor is shown, **Then** that item is flagged.
3. **Given** the admin sets deposit % or lock days, **When** saved, **Then** new reservations use the new values and existing reservations keep theirs.
4. **Given** an admin without the bridal permission, **When** they call the tiers or settings endpoints, **Then** they are refused.

---

### User Story 6 - Add to the bridal list from anywhere (Priority: P3)

On a product page the shopper taps «أضيفي لجهاز العروسة». If she already has a list on this device the product is added to the matching room; otherwise a new empty list is started with it. The funnel (list created, shared, reserved) is measurable.

**Why this priority**: Convenience and measurement; the builder works without it.

**Independent Test**: With a list on this device, open a product page → tap add to bridal list → the list shows the product in the right room; analytics receive `bridal_list_created`, `bridal_list_shared` and `bridal_reserved` without personal data.

**Acceptance Scenarios**:

1. **Given** a draft list on this device, **When** she taps «أضيفي لجهاز العروسة», **Then** the product is added to the room matching its category (or «أجهزة صغيرة» when no room matches) and a confirmation with a link to the list is shown.
2. **Given** no list on this device (or the stored list is already reserved), **When** she taps it, **Then** a new empty list is created with that product.
3. **Given** the funnel actions, **When** they happen, **Then** `bridal_list_created`, `bridal_list_shared` and `bridal_reserved` events are sent without names, phones or tokens.

---

### Edge Cases

- A tier references a product that was later archived: the tier and copied lists show it as «نفذ — اختاري بديل»; the storefront tier total excludes it and the admin editor flags it.
- A list has no items: reserve is disabled with «القايمة فاضية».
- Quantity limits: 1–10 per item; a room holds at most 40 items and a list at most 120 items.
- The same product added twice to one room merges into one line with the summed quantity (capped at 10).
- Two tabs edit the same list: the last save wins; each save sends the whole list.
- An on-request product (made to order) can be reserved; its lead time text is shown.
- A share link is opened after the reservation: it shows the reservation's locked items and totals read-only, without customer details.
- A reservation is cancelled: the list stays frozen and shows «الحجز اتلغى»; the bride can start a new list.
- Stock is short when the delivery date is agreed: the date is still recorded and the admin sees which items were short (as with retail confirm).
- Lock end dates and «days left» are computed in Cairo time.
- Re-pricing to a lower total: the difference is shown as a saving; a paid amount above the new deposit is kept, never refunded automatically.

## Requirements *(mandatory)*

### Functional Requirements

**Tiers & list**

- **FR-001**: /bridal MUST show the active tiers side by side (stacked on mobile) with name, total at current regular prices of available items, room count, item count and highlights, plus a «ابدئي من الصفر» option.
- **FR-002**: Rooms MUST be a fixed set: المطبخ، الغسيل، الصالة، أوض النوم (تكييفات)، أجهزة صغيرة، أدوات المطبخ, shown in that order, with labels in both languages.
- **FR-003**: Starting from a tier MUST create a new list that copies the tier's rooms and items; later tier changes MUST NOT change existing lists.
- **FR-004**: Each list MUST have two random, unguessable tokens: an edit token and a share token. One address `/bridal/:token` serves both; the server answers with `mode: edit | view` and MUST NOT return the edit token to a share-token request.
- **FR-005**: In edit mode the bride MUST be able to swap an item (alternatives: visible products in the same category, with price and price difference), remove it, change its quantity (1–10) and add any visible product to any room.
- **FR-006**: The page MUST show each room's subtotal, the list total and the difference from the starting tier's current total, updating on every edit.
- **FR-007**: Edits MUST be saved automatically (each save sends the whole list) and the edit link MUST return the latest saved list. The device MUST remember the last edit link so /bridal offers «كمّلي قايمتك».
- **FR-008**: Items that are out of stock (stock-tracked with no stock) or no longer visible MUST be marked «نفذ — اختاري بديل», and reserve MUST stay disabled while any exist or the list is empty.
- **FR-009**: List creation and saving MUST be rate-limited and validated (fixed room keys, known products, quantity and size limits).

**Sharing**

- **FR-010**: «شاركيها على واتساب» MUST open WhatsApp with item count, total and the read-only link.
- **FR-011**: View mode MUST show items, room subtotals and total with a «كلّموا المعرض» WhatsApp button and no edit or reserve controls.

**Reservation & deposit**

- **FR-012**: The locked total MUST be the sum of items at their regular prices plus the zone delivery fee from governorate + city; flash prices and coupons MUST NOT apply.
- **FR-013**: Reserve MUST show the deposit (deposit % × locked total, rounded to whole piastres) and the lock days from the bridal settings before submitting.
- **FR-014**: The reserve form MUST collect name, mobile (normalized as in checkout), governorate, city, address, optional preferred delivery date (not in the past) and optional notes, and MUST offer only the enabled transfer methods.
- **FR-015**: Reserving MUST be idempotent, MUST re-check prices and availability on the server and show any change before reserving, and MUST create a reservation (an order of type bridal) at «بانتظار العربون» with items at locked prices, the deposit %, deposit amount and lock days stored on it.
- **FR-016**: After reserving, the list MUST be frozen for the bride; edit and share links show it read-only with the reservation status.
- **FR-017**: The thank-you page MUST show the reservation number, items, locked total, deposit, transfer details, a «ابعتي إثبات التحويل على واتساب» button (reservation number, deposit amount, method, admin confirm link), «هنكلمك نتفق على ميعاد التوصيل والتركيب» and «التقسيط متاح في المعرض» with a WhatsApp button; without the public token it shows nothing.
- **FR-018**: Confirmed payments MUST add up. A reservation (and a large-COD order) at «بانتظار العربون» MUST move on only when the paid amount reaches the deposit; until then it stays at «بانتظار العربون» with paid and remaining shown.
- **FR-019**: When the deposit is fully paid the reservation MUST become «محجوز (السعر مثبت)» with lock end = today + stored lock days (end of day, Cairo time), and the offered WhatsApp confirmation MUST state that date.
- **FR-020**: Confirming a bridal deposit MUST NOT deduct stock.
- **FR-021**: Reservation item prices MUST NOT change during the lock, whatever happens to catalog prices.

**Admin reservations**

- **FR-022**: The admin orders list MUST filter by type (order / bridal) and show bridal status and lock days left for reservations.
- **FR-023**: Bridal statuses MUST be: بانتظار العربون → محجوز (السعر مثبت) → اتفقنا على التوصيل → تم التسليم, plus ملغي and الدفع مرفوض; «انتهى تثبيت السعر» is shown when a lock's end date has passed and no delivery date was agreed.
- **FR-024**: Recording the agreed delivery date MUST be allowed only on a locked (or lock-expired) reservation, MUST deduct stock once per item with reason «bridal_delivery_agreed», and MUST report shortages.
- **FR-025**: Cancelling a reservation MUST restore exactly the stock it deducted (none if none) and mark the list cancelled.
- **FR-026**: «مدّ التثبيت» MUST set a new lock end date later than today; «حدّث الأسعار» MUST set items to current regular prices, recompute subtotal, total and deposit amount (stored deposit %), start a new lock from today, show old vs. new totals and offer a prefilled WhatsApp message explaining the difference. Both MUST be allowed only on locked or lock-expired reservations before delivery is agreed.
- **FR-027**: The admin dashboard MUST list locks ending within 7 days (and already expired ones without an agreed date) with links.
- **FR-028**: Every bridal admin action MUST be permission-checked, CSRF-protected, written to the order history and to the audit log.

**Admin setup**

- **FR-029**: The admin MUST be able to edit each tier's name, highlights (up to 4 short lines) and per-room products and quantities, with out-of-stock or hidden products flagged.
- **FR-030**: The admin MUST be able to edit deposit % (1–50) and lock days (7–180); new reservations use the values at the time they are created.
- **FR-031**: Tier and bridal-settings endpoints MUST require the `bridal.manage` permission.

**Product page & analytics**

- **FR-032**: Product pages MUST offer «أضيفي لجهاز العروسة», adding the product to the device's draft list (room by category, fallback «أجهزة صغيرة») or creating a new list with it.
- **FR-033**: The storefront MUST send `bridal_list_created`, `bridal_list_shared` and `bridal_reserved` events without personal data or tokens.

### Key Entities

- **Bridal tier**: name, slug, sort, highlights, rooms → items (product, quantity). Edited in the admin.
- **Bridal list**: edit token, share token, starting tier, rooms → items (product, quantity), status (draft / awaiting deposit / locked / delivery agreed / delivered / cancelled), customer name and phone once reserved, link to its reservation.
- **Bridal reservation**: an order of type «bridal» — items with locked prices, delivery fee, total, deposit % and amount, paid amount, lock days, lock end date, preferred and agreed delivery dates, bridal status, payments and history (reuses Slice 2).
- **Bridal settings**: deposit %, lock days.
- **Stock movement**: adds the reason «bridal_delivery_agreed».

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A bride can go from /bridal to a shared list in under 3 minutes and to a placed reservation in under 5 minutes (scripted end-to-end timing).
- **SC-002**: 100% of share-link responses omit the edit token, and 100% of edit attempts with a share token or on a reserved list are refused.
- **SC-003**: 100% of reservations keep their item prices and total during the lock regardless of catalog price changes.
- **SC-004**: Stock after any sequence of agree-delivery and cancel actions equals initial stock minus quantities of reservations with an agreed date that are not cancelled.
- **SC-005**: A reservation's lock starts only when confirmed payments reach the deposit, in 100% of partial-payment sequences.
- **SC-006**: Every list edit is visible after a reload within 2 seconds of the last change.
- **SC-007**: /bridal and the list page work at 320 px with no horizontal scroll and meet the constitution's accessibility rules.

## Assumptions

- Reservations reuse Slice 2's order record, payments, one-tap confirm page, history, audit and WhatsApp log; no separate reservation table.
- «انتهى تثبيت السعر» is derived from the lock end date at read time; no background job.
- Re-pricing starts a new lock from today for the reservation's stored lock days.
- Room for «add from product page» is chosen by a fixed category → room map in shared code; unmapped categories go to «أجهزة صغيرة».
- Tier names, highlights and product names are Arabic content and are not translated; UI labels are in both languages.
- Installments are arranged in the showroom only; the page shows a note and a WhatsApp button, with no threshold rule at launch.
- The bridal deposit can be paid only by transfer methods enabled in settings (InstaPay, Vodafone Cash, Fawry if enabled); the rest is paid on delivery.
- The large-COD deposit from Slice 2 follows the same «move on when the deposit is fully paid» rule (FR-018).
- Customer accounts that own lists are Phase 2 (E14); a list is reachable only through its links and the device that created it.
