# API Contracts: Slice 5 — Reviews

Base URL ends in `/api`.

## Public
- Cards (listings, search, offers, related) and product detail gain `rating: { average: number, count: number } | null` (approved reviews only).
- `GET /products/:slug/reviews?page=1&pageSize=10` → `{ summary: { average, count, distribution: { "1": n, …, "5": n } }, items: PublicReview[], total, page, pageSize }`; newest first; 404 for hidden/archived products. `PublicReview = { id, name, stars, text, reply, verifiedBuyer, createdAt }`.
- `POST /reviews` `{ productId, stars, text, name, phone, website? }` → `201 { ok: true }` (also when the honeypot is filled; nothing stored); 400 validation; 404 hidden/archived product; 409 «انت قيّمت المنتج ده قبل كده» on a repeat (product + phone); 429 throttled (3/min/IP).

## Admin (CSRF, audit)
| Method & path | Permission | Notes |
|---|---|---|
| `GET /admin/reviews?status=pending&q=&stars=&page=&pageSize=` | reviews.moderate | `{ items: AdminReviewRow[], total, page, pageSize, counts: { pending, approved, rejected } }`; pending oldest first, others newest first; `q` matches product name |
| `PATCH /admin/reviews/:id/approve` | reviews.moderate | re-checks verifiedBuyer; idempotent |
| `PATCH /admin/reviews/:id/reject` | reviews.moderate | from pending or approved (unpublish); idempotent |
| `PATCH /admin/reviews/:id/reply` | reviews.moderate | `{ reply: string \| null }` (≤ 500, trimmed; empty → null) |
| `DELETE /admin/reviews/:id` | reviews.moderate | 204 |
| `GET /admin/reviews/pending-count` | reviews.moderate | `{ count }` for sidebar/dashboard |

`AdminReviewRow = { id, product: { id, name, slug }, name, phone, stars, text, status, reply, verifiedBuyer, createdAt, updatedAt }`.
