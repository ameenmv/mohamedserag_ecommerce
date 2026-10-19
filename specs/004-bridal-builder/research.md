# Research: Slice 3 — Bridal Builder

## R1 — Reservation record

- **Decision**: A reservation is an `orders` row with `type = bridal`, linked 1:1 to its `bridal_lists` row. `orders.status` uses the retail statuses (`awaiting_deposit`, `payment_rejected`, `confirmed`, `out_for_delivery`, `delivered`, `cancelled`); `orders.bridal_status` carries the bridal stage (`awaiting_deposit`, `locked`, `delivery_agreed`, `delivered`, `cancelled`).
- **Rationale**: Reuses payments, confirm token page, history, audit, WhatsApp log, CSV and invoice. The PRD data model already defines it this way.
- **Alternatives**: A separate reservations table — duplicates the whole payment flow.

## R2 — Lock expiry

- **Decision**: Derive «انتهى تثبيت السعر» at read time: `bridal_status = locked AND locked_until < now`. The stored enum value `lock_expired` is not written.
- **Rationale**: No scheduler exists; derived state is always correct and testable with a clock parameter.
- **Alternatives**: Nightly job writing `lock_expired` — extra infra and stale between runs.

## R3 — Deposit rule for partial payments

- **Decision**: From `awaiting_deposit`, a confirmed payment moves the order to `confirmed` only when `paidAmount ≥ depositAmount`; otherwise it stays and the payment is recorded. Applies to bridal and large-COD orders. `awaiting_payment` (full transfer) keeps the Slice 2 behaviour.
- **Rationale**: PRD US-4.4 (deposit may arrive as several transfers). Same rule for large COD keeps one code path.
- **Alternatives**: Bridal-only rule — two behaviours for the same status.

## R4 — Stock for reservations

- **Decision**: `OrderStatusService.transition` skips stock deduction on `confirmed` for `type = bridal`. Recording the agreed delivery date calls `OrderStockService.deductForOrder(tx, id, userId, 'bridal_delivery_agreed')`. Cancel keeps the existing exact restore based on recorded movements (restores nothing if nothing was deducted).
- **Rationale**: PRD US-3.3; one stock service.

## R5 — Lock days snapshot

- **Decision**: New nullable `orders.lock_days`, set from bridal settings at reservation time; the lock end = end of day (Africa/Cairo) of today + lock days when the deposit completes.
- **Rationale**: The bride sees the lock period when reserving; a later settings change must not alter what she was promised.

## R6 — List storage and saving

- **Decision**: `bridal_lists.rooms` jsonb `[{ key, items: [{ productId, qty }] }]`, validated by `bridalRoomsSchema` on read and write. Saves send the whole list (PATCH, debounced 600 ms on the client); last write wins. Rooms use fixed keys: `kitchen, laundry, living, bedrooms, small_appliances, kitchenware`; labels come from i18n.
- **Rationale**: Small payloads (≤ 120 items), simple conflict model, no per-item table.

## R7 — Tokens

- **Decision**: `randomBytes(32).toString('base64url')` for edit and share tokens (43 chars). Read endpoint `GET /api/bridal/lists/:token` looks up both columns; response includes `editToken` only when the token matched the edit token. PATCH and reserve accept only the edit token.
- **Rationale**: PRD US-4.3; unguessable, URL-safe.

## R8 — Alternatives and adding products

- **Decision**: `GET /api/bridal/alternatives?productId=` returns up to 24 visible, non-archived products in the same category ordered by price, with price and stock state. Adding uses the existing `GET /api/search` for the query and the same item shape.
- **Rationale**: Reuses search; same-category rule from PRD US-4.2.

## R9 — Room for «add from product page»

- **Decision**: Shared `CATEGORY_ROOM` map: `refrigerators, cookers → kitchen`, `washers → laundry`, `tvs → living`, `acs → bedrooms`, `cookware → kitchenware`, anything else → `small_appliances`.

## R10 — Device memory

- **Decision**: localStorage key `serag:bridal:edit` stores the last edit token (read only after hydration, try/catch). /bridal shows «كمّلي قايمتك» when present and the list is still a draft.
