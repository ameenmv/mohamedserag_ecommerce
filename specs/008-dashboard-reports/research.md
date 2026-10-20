# Research: Slice 7 — Dashboard, reports & settings

## R1. What counts as revenue and when

**Decision**: Revenue = `orders.total` (items after discount + delivery fee) of orders whose current status is `delivered`, dated by the latest `order_events` row with `status = 'delivered'` (fallback `orders.updated_at` for legacy rows without an event). Delivered order count and AOV use the same set.
**Rationale**: PRD US-12.3 ("revenue counts an order when it is delivered"); the event log already records each transition with a timestamp. Using the current status means an order cancelled after delivery leaves revenue (spec edge case).
**Alternatives**: A `delivered_at` column — cleaner queries but a migration and back-fill for no functional gain at launch volumes; add later if query plans need it.

## R2. Deposits series

**Decision**: Deposits = `payments.status = 'confirmed'` on orders with `deposit_amount IS NOT NULL` or `type = 'bridal'`, summed per day of `payments.at`. Payments never have a "pending" state (they are recorded when the admin confirms or rejects), so "payments waiting for confirmation" is the count of orders in `awaiting_payment`.
**Rationale**: Matches how Slice 2/3 record deposits; no schema change.

## R3. Time zone and buckets

**Decision**: Timestamps are `timestamp without time zone` holding UTC, so convert with `(ts AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Cairo')` before `::date` / `date_trunc('day'|'month', …)` (a single `AT TIME ZONE` would misread them as Cairo wall time); weeks start Saturday via `date_trunc('week', ts + interval '2 days') - interval '2 days'`. Fill empty buckets in shared code (`fillBuckets(range, groupBy, rows)`), so the API returns a dense series.
**Rationale**: Egypt's store day; Saturday is the first working day of the week.

## R4. Splits that sum to the total

**Decision**: Category/brand splits sum item lines (`qty × unit_price`) per current product category/brand, then subtract the order discount proportionally per line (largest-remainder rounding in piastres) and add a «رسوم التوصيل» row for delivery fees, so the split total equals revenue exactly. Payment method, zone and type splits group whole orders.
**Rationale**: SC-003 (splits sum to the total, 0 piastres difference).

## R5. Flash sale attribution

**Decision**: An order line counts for a flash sale when the order was created inside the sale window, the product is in the sale, and `unit_price` equals the sale price. Discount = (the product's current regular price − sale price) × qty, floored at 0 — an approximation, because the regular price at sale time is not stored; the report labels it «خصم تقريبي».
**Rationale**: Order lines store the paid unit price but not the reason; the window + price match is unambiguous in practice.

## R6. Repeat customers

**Decision**: Count distinct `customer_phone` (normalized) with ≥ 2 delivered orders overall and within the period, divided by distinct phones with ≥ 1 delivered order. Only counts leave the API.

## R7. Settings storage, validation and concurrency

**Decision**: Keep the existing `settings` rows (`store`, `payments`, `zones`, `codDeposit`, `searchSynonyms`, `templates`; add `lowStock`). One Zod schema per section in `settings-schema.ts`; `PUT /admin/settings/:section` takes `{ value, version }` where `version` is the `updated_at` ISO the form loaded; mismatch → 409 with the latest value. Readers (`StoreSettingsService` and friends) already parse with Zod and fall back to defaults, so a saved value is used on the next request.
**Rationale**: No migration; conflict detection without locks (FR-018).

## R8. Template variables

**Decision**: `TEMPLATE_VARIABLES: Record<WhatsAppTemplateKey, string[]>` in shared, derived from the variables each template uses today (`order_confirmed`: customerName, orderNo, total; `payment_rejected`: + reason; `bridal_locked`: + lockedUntil; …). Validation rejects unknown `{{name}}` and empty templates; preview renders with sample values.

## R9. Charts

**Decision**: Two small SVG components (`AdminChartLine`, `AdminChartBar`) with axis labels, tooltips on focus/hover and a visually hidden data table (or a «اعرض كجدول» toggle) for accessibility. No chart library (bundle size, RTL quirks).
