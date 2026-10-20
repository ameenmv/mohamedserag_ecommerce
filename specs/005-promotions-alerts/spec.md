# Feature Specification: Slice 4 — Promotions & Stock Alerts

**Feature Branch**: `005-promotions-alerts`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Slice 4 — Promotions & stock alerts (PRD US-8.2 flash sales, US-8.3 + US-5.3 coupons, US-3.2 notify-me, US-12.7 and US-12.8 admin). Time-limited flash sales with countdown and automatic revert, overlap blocked; coupons (% or fixed, minimum order, dates, total and per-phone limits, category/brand scope) applied only to eligible items, one per order, redemptions released on cancel or payment rejection; «بلّغني أول ما يوصل» on out-of-stock products with an admin waiting list and prefilled WhatsApp. Old price and % off (US-8.1) already exist."

Product source of truth: [docs/PRD.md](../../docs/PRD.md) (E3 US-3.2, E5 US-5.3, E8, E12 US-12.7/12.8). Builds on [003-slice2-checkout](../003-slice2-checkout/spec.md) (cart quote, orders, status flow) and [004-bridal-builder](../004-bridal-builder/spec.md) (bridal locks use regular prices only).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shopper buys at a flash price before the timer ends (Priority: P1)

The admin schedules a flash sale with a few products, a sale price for each, a start and an end time. While it runs, those products show the sale price, the regular price struck through, a «عرض لفترة محدودة» badge and a countdown on cards, the product page and the /offers page. The cart and checkout charge the sale price. When the sale ends the regular price comes back by itself.

**Why this priority**: Flash sales are the main campaign tool and drive urgency; the /offers link in the header is currently broken.

**Independent Test**: Create a sale that started a minute ago and ends in an hour → the product card, product page and /offers show the sale price and a countdown → add to cart and place an order → the order line uses the sale price → move the end time into the past → the card and a new cart quote show the regular price again.

**Acceptance Scenarios**:

1. **Given** an active flash sale on a product, **When** a shopper views its card, product page or /offers, **Then** they see the sale price, the regular price struck through, the % saving and a live countdown to the end.
2. **Given** an active sale, **When** the cart is quoted or an order is placed, **Then** the line unit price is the sale price.
3. **Given** a sale whose end time has passed, **When** anything is shown or quoted, **Then** the regular price is used, with no job needed.
4. **Given** a scheduled sale that has not started, **When** shoppers view the product, **Then** the regular price is shown.
5. **Given** a product already in a sale for a period, **When** the admin adds it to another sale whose period overlaps, **Then** saving is refused with the product named.
6. **Given** a shopper added a product at the sale price and the sale ended, **When** they reach checkout, **Then** the price change is shown before ordering (existing price-change rule).
7. **Given** a bridal reservation, **When** a product in it is on a flash sale, **Then** the reservation still uses the regular price.

---

### User Story 2 - Shopper applies a coupon at checkout (Priority: P1)

The shopper types a code in checkout. A valid code shows the saving immediately; an invalid one shows why («الكود ده مش موجود», «الكود انتهى», «الحد الأدنى للطلب 5,000 ج.م», «استخدمت الكود ده قبل كده», «الكود ده مش على المنتجات اللي في السلة»). One coupon per order, and it only applies to eligible items: not on a flash sale, without an old-price discount, and inside the coupon's category/brand scope.

**Why this priority**: Coupons are the second campaign tool and the checkout field already exists as a placeholder.

**Independent Test**: Create «SERAG10» (10%, minimum 5,000 ج.م, fridges only) → a cart with a 6,000 ج.م fridge and a discounted washer → the discount is 600 ج.م on the fridge only → place the order → the redemption is recorded → cancel the order → the redemption is released.

**Acceptance Scenarios**:

1. **Given** a valid percent coupon, **When** applied, **Then** the discount is the % of eligible items' subtotal (rounded to whole piastres) and the total updates.
2. **Given** a fixed coupon larger than the eligible subtotal, **When** applied, **Then** the discount is capped at the eligible subtotal.
3. **Given** a minimum order, **When** eligible items total less, **Then** the coupon is refused with the minimum in the message.
4. **Given** a coupon outside its dates or inactive, **When** applied, **Then** it is refused with «الكود انتهى» (or «الكود لسه مبدأش» before the start).
5. **Given** a total usage limit reached, **When** applied, **Then** it is refused; **Given** two shoppers place orders with the last use at the same time, **Then** only one order gets it.
6. **Given** a per-phone limit, **When** the same phone uses it again, **Then** it is refused at order placement (the phone is known only then).
7. **Given** a cancelled or payment-rejected order, **When** its status changes, **Then** its redemption is released; **Given** a rejected payment is later confirmed, **Then** the redemption becomes active again.
8. **Given** a coupon and a bridal reservation, **Then** coupons are not offered on reservations.
9. **Given** the order is placed, **When** the coupon changed meanwhile so the discount differs, **Then** the order is not placed and the new total is shown.

---

### User Story 3 - Shopper asks to be told when a product is back (Priority: P2)

On an out-of-stock product the shopper taps «بلّغني أول ما يوصل», enters name and mobile, and sees a confirmation. The admin sees waiting lists per product; when the product is back in stock each entry has «ابعت على واتساب» with a prefilled message and link, and opening it marks the entry sent.

**Why this priority**: Recovers lost demand, but stores can launch without it.

**Independent Test**: An out-of-stock product → submit name + «٠١٠١٢٣٤٥٦٧٨» → confirmation; submit again → still one request with a newer date → admin restocks → the list shows the entry with «ابعت على واتساب» → opening it marks it sent.

**Acceptance Scenarios**:

1. **Given** an out-of-stock (or «out» mode) product, **When** the page shows, **Then** the add-to-cart area is replaced by «بلّغني أول ما يوصل»; in-stock and on-request products don't show it.
2. **Given** the form, **When** submitted with a valid name and Egyptian mobile (Arabic digits allowed), **Then** one waiting request per product + normalized phone is stored; a repeat updates its date and resets it to waiting.
3. **Given** spam, **When** the form is submitted too often from one address or with the honeypot filled, **Then** it is throttled or silently ignored.
4. **Given** waiting lists, **When** the admin opens «بلّغني», **Then** products are listed with waiting counts and current stock, products back in stock first.
5. **Given** a product back in stock, **When** the admin taps «ابعت على واتساب» on an entry, **Then** WhatsApp opens with the `notify_back_in_stock` template (name, product, link) and the entry is marked sent with the time; the opening is logged.
6. **Given** a product still out of stock, **Then** the send button is disabled with «المنتج لسه مش متوفر».

---

### User Story 4 - Admin manages flash sales and coupons (Priority: P1)

The admin creates, edits and deletes flash sales (name, start, end, products with sale prices) and coupons (code, type, value, minimum, dates, limits, scope, active). Lists show status (scheduled / running / ended), and coupons show uses and total discount given.

**Why this priority**: Without admin screens the promotions can't be run.

**Independent Test**: Create a flash sale and a coupon from the admin, see them on the storefront and checkout, edit, then delete/deactivate.

**Acceptance Scenarios**:

1. **Given** the flash sale form, **When** a sale price is not below the product's regular price, or end ≤ start, **Then** saving is refused with the reason.
2. **Given** a running sale, **When** the admin ends it now, **Then** prices revert immediately.
3. **Given** the coupon form, **When** a code already exists (case-insensitive) or a percent is outside 1–90, **Then** saving is refused.
4. **Given** coupons with redemptions, **When** the admin deletes one, **Then** it is deactivated instead (history kept).
5. **Given** the coupon list, **Then** each row shows status, active uses / limit and total discount given.
6. **Given** an admin without `promotions.manage` (or `notify.manage` for notify-me), **When** they call those endpoints, **Then** they are refused.

---

### Edge Cases

- Codes are trimmed and matched case-insensitively; stored upper-case.
- A coupon with category and brand scopes: an item is eligible if it matches any listed category **and** any listed brand (an empty list means "any").
- Fixed coupon value and minimum order are in piastres; percent 1–90.
- Flash sale price must be > 0 and < regular price; a product can't appear twice in one sale.
- Times are entered and shown in Cairo time; the countdown hides at zero and the page refreshes the price on its next quote.
- Changing a product's regular price during a sale keeps the sale price.
- An order placed during a sale keeps its sale price after the sale ends (prices are locked on order lines already).
- Coupon redemptions count `active` ones only for limits.
- Notify-me on an archived or hidden product: refused (404).
- The admin notify-me list doesn't show phone numbers in full on the list view, only in the entry being sent.

## Requirements *(mandatory)*

### Functional Requirements

**Flash sales**

- **FR-001**: A flash sale MUST have a name, start, end (after start) and ≥ 1 product with a sale price above 0 and below the product's regular price.
- **FR-002**: A product MUST NOT be in two sales whose periods overlap; saving MUST be refused naming the product.
- **FR-003**: The effective price of a product MUST be its active sale price when now ∈ [start, end), otherwise its regular price, computed at read time everywhere (cards, product page, search, cart quote, order creation).
- **FR-004**: Cards and product pages MUST show the sale price, the regular price struck through, the % saving, a «عرض لفترة محدودة» badge and a countdown to the end while a sale is active.
- **FR-005**: `/offers` MUST list products in active flash sales (with countdowns) and then products with an old-price discount.
- **FR-006**: Bridal reservations MUST keep using regular prices.

**Coupons**

- **FR-007**: A coupon MUST have code, type (percent 1–90 / fixed piastres > 0), value, minimum order (eligible subtotal), optional start/end, optional total and per-phone limits, optional category and brand scopes, active flag.
- **FR-008**: Eligible items are items not on an active flash sale, without an old-price discount (oldPrice > price), and inside the coupon scope. Minimum order and percent discounts use eligible items only; the discount never exceeds the eligible subtotal.
- **FR-009**: The cart quote MUST evaluate a code and return either the applied discount or the refusal reason; one coupon per order.
- **FR-010**: Order placement MUST re-evaluate the coupon inside the order transaction with the customer's phone, lock the coupon row, enforce total and per-phone limits on active redemptions, and record a redemption (coupon, order, phone, amount).
- **FR-011**: Cancelling an order or rejecting its payment MUST release its redemption; confirming a payment on a payment-rejected order MUST re-activate it.
- **FR-012**: Coupons MUST NOT apply to bridal reservations.

**Notify me**

- **FR-013**: Out-of-stock products MUST show «بلّغني أول ما يوصل» collecting name and Egyptian mobile (normalized), throttled and with a honeypot.
- **FR-014**: One request per (product, phone); a repeat updates its date and resets status to waiting.
- **FR-015**: The admin MUST see waiting lists per product (count, current stock), back-in-stock products first, and per entry a «ابعت على واتساب» link with the `notify_back_in_stock` template; opening it MUST mark the entry sent with the time and log the WhatsApp message.

**Admin**

- **FR-016**: Admin CRUD for flash sales (with an «إنهاء العرض دلوقتي» action) and coupons (delete becomes deactivate when redeemed), with status (scheduled / running / ended) and coupon usage (active uses, total discount).
- **FR-017**: Promotions endpoints require `promotions.manage`; notify-me admin endpoints require `notify.manage`; all mutations are CSRF-protected and audited.

**Analytics**

- **FR-018**: The storefront MUST send `coupon_applied` and `notify_me_requested` events without personal data.

### Key Entities

- **Flash sale**: name, start, end, items (product, sale price).
- **Coupon**: code, type, value, minimum order, dates, total and per-phone limits, category/brand scope, active.
- **Coupon redemption**: coupon, order, customer phone, amount, status (active / released).
- **Notify request**: product, name, normalized phone, status (waiting / sent), sent time, updated time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of quotes and orders during a sale use the sale price, and 100% after its end use the regular price, without any scheduled job.
- **SC-002**: A coupon's total limit is never exceeded under concurrent orders (tested with parallel placements).
- **SC-003**: Every coupon refusal shows one of the defined reasons in Egyptian Arabic.
- **SC-004**: A shopper can request a back-in-stock alert in under 20 seconds on a phone.
- **SC-005**: An admin can create a flash sale with 3 products in under 2 minutes.
- **SC-006**: All new pages work at 320 px with no horizontal scroll and meet the constitution's accessibility rules.

## Assumptions

- Old price and % off (US-8.1) are already shown; flash sales use the regular price as the struck-through price.
- Listing sort/filter by price uses the regular price; the card shows the effective price. (A sale changes display and charging, not ranking.)
- The home page is a placeholder until Slice 6; the reusable flash section is shown on /offers now and placed on the CMS home in Slice 6.
- Per-phone limits are checked at order placement (the quote may not know the phone yet); the quote shows them only if a phone is given.
- Coupon reports by revenue come with Slice 7 reports; this slice shows uses and total discount in the coupon list.
- Notify-me messages are sent manually from the admin with prefilled WhatsApp links (no Cloud API in Phase 1).
