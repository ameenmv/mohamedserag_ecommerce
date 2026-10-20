# Feature Specification: Slice 7 — Dashboard, reports & settings

**Feature Branch**: `008-dashboard-reports`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Slice 7 — Dashboard, reports & settings (PRD US-12.2, US-12.9, US-12.10; umbrella T080–T083): admin dashboard «نظرة عامة» with today's action counters (new orders, payments waiting for confirmation, deposits waiting, bridal locks expiring within 7 days, pending reviews, notify-me lists ready to send, low-stock products) each linking to the filtered page, and revenue + orders charts for 7/30/90 days (revenue counts delivered orders only, deposits shown separately as money received); /admin/reports (reports.read) with revenue, orders and average order value by day/week/month split by category, brand, payment method, zone and order vs bridal, best sellers, coupon performance, flash sale performance, bridal funnel lists → reservations → delivered, repeat-customer rate by phone, each exportable to CSV (UTF-8 BOM, Excel-friendly); /admin/settings (settings.manage) to edit store info, WhatsApp numbers (main, traders), payment methods and account details, delivery zones with governorates/cities and fees, large-COD deposit threshold and %, low-stock default, search synonyms and WhatsApp message templates with named variables, with validation, audit and no developer needed. Independent test: after placing and delivering a seeded order the dashboard and revenue report include it and deposits appear separately."

Product source of truth: [docs/PRD.md](../../docs/PRD.md) (E12 US-12.2, US-12.9, US-12.10; §6 order and payment rules). Builds on [002-phase1-launch](../002-phase1-launch/spec.md) (admin shell, permissions, products, low-stock threshold), [003-slice2-checkout](../003-slice2-checkout/spec.md) (orders, payments, zones, COD deposit, WhatsApp templates), [004-bridal-builder](../004-bridal-builder/spec.md) (bridal lists, reservations, locks), [005-promotions-alerts](../005-promotions-alerts/spec.md) (coupons, flash sales, notify-me), [006-reviews](../006-reviews/spec.md) (pending reviews) and [007-content-seo](../007-content-seo/spec.md) (store details shown on the traders page and in structured data). The dashboard follows the approved admin prototype overview (`prototype/admin/index.html`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin sees what needs action today (Priority: P1)

The admin opens «نظرة عامة» in the morning and sees, in one glance, everything that needs a decision today: new orders, transfer payments waiting for confirmation, orders waiting for their deposit, bridal price locks that expire within 7 days, reviews waiting for moderation, notify-me lists whose product is back in stock, and products running low. Each counter opens the matching page already filtered. Below the counters, charts show revenue and order counts for the last 7, 30 or 90 days, with deposits received shown separately.

**Why this priority**: The PRD's admin goal is that nothing is missed; today the overview page shows only a welcome message and two cards, so the admin has to visit every page to find work.

**Independent Test**: Seed an order, a pending transfer payment, an order waiting for its deposit, a bridal reservation whose lock ends in 3 days, a pending review, a notify-me request on a product that is back in stock and a product below its low-stock threshold → open «نظرة عامة» → every counter shows the seeded count → each counter opens its page with the right filter → deliver the seeded order → the 7-day revenue chart includes its total on the delivery day; its deposit appears in the deposits series on the day it was received.

**Acceptance Scenarios**:

1. **Given** orders with status «جديد», **When** the admin opens the overview, **Then** the «طلبات جديدة» counter shows their number and links to the orders list filtered to that status.
2. **Given** orders waiting for the admin to confirm the customer's payment (status «بانتظار الدفع»), **Then** «مدفوعات مستنية تأكيد» counts them and links to the orders list filtered to that status.
3. **Given** orders waiting for their deposit, bridal locks ending within 7 days, pending reviews, notify-me lists whose product is orderable again, and visible products at or below their low-stock threshold, **Then** each has its own counter with the correct number and a link to the filtered page.
4. **Given** a counter whose count is zero, **Then** it is shown as calm/done («مفيش حاجة مستنياك») rather than hidden, so the admin trusts that it was checked.
5. **Given** the chart range 30 days, **When** the admin switches to 7 or 90 days, **Then** revenue, order counts and deposits redraw for that range with totals for the period and the same period before it.
6. **Given** an order delivered today, **Then** its total counts in today's revenue; an order that is confirmed but not delivered does not count as revenue; a cancelled order never counts.
7. **Given** a deposit received for an order or bridal reservation, **Then** it appears in the deposits series on the day it was confirmed and is not added to revenue until that order is delivered.
8. **Given** an admin without permission for orders, reviews or other areas, **Then** counters for areas they cannot open are not shown.

---

### User Story 2 - Admin reads sales reports and exports them (Priority: P1)

The admin opens «التقارير», picks a period (today, last 7/30/90 days, this month, last month or a custom range) and a grouping (day, week, month), and reads revenue, number of delivered orders and average order value over time, then the same totals split by category, brand, payment method, delivery zone and order vs. bridal reservation. Further tabs show best-selling products, coupon performance, flash sale performance, the bridal funnel (lists created → reservations with a paid deposit → delivered) and the repeat-customer rate by phone number. Every report can be exported to CSV that opens correctly in Excel with Arabic text.

**Why this priority**: The PRD asks for sales reports so the owner knows what works; there is no reporting today beyond the orders list.

**Independent Test**: Seed delivered orders in two categories, two payment methods and two zones, one bridal reservation delivered, a coupon used on one order, a flash-sale item sold, and two orders from the same phone → open «التقارير» for the last 7 days → totals, splits, best sellers, coupon and flash rows, bridal funnel and repeat rate match the seeded data → export each report → the CSV opens in Excel with correct Arabic columns and the same numbers.

**Acceptance Scenarios**:

1. **Given** a period and a grouping, **Then** the revenue report shows for each day/week/month: revenue (delivered orders), delivered order count and average order value, plus period totals; days with no sales show zero rather than disappearing.
2. **Given** the split view, **Then** revenue and delivered orders are shown per category, per brand, per payment method, per delivery zone and per type (order vs. bridal), each summing to the period total (a product's line belongs to the product's current category and brand; the order's delivery fee is reported in its own row, not spread across products).
3. **Given** best sellers, **Then** products are ranked by units sold in delivered orders in the period, with units, revenue and current stock.
4. **Given** coupon performance, **Then** each coupon shows uses, discount given and revenue of the delivered orders that used it.
5. **Given** flash sale performance, **Then** each flash sale in the period shows units sold at the sale price, revenue and discount given versus the regular price.
6. **Given** the bridal funnel, **Then** the period shows lists created, reservations with a paid deposit and reservations delivered, with conversion percentages between steps.
7. **Given** the repeat-customer report, **Then** the share of customers (identified by phone number) with two or more delivered orders, overall and within the period, is shown together with the counts; no phone numbers are listed in this summary.
8. **Given** any report, **When** the admin exports it, **Then** a CSV downloads with a UTF-8 byte-order mark, Arabic headers, money in Egyptian pounds with two decimals, dates in the store's time zone, and cells that cannot be interpreted as spreadsheet formulas.
9. **Given** an admin without the reports permission, **Then** the reports page and its exports are refused.

---

### User Story 3 - Admin manages store settings without a developer (Priority: P1)

The admin opens «الإعدادات» and edits, in clear sections: store info (name, phone, address, working hours), WhatsApp numbers (main and traders), payment methods (enable or disable each, display name, account details and instructions), delivery zones (name, the governorates and cities they cover, delivery fee and estimated time), the large-COD deposit rule (order total threshold and deposit %), the default low-stock threshold for new products, Arabic search synonyms, and WhatsApp message templates with named variables. Each section validates before saving, shows what changed, and saving is recorded in the audit log.

**Why this priority**: The PRD's settings goal is "never need a developer"; today these values are only changed in the database or seed data, and placeholders block LocalBusiness data and the traders WhatsApp button.

**Independent Test**: Change the store phone and the traders WhatsApp number → the storefront footer and `/traders` use the new numbers → disable a payment method → checkout no longer offers it → add a city to a zone and change its fee → checkout for that city uses the new fee → set the deposit threshold lower → a checkout above it asks for a deposit → edit the order-confirmed template using `{{customerName}}` and `{{orderNo}}` → the WhatsApp message on an order shows the filled text → each save appears in the audit log.

**Acceptance Scenarios**:

1. **Given** the store info section, **When** the admin saves a phone, address and hours, **Then** the storefront (footer, traders page, structured data) shows them; values still containing placeholders are flagged in the form.
2. **Given** WhatsApp numbers, **Then** they must be valid Egyptian mobile numbers (or international format) and the traders number falls back to the main number when empty.
3. **Given** payment methods, **Then** at least one method stays enabled; disabling one removes it from checkout for new orders while existing orders keep their method; account details shown to customers on the thank-you page update immediately.
4. **Given** delivery zones, **Then** every governorate belongs to at most one zone; a city may be listed under its governorate's zone; fees are whole pounds ≥ 0; deleting a zone is refused while it is the only zone covering a governorate that the store delivers to (the admin is told which); changes apply to new checkouts only.
5. **Given** the large-COD deposit rule, **Then** the threshold is a positive amount and the percentage is between 1 and 100; the change applies to new checkouts only.
6. **Given** the low-stock default, **Then** new products start with it; existing products keep their own threshold.
7. **Given** search synonyms, **Then** each entry maps a word to one or more equivalent words; saving them changes search results for new searches.
8. **Given** a WhatsApp template, **Then** only the variables allowed for that template are accepted (unknown `{{…}}` names are rejected with the list of allowed ones), a preview shows the template filled with sample values, and an empty template is refused.
9. **Given** an admin without the settings permission, **Then** the settings page and every settings change are refused; every saved change writes an audit entry with the section, the admin and the time.
10. **Given** two admins editing the same section, **When** the second saves after the first, **Then** the second is told the section changed and shown the latest values instead of silently overwriting.

---

### Edge Cases

- No orders at all (fresh store): counters show zero, charts show a flat zero line and a friendly empty state; reports show zero totals and exports contain headers only.
- Day boundaries: "today", charts and reports use the store's time zone (Cairo), not the server's; an order delivered at 23:30 Cairo time belongs to that day.
- Refunded or cancelled after delivery: an order moved from delivered to cancelled leaves revenue for its delivery day (reports reflect the current state, not a frozen snapshot).
- Partially paid orders: revenue uses the order total when delivered; deposits show in the deposits series by the date they were recorded; rejected payments never count.
- Large periods: a 365-day report grouped by day stays readable (scrollable chart, totals) and the export contains every day.
- Products archived after sale: they still appear in historic reports by the name and model code saved on the order line; their category and brand come from the archived product.
- Coupons or flash sales with zero uses in the period are listed with zeros when they were active in the period, and omitted otherwise.
- Settings with legacy or invalid stored values: the form loads with safe defaults, marks the invalid fields, and saving fixes them.
- Placeholder store values (`[…]`): allowed to save but flagged, so the owner can fill them later.
- Template variables: a template saved with a variable that is later removed from the allowed list keeps working with that variable left empty and is flagged in the form.
- Concurrent edits: see US3 scenario 10.

## Requirements *(mandatory)*

### Functional Requirements

**Dashboard**
- **FR-001**: The overview MUST show counters for: new orders, payments waiting for confirmation, orders waiting for their deposit, bridal locks ending within 7 days, pending reviews, notify-me lists ready to send (product orderable again with waiting requests), and visible products at or below their low-stock threshold.
- **FR-002**: Each counter MUST link to the matching admin page with the matching filter applied, and MUST be hidden when the admin lacks the permission for that page.
- **FR-003**: The overview MUST show revenue (delivered orders, by delivery day), delivered order count and deposits received (by confirmation day) for the last 7, 30 or 90 days, with totals for the period and a comparison with the previous period of the same length.
- **FR-004**: Counters and charts MUST reflect the current data when the page is opened or refreshed (no more than one minute stale).

**Reports**
- **FR-005**: The reports page MUST offer period presets (today, 7, 30, 90 days, this month, last month) and a custom range up to 366 days, and grouping by day, week (starting Saturday) or month.
- **FR-006**: The revenue report MUST show revenue, delivered order count and average order value per period bucket and in total, with empty buckets shown as zero.
- **FR-007**: Splits MUST show revenue and delivered orders by category, brand, payment method, delivery zone and type (order / bridal), with product lines attributed to the product's current category and brand (lines whose product no longer exists under «غير محدد») and delivery fees in a separate row so splits sum to the total.
- **FR-008**: Best sellers MUST rank products by units sold in delivered orders in the period with units, revenue and current stock.
- **FR-009**: Coupon performance MUST show uses, total discount and revenue of delivered orders per coupon; flash sale performance MUST show units sold at the sale price, revenue and discount versus regular price per flash sale.
- **FR-010**: The bridal funnel MUST show lists created, reservations with a paid deposit and reservations delivered in the period with step conversion percentages.
- **FR-011**: The repeat-customer report MUST show the share and count of phone numbers with two or more delivered orders, without listing phone numbers.
- **FR-012**: Every report MUST be exportable to CSV with a UTF-8 byte-order mark, Arabic headers, money in pounds with two decimals, Cairo-time dates, and formula-injection-safe cells.
- **FR-013**: Reports and exports MUST require the reports permission and MUST NOT expose customer phone numbers or addresses.

**Settings**
- **FR-014**: The settings page MUST let the admin edit store info, WhatsApp numbers (main, traders), payment methods and their customer-facing details, delivery zones (governorates, cities, fee, estimated time), the large-COD deposit rule, the default low-stock threshold, search synonyms and WhatsApp message templates.
- **FR-015**: Every section MUST validate on the server with clear Egyptian Arabic messages per field (phone formats, at least one payment method, each governorate in at most one zone, fees ≥ 0, deposit % 1–100, templates using only their allowed variables and not empty).
- **FR-016**: Saved settings MUST take effect for new storefront visits and new checkouts within one minute and MUST NOT change existing orders.
- **FR-017**: Every settings save MUST require the settings permission, CSRF protection and write an audit entry (section, admin, time, before/after with phone numbers masked).
- **FR-018**: Saving a section that changed since it was loaded MUST be refused with a message and the latest values, unless the admin chooses to load them and re-apply.
- **FR-019**: Template editing MUST show the allowed variables for each template and a live preview filled with sample values.

**General**
- **FR-020**: All interface text MUST exist in Arabic and English; the pages MUST work at 375 px without horizontal scrolling and be fully usable with the keyboard; charts MUST have a text/table alternative.
- **FR-021**: Money MUST be calculated in piastres and shown in pounds; percentages MUST be rounded to one decimal.

### Key Entities *(include if feature involves data)*

- **Dashboard summary**: the set of action counters plus the revenue/orders/deposits series for a chosen range; computed on request from orders, payments, bridal reservations, reviews, notify-me requests and products.
- **Report**: a computed table for a period and grouping (revenue over time, splits, best sellers, coupons, flash sales, bridal funnel, repeat customers), exportable as CSV.
- **Setting section**: a named group of store settings (store info, WhatsApp, payments, zones, COD deposit, low-stock default, search synonyms, templates) stored as one validated value with a last-updated time used to detect conflicting edits.
- **Audit entry**: existing audit log row recording who changed which setting section and when.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a seeded order is delivered, the dashboard and the revenue report include it on the delivery day, and its deposit appears separately on the day it was received, within one minute.
- **SC-002**: Every dashboard counter matches the number of items on the page it links to (verified for all seven counters).
- **SC-003**: Report splits always sum to the report total (difference 0 piastres) for any period tested.
- **SC-004**: Every exported CSV opens in Excel with readable Arabic and the same totals as the screen.
- **SC-005**: The store owner can change any listed setting (phone, WhatsApp, payment method, zone fee, deposit rule, low-stock default, synonyms, templates) without developer help, and the change is visible on the storefront or checkout within one minute.
- **SC-006**: The overview and a 90-day report each load in under 2 seconds with one year of orders at the expected volume (up to 20,000 orders).
- **SC-007**: 100% of settings changes appear in the audit log; no report or export reveals customer phone numbers or addresses.

## Assumptions

- One admin at launch with the default role (all permissions); permission checks still apply per page and endpoint so roles can be enabled later.
- "Revenue" means the order total (items after discounts plus delivery fee) of orders whose status is delivered, dated by the day they became delivered; reports reflect the current status of each order.
- "Deposits received" means confirmed payments on orders that require a deposit (large-COD deposit or bridal reservation), dated by when the payment was recorded; other confirmed payments are visible in the orders area, not in this series.
- "Payments waiting for confirmation" means orders in «بانتظار الدفع» (transfer/wallet orders whose payment the admin has not confirmed yet); payments are only recorded once the admin confirms or rejects them.
- Notify-me lists are "ready to send" when the product is orderable again (in stock, visible, not archived) and has waiting requests.
- The store's time zone is Africa/Cairo; weeks start on Saturday.
- Bridal settings (tiers, deposit %, lock days) stay on the existing bridal page; quiz rules stay in «محرر الموقع». The settings page links to both rather than duplicating them.
- Settings values are still single-store; multi-branch settings are out of scope.
- Charts are simple line/bar charts suited to the admin theme; no external analytics service is used for these reports (Umami stays for funnel events).
- Reports are computed on demand; no nightly aggregation is needed at launch volumes.
