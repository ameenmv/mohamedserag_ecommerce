---
description: "Tasks for Slice 5 — Reviews"
---

# Tasks: Slice 5 — Reviews

**Input**: `specs/006-reviews/` (spec, plan, research, data-model, contracts)

**Tests**: Requested — shared unit tests, API e2e per endpoint, TesterArmy browser e2e per story. Workflow: Claude briefs → Gemini (agy) implements → Claude reviews, runs gates + `pnpm test:e2e` on isolated servers, checks the browser → commit + push on `006-reviews`. Branches are never deleted.

## Phase 1: Foundational — shared reviews domain

- [x] T001 [P] `packages/shared/src/reviews.ts` (Zod-free): `PublicReview`, `ReviewRatingSummary`, `AdminReviewRow`, `AdminReviewListResponse` types; `summarizeRatings(starsCounts)` (average 1 decimal, distribution 1–5, null when empty); tests
- [x] T002 [P] `packages/shared/src/reviews-schema.ts`: `reviewInputSchema` (stars 1–5 int, text trimmed 20–1000, name 2–60, phone via phone schema, honeypot `website`), `adminReviewListQuerySchema` (status, q, stars, page, pageSize), `reviewReplySchema` (≤ 500, empty → null); tests; export both
- [x] T003 `analytics.ts` + `'review_submitted'` (the catalog `rating` field moves to T010, where it is filled)

## Phase 2: User Story 1 — Write a review (P1) 🎯

- [x] T004 [US1] API public `POST /reviews` (throttle 3/min/IP, honeypot, 404 hidden/archived, 409 repeat, verifiedBuyer at submit, store ip) + API e2e
- [x] T005 [US1] Web review form on the product page (lazy, «اكتب تقييمك», accessible star radio group, client checks mirroring limits, thank-you state, 409/429 messages, `review_submitted` without PII); i18n
- [x] T006 [US1] TesterArmy: submit valid review → thank-you; repeat same phone → refused; invalid inputs blocked; event without PII

## Phase 3: User Story 2 — Moderate (P1)

- [x] T007 [US2] API admin list (status tabs, counts, q/stars filters, paging, ordering) + approve (re-check verified) / reject / unpublish / reply / delete / pending-count; permission + CSRF + audit + API e2e
- [x] T008 [US2] Web `/admin/reviews` (tabs, filters, rows with phone and verified tag, reply editor, shadcn confirm dialogs, pending badge in sidebar); i18n
- [x] T009 [US2] TesterArmy: approve with reply → shown in the approved tab; unpublish → rejected tab; delete → phone can review again (the product-page check moves to T012, where display lands)

## Phase 4: User Story 3 — Read reviews (P1)

- [x] T010 [US3] `catalog.ts`: `rating: { average, count } | null` on ProductCard/ProductDetail; API `GET /products/:slug/reviews` (summary + paged approved list, no phone/ip) and rating summary on cards/detail via one grouped query; API e2e (pending/rejected never counted, distribution, paging)
- [x] T011 [US3] Web: `StoreProductRating` on cards, product-page summary + distribution + list + load more + empty state, verified tag, store reply; `aggregateRating` in product JSON-LD only when count > 0
- [x] T012 [US3] TesterArmy: three approved reviews → average and count on card and page, buyer tag, load more, empty state on another product, JSON-LD present only after approval

## Phase 5: Polish

- [ ] T013 English + 320 px pass, a11y (star input, focus, live regions), hydration check
- [ ] T014 Docs: docs/PHASE-1.md Slice 5; README roadmap; tick umbrella T060–T063
- [ ] T015 Review: security (phone never public, spam controls, plain-text rendering, audit masking), consistency with spec

## Dependencies & Strategy

- Phase 1 blocks all. US1 (submit) before US2 (moderate) before US3 display tests (they need approved reviews), but T010 API can be built alongside T007.
- Chunks: A = T001–T004 (shared + submit API), B = T005–T006 (submit UI), C = T007–T009 (moderation), D = T010–T012 (display), E = T013–T015.
