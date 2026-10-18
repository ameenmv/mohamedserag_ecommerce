# API Contracts: Slice 3 — Bridal Builder

Base URL ends in `/api`. Money in integer piastres. Errors use the existing `{ statusCode, message }` shape with Egyptian Arabic messages.

## Public

### `GET /bridal/tiers`

`200 → { tiers: [{ id, slug, name, highlights: string[], roomCount, itemCount, total }] }` — total and counts use current regular prices of available items.

### `POST /bridal/lists` (throttled)

Body `{ tierId?: string, productId?: string }` (productId: start an empty list with that product in its category room).
`201 → { editToken }`. Unknown tier/product → 404.

### `GET /bridal/lists/:token`

`200 → BridalListView`

```text
{
  mode: 'edit' | 'view',
  editToken?: string,            // only when mode = edit
  shareToken: string,
  status: BridalStatus,
  tier: { id, name, total } | null,   // tier total at current prices (for «الفرق عن الباقة»)
  rooms: [{ key, subtotal, items: [{ productId, slug, name, modelCode, imageUrl, categorySlug,
            qty, unitPrice, lineTotal, available: boolean, availabilityMode, leadTimeText }] }],
  itemCount, total, issues: { unavailable: number },
  reservation: { no, status, bridalStatus, total, depositAmount, paidAmount, lockedUntil } | null
}
```

Reserved lists price items from the reservation's locked order items. Unknown token → 404. The view never includes customer phone, address or the confirm token.

### `PATCH /bridal/lists/:token` (edit token only, throttled)

Body `{ rooms: BridalRooms }` → `200 BridalListView`. Share token → 403. Non-draft list → 409 «القايمة اتحجزت ومينفعش تتعدل».

### `GET /bridal/alternatives?productId=`

`200 → { items: [{ productId, slug, name, imageUrl, price, available }] }` (same category, visible, ≤ 24, by price).

### `POST /bridal/lists/:token/reserve` (edit token only, throttled)

Body:

```text
{ customer: { name, phone, governorate, city, address, notes? }, preferredDate?: 'YYYY-MM-DD',
  paymentMethod: 'instapay' | 'vodafone_cash' | 'fawry', idempotencyKey: uuid, expectedTotal: int }
```

- `201 → { orderNo, publicToken }` → client goes to `/order/:no/thanks?t=publicToken`.
- `409 { code: 'PRICE_CHANGED', quote }` when `expectedTotal` differs; `409 { code: 'UNAVAILABLE' }` when items are unavailable or the list is empty; `409` when not a draft; same `idempotencyKey` → same order.

### `GET /bridal/reserve-quote/:token?governorate=&city=` (edit token)

`200 → { subtotal, deliveryFee, total, depositPct, depositAmount, lockDays }`.

### `GET /order/:no/thanks?t=` — exists

Adds for bridal: `type: 'bridal'`, `lockDays`, and the deposit block (exists).

## Admin (CSRF on mutations, `@Audit('order')`)

| Method & path | Permission | Body → Result |
|---|---|---|
| `GET /admin/orders?type=bridal` | orders.read | adds `type` filter; rows add `type`, `bridalStatus`, `lockedUntil`, `lockExpired`, `lockDaysLeft` |
| `GET /admin/orders/:id` | orders.read | adds `bridal: { status, lockDays, lockedUntil, lockExpired, lockDaysLeft, preferredDate, agreedDeliveryDate, listShareToken }` |
| `POST /admin/orders/:id/delivery-date` | orders.update | `{ date: 'YYYY-MM-DD' }` → `{ shortages }` |
| `POST /admin/orders/:id/lock-extend` | orders.update | `{ until: 'YYYY-MM-DD' }` (> today) → `200` |
| `POST /admin/orders/:id/reprice` | orders.update | `{}` → `{ oldTotal, newTotal, difference, lockedUntil, whatsappUrl }` |
| `GET /admin/bridal/expiring` | orders.read | `{ items: [{ id, no, customerName, lockedUntil, lockDaysLeft, lockExpired }] }` (≤ 7 days or expired, no agreed date) |
| `GET /admin/bridal/tiers` | bridal.manage | tiers with rooms resolved to products and `flagged` items |
| `PUT /admin/bridal/tiers/:id` | bridal.manage | `{ name, highlights, rooms }` → tier |
| `GET /admin/bridal/settings` / `PUT` | bridal.manage | `{ depositPct, lockDays }` |

Payments confirm (existing `POST /admin/orders/:id/payments/confirm` and the confirm-token page) follow the deposit rule (R3) and return `{ shortages: [], locked?: { lockedUntil } }`.
