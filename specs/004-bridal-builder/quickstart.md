# Quickstart: Validate Slice 3 — Bridal Builder

## Prerequisites

- Dev DB up, migrations applied, seed run (`pnpm --filter @serag/api prisma migrate dev && pnpm --filter @serag/api seed`).
- API on :4000, web on :3000 (`pnpm dev`).

## Scenarios

1. **Build** — open `/bridal` → three tiers with totals → «ابدئي بالذهبية» → URL becomes `/bridal/<editToken>` → swap, remove, change quantity, add from search → totals and «الفرق عن الباقة» update → reload → same list.
2. **Share** — tap «شاركيها على واتساب» → message has total and `/bridal/<shareToken>` → open in a private window → read-only, no edit controls; `GET /api/bridal/lists/<shareToken>` has no `editToken`.
3. **Reserve** — «احجزي بعربون» → pick الدقهلية / طلخا → deposit 10% and 30 days shown → reserve with InstaPay → thank-you page with proof button → edit link now read-only.
4. **Partial deposit** — as admin open the confirm link → confirm half the deposit → still «بانتظار العربون» → confirm the rest → «محجوز (السعر مثبت)» with end date → change a product price in admin → reservation total unchanged.
5. **Delivery & stock** — on the reservation record a delivery date → stock movements `bridal_delivery_agreed` → cancel → stock restored.
6. **Expiry** — set `locked_until` to yesterday in the DB → reservation shows «انتهى تثبيت السعر» → extend or re-price → dashboard card lists it before.
7. **Setup** — `/admin/bridal` → edit a tier and deposit % → `/bridal` and the next reservation reflect it.

## Gates

`pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @serag/api test:e2e && pnpm test:e2e && pnpm build`
