# Research: Slice 5 — Reviews

## Rating summary storage
- **Decision**: Derive per request: `groupBy productId` over approved reviews for the listed ids (cards) and a `groupBy stars` for one product (page).
- **Rationale**: Exact by construction, no cache invalidation on approve/unpublish/delete (FR-008, SC-004), no migration. Catalog is small (hundreds of products), reviews indexed by status.
- **Alternatives**: Denormalized `rating_avg`/`rating_count` on products — faster at scale but needs a migration and careful updates in every moderation action; revisit if listings slow down.

## Unpublish semantics
- **Decision**: approved → rejected. **Rationale**: Existing enum has no "hidden" state; rejected already means "not public, kept for admin". Admin UI labels the tab «مرفوض/مخفي».

## Verified buyer
- **Decision**: Exists check: an order with status `delivered`, `customerPhone` = normalized review phone, containing an order item for the product. Computed on submit and re-checked on approve; never recomputed after.
- **Rationale**: PRD US-9.2 wording; stable public badge.

## Duplicate rule
- **Decision**: Unique (productId, phone) at DB level; a repeat returns 409 «انت قيّمت المنتج ده قبل كده». Delete frees the slot; reject does not.

## Spam controls
- **Decision**: Honeypot `website` (silent 201), throttle 3/min/IP on POST /reviews, store `ip` on the row for admin abuse checks (never exposed publicly).

## Storefront form weight
- **Decision**: The review form is a client-only, lazily rendered component opened by «اكتب تقييمك»; client validation uses a small local check mirroring the shared limits, the server validates with the shared Zod schema.
- **Rationale**: Keeps Zod out of the product page chunk (Slice 3 Lighthouse rule).

## Structured data
- **Decision**: Add `aggregateRating { ratingValue, reviewCount, bestRating 5, worstRating 1 }` to the existing Product JSON-LD only when count > 0. No individual `review` objects in Phase 1.
