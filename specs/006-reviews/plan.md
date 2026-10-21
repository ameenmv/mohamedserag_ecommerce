# Implementation Plan: Slice 5 — Reviews

**Branch**: `006-reviews` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

## Summary

Public review submission (pending by default, one per product + phone, throttled, honeypot), an admin moderation queue (approve / reject / unpublish / reply / delete) gated by `reviews.moderate`, and storefront display: rating summary on cards and product pages, approved review list with «اشترى من المعرض», and `AggregateRating` in product JSON-LD. The `reviews` table and the `reviews.moderate` permission already exist; no schema change.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 24
**Primary Dependencies**: Nuxt 4, @nuxtjs/i18n, shadcn-vue, Tailwind 4; NestJS 12, Prisma 7; Zod 4 in `@serag/shared`. No new dependencies.
**Storage**: PostgreSQL, existing `reviews` table (`@@unique([productId, phone])`, `@@index([status])`). Rating summaries are derived with one grouped query per request (approved reviews by product ids); no denormalized columns.
**Testing**: Vitest unit, API e2e (`apps/api/test`), TesterArmy browser e2e (`tests/e2e`).
**Performance Goals**: cards add one `groupBy` over approved reviews for the listed product ids (no N+1); product page adds one summary query + one paged list query.
**Constraints**: phones never leave admin endpoints; text rendered as plain text; fail-closed admin permissions + CSRF + audit (phones masked in audit snapshots by the Slice 4 interceptor); Zod only in `*-schema.ts`; storefront page chunks must not pull Zod (Slice 3 perf rule) — the review form loads the schema lazily or validates with a light helper.

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I One stack | No new dependency | ✅ |
| II Arabic RTL, Egyptian voice | Form copy, thank-you message, refusals and admin UI in Egyptian Arabic + English | ✅ |
| III One brand system | Gold stars from brand tokens; existing card/product components extended | ✅ |
| IV API-first, permission-checked | Shared schemas; `reviews.moderate`; audit + CSRF on every mutation | ✅ |
| V Accessible, fast, mobile-first | Star input as a radio group with labels; 320 px checks; no N+1 | ✅ |
| VI WhatsApp is the channel | Not applicable (no messaging in this slice) | ✅ |

## Project Structure

```text
packages/shared/src/
├── reviews.ts              # ReviewRatingSummary, PublicReview, AdminReviewRow types; summary math (avg 1 decimal, distribution); verified label rule
├── reviews-schema.ts       # reviewInputSchema (stars, text 20–1000 trimmed, name, phone, website honeypot), admin list query, reply input
├── catalog.ts              # ProductCard/ProductDetail gain `rating: { average, count } | null`
└── analytics.ts            # + 'review_submitted'

apps/api/src/
├── reviews/                # public POST /reviews, GET /products/:slug/reviews (paged), rating summary service used by catalog
├── admin-reviews/          # list/approve/reject/unpublish/reply/delete (reviews.moderate)
├── catalog/                # cards + detail attach rating summary (one grouped query)
└── admin-dashboard counters# pending reviews count (existing dashboard endpoint, if present; else small endpoint)

apps/web/app/
├── components/store/product/StoreProductRating.vue            # stars + count on cards
├── components/store/product-page/StoreProductPageReviews.vue   # summary, distribution, list, load more
├── components/store/product-page/StoreProductPageReviewForm.vue
├── composables/useProductReviews.ts, useReviewSubmit.ts
├── utils/product-jsonld.ts                                     # AggregateRating when count > 0
├── pages/admin/reviews.vue + components/admin/reviews/*
└── composables/useAdminReviews.ts
```

## Complexity Tracking

No constitution violations.
