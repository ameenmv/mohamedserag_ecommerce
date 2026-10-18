# API Contracts: Slice 4 — Promotions & Stock Alerts

Base URL ends in `/api`. Money in piastres.

## Public
- Cards and product detail gain `flash: { salePrice, endsAt } | null`; `price` is the effective price and `oldPrice` is the regular price while a sale runs (else the stored old price); `discountPercent` follows.
- `GET /offers` → `{ flash: { endsAt, products: ProductCard[] }[], discounted: ProductCard[] }` (running sales first by end time; discounted = visible products with oldPrice > price not on a sale, max 24).
- `POST /cart/quote` (exists) body may include `couponCode` and optional `phone`; `coupon` in the response is `{ code, status: 'applied'|'rejected', discount, reason, reasonCode }`.
- `POST /orders` (exists): coupon re-evaluated in the transaction; `409 { code: 'TOTAL_CHANGED', quote }` if the discount changed; `409 { code: 'COUPON_REJECTED', quote }` when a limit is hit at placement.
- `POST /notify-me` `{ productId, name, phone, website? }` → `201 { ok: true }` (also when the honeypot is filled); 404 for hidden/archived products; 409 «المنتج متوفر دلوقتي» when in stock.

## Admin (CSRF, audit)
| Method & path | Permission | Notes |
|---|---|---|
| `GET /admin/flash-sales` | promotions.manage | list with status, item count |
| `GET /admin/flash-sales/:id` | promotions.manage | items with product name, model code, regular price |
| `POST /admin/flash-sales`, `PUT /admin/flash-sales/:id` | promotions.manage | `{ name, startsAt, endsAt, items: [{ productId, salePrice }] }`; 409 `OVERLAP` with product names |
| `POST /admin/flash-sales/:id/end` | promotions.manage | sets endsAt = now |
| `DELETE /admin/flash-sales/:id` | promotions.manage | |
| `GET /admin/coupons` | promotions.manage | with status, activeUses, totalDiscount |
| `POST /admin/coupons`, `PUT /admin/coupons/:id` | promotions.manage | 409 duplicate code |
| `DELETE /admin/coupons/:id` | promotions.manage | deactivates when redeemed, else deletes |
| `GET /admin/notify-me` | notify.manage | `[{ product: { id, name, modelCode, stock, available }, waiting, sent }]` back-in-stock first |
| `GET /admin/notify-me/:productId` | notify.manage | entries (name, phone, status, updatedAt, sentAt) |
| `PATCH /admin/notify-me/:id` | notify.manage | marks sent (only when the product is available) → `{ whatsappUrl }` and logs the WhatsApp message |
