# Data Model: Slice 2 — Cart, Checkout & Payments

Existing Prisma models are reused (`apps/api/prisma/schema.prisma`). Money is integer piastres.

## Order (exists)
Key fields: `no` (unique, `SR-<year>-<6>`), `status: OrderStatus`, customer fields (`customerName`, `customerPhone` normalized + indexed, `governorate`, `city`, `zoneId`, `address`, `notes`), `subtotal`, `discount`, `deliveryFee`, `total`, `paymentMethod`, `depositPct?`, `depositAmount?`, `paidAmount`, `publicToken` (unique, 24), `confirmToken` (unique, 24), `idempotencyKey?` (unique).

**New**: `internalNotes String?` (`internal_notes`) — admin-only notes, max 2000 chars.

Derived: `remaining = total − paidAmount`; `depositRemaining = max(0, depositAmount − paidAmount)`.

## OrderItem (exists)
`productId?`, `name`, `modelCode`, `qty`, `unitPrice` (locked), `taxRate` (locked).

## OrderEvent (exists) — history
`status` (new status, or `note`/`payment_confirmed`/`payment_rejected` markers), `note?`, `userId?`, `at`. One row per status change and per payment decision.

## Payment (exists)
`method`, `amount > 0`, `status: confirmed | rejected`, `rejectReason?` (required when rejected, 3–300 chars), `userId`, `at`. `paidAmount` = sum of confirmed payments.

## StockMovement (exists)
`productId`, `qty` (±), `reason` (`order_confirmed` | `order_cancelled` | …), `orderId`, `userId`, `at`.

## WhatsAppMessage (exists)
`orderId`, `to` (normalized phone), `templateKey`, `variables` (JSON), `channel = link`, `status = opened`, `userId`, `at`.

## Settings (exists, JSON parsed with Zod + fallbacks)
`payments.methods`, `zones`, `codDeposit {threshold, pct}`, `templates {key: text}`, `store.whatsapp`.

## State transitions (`OrderStatus`)

```text
new ───────────────┐
awaiting_payment ──┼─▶ confirmed ─▶ out_for_delivery ─▶ delivered
awaiting_deposit ──┘       ▲
   │                       │
   └─▶ payment_rejected ───┘
any state except delivered ─▶ cancelled
```

| Action | From | To | Side effects |
|---|---|---|---|
| Confirm payment | awaiting_payment, awaiting_deposit, payment_rejected | confirmed | Payment(confirmed), paidAmount += amount, stock deducted, history |
| Confirm (COD by phone) | new | confirmed | stock deducted, history |
| Reject payment | awaiting_payment, awaiting_deposit | payment_rejected | Payment(rejected, reason), history |
| Record extra payment | confirmed, out_for_delivery, delivered | unchanged | Payment(confirmed), paidAmount += amount, history marker |
| Dispatch | confirmed | out_for_delivery | history |
| Deliver | out_for_delivery | delivered | history |
| Cancel | any but delivered/cancelled | cancelled | if stock was deducted: restore exactly, history |

## Stock rules
- Deduct on entering `confirmed`: per item `taken = min(qty, stock)`; movement `qty = −taken`, reason `order_confirmed`.
- Restore on `cancelled` only if the order has `order_confirmed` movements: movement `qty = +taken`, reason `order_cancelled`.
- Items whose product was deleted (`productId = null`) are skipped.

## Validation (shared Zod)
- Confirm: `amount` int > 0 ≤ `remaining` (or ≤ total for first payment), optional `note` ≤ 300.
- Reject: `reason` 3–300.
- Status change: `to ∈ OrderStatus`, must pass `canTransition`; cancel needs `reason` 3–300.
- Admin list query: `status?`, `paymentMethod?`, `from?`, `to?` (ISO dates), `q?` (≤ 60), `page ≥ 1`, `pageSize ≤ 100`.
