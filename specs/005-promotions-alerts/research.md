# Research: Slice 4 — Promotions & Stock Alerts

## R1 — Effective price at read time
- **Decision**: `effectivePrice = activeFlashSalePrice ?? product.price`, where an item is active when `starts_at <= now < ends_at`. One query per request: `flash_sale_items JOIN flash_sales WHERE product_id IN (...) AND starts_at <= now AND ends_at > now`.
- **Rationale**: Automatic revert with no scheduler (PRD "revert automatically"); same approach as bridal lock expiry.
- **Alternatives**: Writing sale prices into `products.price` with a job — risky, needs revert bookkeeping.

## R2 — Overlap rule
- **Decision**: On save, refuse if any item's product appears in another sale with `other.start < this.end AND this.start < other.end`. Checked in the save transaction.

## R3 — Coupon evaluation
- **Decision**: Pure `evaluateCoupon(coupon, lines, ctx)` in shared returns `{ status, discount, reason, eligibleSubtotal }`. Lines carry `onFlash`, `hasOldPriceDiscount`, `categoryId`, `brandId`. Percent: `round(eligibleSubtotal × pct / 100)`; fixed: `min(value, eligibleSubtotal)`. Limits counted on `active` redemptions.
- **Order transaction**: `SELECT ... FROM coupons WHERE id = $1 FOR UPDATE`, count active redemptions (total and per phone), evaluate, create redemption with the order. Total limit is safe under concurrency because the row lock serializes placements of the same coupon.

## R4 — Redemption lifecycle
- **Decision**: In `OrderStatusService.transition`: to `cancelled` or `payment_rejected` → `released`; from `payment_rejected` to `confirmed`/`awaiting_deposit` → `active` again (without re-checking limits — the shopper already had it).

## R5 — Coupon refusal reasons (Egyptian Arabic)
not_found «الكود ده مش موجود» · inactive/expired «الكود انتهى» · not_started «الكود لسه مبدأش» · min_order «الحد الأدنى للطلب {amount}» · limit «الكود ده خلص» · phone_limit «استخدمت الكود ده قبل كده» · no_eligible «الكود ده مش على المنتجات اللي في السلة».

## R6 — Notify-me
- **Decision**: `POST /api/notify-me` (public, throttle 5/min, honeypot `website` field); upsert on (productId, phone) setting status waiting and touching `updatedAt`. Admin list grouped by product.

## R7 — Countdown component
- **Decision**: Client-only countdown (`.client.vue`) rendered inside a static server wrapper that shows the end time text, so SSR markup never depends on the clock (no hydration mismatch).
