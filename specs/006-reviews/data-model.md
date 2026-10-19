# Data Model: Slice 5 — Reviews

All tables exist; no schema change is required.

## Review (`reviews`)
productId, name (2–60), phone (normalized Egyptian mobile, private), stars (1–5), text (20–1000, trimmed, plain text), status pending|approved|rejected (default pending), reply? (≤ 500), verifiedBuyer (bool), ip?, createdAt, updatedAt. Unique (productId, phone); index (status).

Transitions:
- create → pending (verifiedBuyer computed)
- pending → approved (verifiedBuyer re-checked) | rejected
- approved → rejected (unpublish)
- rejected → approved (admin may re-approve)
- any → deleted (row removed; frees the phone for that product)
- reply: set/clear in any status; shown publicly only while approved

## Derived: Product rating summary
For approved reviews of a product: `count`, `average` (rounded to 1 decimal), `distribution { 1..5: count }`. Cards use `{ average, count }`; null when count = 0.

## Public review (storefront shape)
id, name, stars, text, reply|null, verifiedBuyer, createdAt — never phone or ip.
