# Data Model: Slice 3 — Bridal Builder

Existing tables are reused; only two columns are added.

## BridalTier (`bridal_tiers`) — exists

| Field | Type | Rules |
|---|---|---|
| id | cuid | |
| name | string | 1–40 chars |
| slug | string unique | `basic`, `golden`, `palace` |
| sort | int | display order |
| highlights | jsonb string[] | **NEW**, default `[]`, ≤ 4 items, each 1–60 chars |
| rooms | jsonb | `BridalRooms` (below) |

## BridalList (`bridal_lists`) — exists

| Field | Type | Rules |
|---|---|---|
| editToken / shareToken | string unique | 32 random bytes, base64url |
| tierId | fk? | starting tier (SetNull on delete) |
| rooms | jsonb | `BridalRooms` |
| status | BridalStatus | `draft` → `awaiting_deposit` on reserve; mirrors the reservation afterwards |
| customerName / customerPhone | string? | set on reserve |
| order | Order? | the reservation |

## BridalRooms (jsonb shape, `bridalRoomsSchema`)

```text
[{ key: BridalRoomKey, items: [{ productId: string, qty: 1..10 }] }]
```

- `BridalRoomKey` ∈ `kitchen | laundry | living | bedrooms | small_appliances | kitchenware`; each key at most once.
- ≤ 40 items per room, ≤ 120 items per list; duplicate productId in a room merged (qty summed, capped at 10).

## Order (`orders`) — reservation fields

| Field | Use for bridal |
|---|---|
| type | `bridal` |
| status | `awaiting_deposit` → `confirmed` (deposit complete) → `out_for_delivery` → `delivered`; `payment_rejected`, `cancelled` |
| bridalStatus | `awaiting_deposit` → `locked` → `delivery_agreed` → `delivered`; `cancelled` |
| paymentMethod | the transfer method chosen for the deposit |
| subtotal / deliveryFee / total | locked at reserve (regular prices + zone fee); changed only by re-price |
| depositPct / depositAmount | from settings at reserve; amount = round(total × pct / 100); re-price recomputes amount |
| paidAmount | sum of confirmed payments |
| lockDays | **NEW** int?, from settings at reserve |
| lockedUntil | set when paid ≥ deposit: end of day (Cairo) of today + lockDays; extend/re-price update it |
| preferredDate | optional, from the form |
| agreedDeliveryDate | set by admin; deducts stock |
| bridalListId | the list |

Derived (not stored): `lockExpired = bridalStatus = locked AND lockedUntil < now`; `lockDaysLeft` (Cairo days, ≥ 0).

## Status transitions (bridal)

| Action | From | To (status / bridalStatus) | Side effects |
|---|---|---|---|
| reserve | list draft | awaiting_deposit / awaiting_deposit | list frozen |
| confirm payment (paid < deposit) | awaiting_deposit, payment_rejected | awaiting_deposit / awaiting_deposit | payment recorded |
| confirm payment (paid ≥ deposit) | awaiting_deposit, payment_rejected | confirmed / locked | lockedUntil set; no stock |
| reject payment | awaiting_deposit | payment_rejected / (unchanged) | |
| agree delivery date | confirmed + locked (incl. expired) | confirmed / delivery_agreed | stock −qty, reason `bridal_delivery_agreed` |
| extend lock | confirmed + locked (incl. expired) | unchanged | lockedUntil = new date (> today) |
| re-price | confirmed + locked (incl. expired) | unchanged | item prices, subtotal, total, depositAmount; lockedUntil = today + lockDays |
| out for delivery | confirmed + delivery_agreed | out_for_delivery | |
| delivered | out_for_delivery | delivered / delivered | list delivered |
| cancel | any before delivered | cancelled / cancelled | exact stock restore; list cancelled |

Each action writes an `order_events` row and an audit entry.

## Settings (`settings` key `bridal`)

`{ depositPct: 1..50 (default 10), lockDays: 7..180 (default 30) }` — `bridalSettingsSchema`.

## StockMovement

Reason `bridal_delivery_agreed` (exists in enum) for deductions; restores reuse `order_cancelled`.
