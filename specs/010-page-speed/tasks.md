# Tasks: Page speed

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/lighthouse-budgets.md](contracts/lighthouse-budgets.md), [quickstart.md](quickstart.md)

**Tests**: no new test files are required. The gate is the existing Lighthouse CI step (contract) plus the existing browser suite (`csp.e2e.ts`, `accessibility.e2e.ts`, 375/320 px journeys), which must keep passing unchanged (SC-004).

## Phase 1: Setup

- [ ] T001 Record the "before" measurements: median of the 3 CI Lighthouse runs per URL from PR #7 (the `lighthouse-report` artifact). Record score, LCP, LCP element, CLS and script transfer per page in a "Page speed: before / after" table in `docs/PHASE-1.md`, with the fields from data-model.md "Speed measurement" and the commit hash.

> **Update after Phase 2 (2026-10-21):** the font-fallback fix (T002–T003) was implemented, then reverted. Its premise did not hold (research R1 retracted). The CI reference (research R0) shows home, category and product already within budget, and checkout missing LCP only because it is measured with an empty cart. **T020–T021 below replace Phases 2–5**; the per-story phases stay as a fallback if CI shows a page missing again.

## Phase 2: Foundational (blocks all stories)

- [ ] T002 In `apps/web/nuxt.config.ts` → `fonts`, set the generated metric fallbacks to `['Arial', 'Helvetica Neue', 'Segoe UI', 'Roboto']` for `sans-serif` (via `fonts.defaults.fallbacks` or per family, whichever `@nuxt/fonts` 1.0.1 supports), so no `"… Fallback: Noto Sans"` face is generated (research R1). Keep the family names, weights, subsets and preloads as they are, and add a comment explaining the Noto Sans `local()` cost.
- [ ] T003 Verify T002: after `pnpm --filter @serag/web build`, `grep -o 'Fallback: Noto Sans' apps/web/.output/public/_nuxt/entry.*.css` returns nothing, and `--font-sans`, `--font-display` and `--font-num` still list the brand face first (quickstart §3).
- [ ] T004 Measure the four pages locally behind Caddy (quickstart §1–2, 3 runs, median) and check observed first paint is under 0.5 s on the scriptless category copy. CLS must be < 0.1 on all four pages, both Arabic and `/en` (FR-001, FR-004).
- [ ] T005 Side-by-side screenshots before/after of home, `/c/refrigerators`, a product and checkout, in Arabic and `/en`, at 375 px and 1280 px, to confirm no visible change. Save them under `specs/010-page-speed/screenshots/` (FR-004, SC-005).

**Checkpoint**: if CI (after a push) shows all four pages within budget, skip to Phase 6.

## Phase 3: User Story 1 — Category page fast on a phone (P1)

**Goal**: `/c/refrigerators` meets performance ≥ 0.9 and LCP < 2.5 s with every control working on the first tap.
**Independent test**: Lighthouse on `/c/refrigerators` (contract) plus `catalog.e2e.ts` and `compare-wishlist.e2e.ts` at 1280, 375 and 320 px.

- [ ] T006 [US1] If the category page still misses after Phase 2, use its Lighthouse report to name the cause (TBT tasks, LCP phases, `prioritize-lcp-image`, `uses-responsive-images`, `offscreen-images`) and note it under this task in `specs/010-page-speed/tasks.md`.
- [ ] T007 [US1] Fix what T006 names, in the files it points to (for example `apps/web/app/components/store/listing/StoreListingGrid.vue` image priority and `sizes`, or `apps/web/app/layouts/default.vue` mounting the cart drawer and quote sync on first use). Never defer hydration of a component with buttons (research R2, FR-003).
- [ ] T008 [US1] Re-run `tests/e2e/tests/catalog.e2e.ts` and `compare-wishlist.e2e.ts` with `E2E_VIEWPORT` unset, `375x812` and `320x640`; all pass.

## Phase 4: User Story 2 — Product page fast on a phone (P1)

**Goal**: `/p/fresh-cooker-4b-s15` meets the budgets; price and «أضف للسلة» usable at once.
**Independent test**: Lighthouse on the product URL plus `product.e2e.ts`, `reviews-submit.e2e.ts`, `reviews-display.e2e.ts`, `bridal-product-button.e2e.ts`.

- [ ] T009 [P] [US2] If the product page still misses after Phase 2, name the cause from its report (research R2/R3: gallery image priority and `sizes`, TBT) and note it under this task.
- [ ] T010 [US2] Fix what T009 names, for example `apps/web/app/components/store/product-page/StoreProductPageGallery.vue` (first image `fetchpriority="high"`, correct `sizes`, others lazy) or below-the-fold non-interactive blocks in `apps/web/app/pages/p/[slug].vue` (`hydrate-never` only where there are no buttons).
- [ ] T011 [US2] Re-run the product, reviews and bridal-button specs at the three widths; all pass, including the sticky buy bar without layout shift.

## Phase 5: User Story 3 — Checkout fast on a phone (P1)

**Goal**: `/checkout` meets the budgets and a COD order still goes through.
**Independent test**: Lighthouse on `/checkout` plus `checkout-cod.e2e.ts`, `checkout-transfer.e2e.ts`, `coupon.e2e.ts`, `cod-deposit.e2e.ts`.

- [ ] T012 [P] [US3] If checkout still misses after Phase 2, name the cause from its report (research R4) and note it under this task.
- [ ] T013 [US3] Fix what T012 names in `apps/web/app/pages/checkout.vue` / `apps/web/app/components/store/checkout/*`, keeping inputs and the submit button disabled until hydrated (golden rule 10).
- [ ] T014 [US3] Re-run the checkout, coupon and deposit specs at the three widths; all pass.

## Phase 6: User Story 4 — A slower page can no longer be merged (P2)

**Goal**: every Lighthouse assertion on the four URLs is at `error` level.
**Independent test**: CI on the PR passes with the strict config. Locally, `pnpm dlx @lhci/cli@0.15.1 assert --config=lighthouserc.json` against a saved run reports the URL and assertion when a budget is missed.

- [ ] T015 [US4] In `lighthouserc.json`, change the `https://localhost:8443/(c|p|checkout).*` entry: `categories:performance` `["error", { "minScore": 0.9 }]` and `largest-contentful-paint` `["error", { "maxNumericValue": 2500 }]`, exactly as in contracts/lighthouse-budgets.md. Keep `numberOfRuns: 3`.
- [ ] T016 [US4] Push and confirm the CI **Checks** job passes the Lighthouse step on all four URLs. If a page fails only in CI, go back to its story phase with the CI report.

## Phase 6b: Measure checkout as shoppers reach it

- [ ] T020 [US3] Add `lighthouse/add-to-cart.cjs` (repo root): a Lighthouse CI `puppeteerScript` that opens `https://localhost:8443/p/fresh-cooker-4b-s15`, waits for hydration, taps `#main-add-to-cart-button` and waits for the header cart link to show 1. In `lighthouserc.json` → `collect`, set `puppeteerScript` to it, `puppeteerLaunchOptions` with the same `--ignore-certificate-errors`, and `settings.disableStorageReset: true` so the cart survives into the checkout run. In `.github/workflows/ci.yml`, run lhci with puppeteer available (`pnpm dlx --package @lhci/cli@0.15.1 --package puppeteer@24 lhci autorun …`).
- [ ] T021 [US3] Push and read the CI report: checkout's LCP element should now be the order form (not the empty-cart message) with LCP < 2.5 s, and the other three pages must stay within budget with the cart item present. Then do T015 (flip the gate to error).

## Phase 7: Polish & cross-cutting

- [ ] T017 Full gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, API e2e, `pnpm build`, and the browser suite on the production build (one worker), including `csp.e2e.ts` (zero violations, CSP unchanged: FR-005) and `accessibility.e2e.ts` (zero serious/critical: FR-006). Confirm no new dependency in any `package.json` (FR-007).
- [ ] T018 Record the "after" CI measurements in the `docs/PHASE-1.md` table from T001 (FR-009). Tick spec 009 T010 in `specs/009-launch-readiness/tasks.md` with a pointer to this spec, and update the "Page speed (open)" line in `docs/PHASE-1.md`.
- [ ] T019 Review: diff against the plan, the screenshots from T005 shown to the owner, and the checklist in `specs/010-page-speed/checklists/requirements.md`.

## Dependencies & Strategy

- T001 → Phase 2 (T002 → T003 → T004 → T005) → stories.
- US1, US2 and US3 are independent of each other once Phase 2 is done (different pages and files), and are only needed if a page still misses its budget after Phase 2.
- US4 (T015–T016) comes after every page passes. Flipping the gate first would turn CI red.
- **MVP**: Phase 2 alone. Research R1 suggests the font fallback fix removes most of the 1.5–2.8 s render delay seen on every page, so it may be enough for all three pages. Then T015–T018.
- Parallel: T009 and T012 (diagnosis on different pages) can run together with T006. Fixes T007/T010/T013 touch different files and can run together after diagnosis.
