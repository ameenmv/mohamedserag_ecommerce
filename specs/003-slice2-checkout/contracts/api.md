# API Contracts: Slice 2

Base `/api`. Money in integer piastres. Errors: `{ statusCode, message (Arabic), code? }`. Admin routes need the session cookie, the named permission, and the `x-csrf-token` header on mutations; every admin mutation is audited.

## Public (built in T030)

| Method | Path | Body / query | Success |
|---|---|---|---|
| POST | `/cart/quote` | `cartQuoteInputSchema` | 200 `CartQuote` |
| POST | `/orders` | `createOrderInputSchema` (with `idempotencyKey`, `expectedTotal`) | 201 new / 200 retry: `{ no, publicToken, status, total }`; 409 `CART_CHANGED`/`TOTAL_CHANGED` + `quote`; 400 disabled method; 429 after 10/min/IP |
| GET | `/orders/:no/thanks?t=` | — | 200 `OrderThanks` (no phone/address), `Cache-Control: no-store`; identical 404 for unknown/missing/wrong token |
| GET | `/settings/checkout` *(new, T032)* | — | 200 `{ paymentMethods: [{ method, name, hint, account? }] (enabled only), codDeposit, storeWhatsapp, governorates: string[] }` |

## Admin orders (T031, T033)

| Method | Path | Permission | Body / query | Success |
|---|---|---|---|---|
| GET | `/admin/orders` | orders.read | `adminOrderListQuerySchema` | 200 `{ items: AdminOrderRow[], total, page, pageSize, counts: Record<OrderStatus, number> }` |
| GET | `/admin/orders/export.csv` | orders.read | same filters | 200 `text/csv; charset=utf-8` with BOM, money in EGP |
| GET | `/admin/orders/:id` | orders.read | — | 200 `AdminOrderDetail` (customer incl. phone, items, totals, deposit, paid/remaining, payments, events, whatsappMessages, internalNotes, allowedTransitions, confirmToken) |
| PATCH | `/admin/orders/:id/status` | orders.update | `{ to: OrderStatus, reason? }` | 200 `AdminOrderDetail`; 409 not allowed / stale |
| PATCH | `/admin/orders/:id/notes` | orders.update | `{ internalNotes }` | 200 |
| POST | `/admin/orders/:id/payments/confirm` | orders.confirmPayment | `{ amount, note? }` | 200 `AdminOrderDetail` |
| POST | `/admin/orders/:id/payments/reject` | orders.confirmPayment | `{ reason }` | 200 `AdminOrderDetail` |
| POST | `/admin/orders/:id/whatsapp` | orders.update | `{ templateKey, variables }` | 201 `{ id }` (records `opened`) |

## Admin confirm link (T031 API, T034 page)

| Method | Path | Permission | Body | Success |
|---|---|---|---|---|
| GET | `/admin/confirm/:token` | orders.confirmPayment | — | 200 `{ orderId, no, status, customerFirstName, total, paidAmount, expectedAmount, method, deposit, canConfirm, canReject }`; 404 unknown token |
| POST | `/admin/confirm/:token/confirm` | orders.confirmPayment | `{ amount, note? }` | 200 same summary; 409 when no longer confirmable |
| POST | `/admin/confirm/:token/reject` | orders.confirmPayment | `{ reason }` | 200 same summary + `rejectWhatsappUrl` |

Status codes for actions: `@HttpCode(200)` on POST actions; 401 without session, 403 without permission or CSRF.
