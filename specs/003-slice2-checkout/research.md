# Research: Slice 2 — Cart, Checkout & Payments

No open NEEDS CLARIFICATION items; decisions below resolve the design choices.

## R1. Idempotent order creation
- **Decision**: Client generates a key per checkout attempt (kept until success); `orders.idempotency_key` is unique; same key returns the existing order (200), new → 201; unique-violation race returns the winner. *(Built in T030.)*
- **Rationale**: Survives double taps and network retries without server sessions.
- **Alternatives**: Redis idempotency cache (new dependency, rejected); dedupe by phone + cart hash (false positives for real repeat orders).

## R2. Order numbers
- **Decision**: Postgres sequence `order_no_seq` → `SR-<year>-<6 digits>`, starting at 1001. *(Built in T030.)*
- **Alternatives**: `count(*)+1` (race-prone); per-year reset (needs a lock table, no business need).

## R3. Concurrent confirmations
- **Decision**: Status changes use a conditional update (`updateMany where id and status in allowedFrom`) inside a transaction; 0 rows → 409 «الطلب اتحدث، حدّث الصفحة». Payment row, history row and stock movements are written in the same transaction.
- **Rationale**: Guarantees one confirmation, one payment, one stock deduction without row locks held across requests.
- **Alternatives**: `SELECT … FOR UPDATE` (works, but conditional update is simpler with Prisma).

## R4. Stock never below zero, exact restore
- **Decision**: On «مؤكد» deduct `min(qty, stock)` per item and write a movement with the actual deducted quantity (negative). On cancel, restore the negated sum of that order's `order_confirmed` movements (reason `order_cancelled`). Admin sees a warning when stock was insufficient.
- **Rationale**: Keeps stock ≥ 0 and makes SC-004 hold exactly (restore = what was taken).
- **Alternatives**: Allow negative stock (confusing storefront availability); block confirmation (PRD lets the store decide).

## R5. When a confirmed payment moves the order
- **Decision**: Confirming a payment on «بانتظار الدفع» / «بانتظار العربون» / «الدفع مرفوض» records the payment and moves to «مؤكد». Confirming on a COD «جديد» order is a status change (phone confirmation) with no payment. Further payments on «مؤكد» or later only add to the paid amount (partial payments). Default confirm amount = remaining deposit for deposit orders, else remaining total; admin can edit.
- **Rationale**: Matches US-6.3 and US-5.5 while keeping partial payments additive.

## R6. Confirm link security
- **Decision**: `/admin/confirm/:token` page is behind the admin auth middleware (redirect to login with `returnTo`); API endpoints `GET/POST /api/admin/confirm/:token` require a session + `orders.confirmPayment` + CSRF. Token stays valid until confirmed or cancelled; after that the page shows status only.
- **Rationale**: Token alone is useless (US-6.3); same actions exist on the order page.

## R7. WhatsApp messages
- **Decision**: Links are built client-side with shared `waLink` + `renderTemplate` from templates in settings (fallback `DEFAULT_TEMPLATES`, add `order_cancelled`). Pressing a status button calls `POST /api/admin/orders/:id/whatsapp` to record `{templateKey, to, variables}` with status `opened`, then opens the link.
- **Alternatives**: Cloud API (Phase 2).

## R8. CSV export and invoice
- **Decision**: CSV streamed by the API with a UTF-8 BOM (Excel Arabic), money in EGP, using the same filters as the list. Invoice is an admin page with print CSS (`@media print`), not a PDF.
- **Alternatives**: PDF library (new dependency, not needed for an internal document).

## R9. Cart ↔ server sync
- **Decision**: Browser cart (`serag:cart:v1`) is the source until checkout; `/cart` and `/checkout` call `POST /api/cart/quote` (debounced) with `knownPrice` per line; checkout places the order with `expectedTotal` from the last quote and handles 409 by showing the fresh quote.
