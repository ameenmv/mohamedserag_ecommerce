# Data Model: Slice 7 — Dashboard, reports & settings

No new tables or migrations. Optional indexes only if query plans need them: `order_events (status, at)`, `orders (status)`.

## Read models (computed)

### DashboardSummary
| Field | Notes |
|---|---|
| counters[] | `{ id, count, href, permission }` for: newOrders (`orders.status = new`), awaitingPayment (`awaiting_payment`), awaitingDeposit (`awaiting_deposit`), locksExpiring (bridal orders with `locked_until` within 7 days and status locked/delivery_agreed), pendingReviews, notifyReady (products orderable again with `waiting` requests), lowStock (visible, non-archived, auto mode, `stock <= low_stock_threshold`) — filtered by the caller's permissions |
| range | 7 / 30 / 90 |
| series[] | `{ date, revenue, deliveredOrders, deposits }` per Cairo day, dense |
| totals / previousTotals | sums for the range and the preceding range of equal length |

### Reports (per period `{ from, to }` Cairo dates, `groupBy` day/week/month)
- **revenue**: buckets `{ key, revenue, orders, aov }` + totals.
- **splits**: `{ byCategory[], byBrand[], byPaymentMethod[], byZone[], byType[] }` each `{ id|null, label, revenue, orders }`, plus `deliveryFees` row for category/brand.
- **best-sellers**: `{ productId, name, modelCode, units, revenue, stock }` top 50.
- **coupons**: `{ couponId, code, uses, discount, revenue }`.
- **flash-sales**: `{ flashSaleId, name, startsAt, endsAt, units, revenue, discount }`.
- **bridal-funnel**: `{ listsCreated, reservationsPaid, delivered, listToReservationPct, reservationToDeliveredPct }`.
- **repeat-customers**: `{ customers, repeatCustomers, repeatPct, periodCustomers, periodRepeat, periodRepeatPct }`.

## settings (existing key–value table)

| key | value (validated by `settings-schema.ts`) |
|---|---|
| store | `{ name, phone, whatsapp, tradersWhatsapp, address, hours }` (phones: Egyptian mobile or `+` international; placeholders allowed but flagged) |
| payments | existing `paymentsSettingSchema` (methods: enabled, name, hint, account) — ≥ 1 enabled |
| zones | existing `zonesSchema` (`{ id, name, fee, places: { governorate, city? }[] }`, fee piastres ≥ 0) — a governorate-wide place in at most one zone, a governorate+city pair at most once |
| codDeposit | `{ threshold (piastres > 0), pct (1–100) }` |
| lowStock | **new key** `{ defaultThreshold: int 0–999 }` (used when creating products) |
| searchSynonyms | `string[][]` groups (each 2–10 words, ≤ 200 groups) |
| templates | `Record<WhatsAppTemplateKey, string>` (non-empty, ≤ 1000 chars, only allowed variables) |

`updated_at` of each row is the optimistic-concurrency version.
