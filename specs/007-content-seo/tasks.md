---
description: "Tasks for Slice 6 — Content, CMS & SEO"
---

# Tasks: Slice 6 — Content, CMS & SEO

**Input**: `specs/007-content-seo/` (spec, plan, research, data-model, contracts)

**Tests**: Requested — shared unit tests, API e2e per endpoint, TesterArmy browser e2e per story. Workflow: Claude briefs → implementer (agy when it has quota, otherwise OpenCode free models via `.agents/skills/serag-engineering/scripts/opencode-relay.sh`) → Claude reviews, installs dependencies, runs gates + `pnpm test:e2e` on isolated servers, checks the browser → commit + push on `007-content-seo` when the user asks. Branches are never deleted.

## Phase 1: Foundational — shared schemas, sanitizer, migration

- [x] T001 [P] `packages/shared/src/content.ts` + `content-schema.ts`: section ids, field metadata (label key, kind, max), `HomeContent`/`HomeLayout`/`PublicHome`/`AdminHomeState` types, defaults (= seed), `countHomeChanges(draft, published)`, safe link/image rules, `pageInputSchema`, `guideInputSchema`; tests
- [x] T002 [P] `packages/shared/src/quiz.ts` + `quiz-schema.ts`: types, `quizDefinitionSchema`, pure `scoreQuiz` (rules, unsure, ties by popularity, fallback, reason = top matched rule); tests
- [x] T003 [P] `packages/shared/src/seo.ts`: `canonicalPath`, breadcrumb builders, `buildLocalBusiness(store)` with placeholder detection, sitemap entry type; `analytics.ts` + `'quiz_completed'`; tests
- [x] T004 Claude: install `sanitize-html` (+ `@types/sanitize-html`) in `apps/api` and TipTap packages in `apps/web`; migration `guides.summary`; `apps/api/src/common/rich-text.ts` (pages / guides allowlists) + unit tests (scripts, handlers, styles, `javascript:`/`data:` URLs, external links get `rel`/`target`)

## Phase 2: User Story 2 + 1 — Homepage CMS (P1) 🎯

- [x] T005 [US1/US2] API `content` (public `GET /content/home` with defaults fallback) + `admin-content` home: draft upsert, publish (transaction, prune to 20), discard, versions, restore, content image upload; `content.manage` + CSRF + audit; API e2e
- [x] T006 [US1] Web CMS home: `pages/index.vue` (thin) + `components/store/home/StoreHome*` per section (from the prototype look), hidden/empty sections skipped, flash + guides + partners from live data, `routeRules['/'] = { swr: 60 }`; i18n; 320 px
- [x] T007 [US2] Web admin «محرر الموقع» `/admin/content` (existing nav entry, G E; accessible tabs `?tab=home|pages|guides|quiz`, home tab in this task): sections list (reorder, show/hide), field editor with changed markers + reset, image upload, desktop/mobile preview (reuses the storefront section components), publish bar (count, Ctrl/⌘+Enter), discard with undo toast, versions list + restore; i18n; shadcn dialogs only
- [x] T008 [US1/US2] TesterArmy: edit hero title → preview only → publish → `/` shows it; hide traders + reorder → publish → order/visibility on `/`; restore previous version → publish; empty flash section omitted

## Phase 3: User Story 3 — Pages and traders (P1)

- [x] T009 [US3] API public `GET /pages`, `GET /pages/:slug`; admin pages list/get/patch with sanitizing; seed keeps the six pages; API e2e (unpublished 404, script/handler/style stripped, link rel)
- [x] T010 [US3] Web `/pages/[slug]` (prose styles, SEO fields, 404), footer links from `GET /pages`, `/traders` (texts from home traders section + store WhatsApp numbers, fallback to main), admin pages tab (`/admin/content?tab=pages`) list + editor with `AdminRichTextEditor` (TipTap, lazy, allowlist-shaped toolbar); i18n
- [x] T011 [US3] TesterArmy: edit returns policy (bold + list) + SEO title → `/pages/returns`; unpublish FAQ → 404 + footer; `/traders` WhatsApp link target and message

## Phase 4: User Story 4 — Guides (P2)

- [x] T012 [US4] API public guides list/detail (+ products as cards with flash/rating) and admin guides CRUD with slug uniqueness and sanitizing; seed 3 prototype guides with summaries; API e2e
- [x] T013 [US4] Web `/guides`, `/guides/[slug]` (Article JSON-LD), home guides section wired, admin guides tab (`/admin/content?tab=guides`) list + editor (cover upload, categories/products pickers, rich text with images); i18n
- [x] T014 [US4] TesterArmy: create + publish guide → list, home section, detail with 3 product cards; unpublish → 404 and gone from the list

## Phase 5: User Story 5 — Quiz (P2)

- [x] T015 [US5] API quiz: public get + results (loads orderable products with spec values + popularity, calls `scoreQuiz`, throttle), admin list/get/put/delete with spec-template validation and warnings; seed quizzes for refrigerators, washers, tvs, acs; API e2e
- [x] T016 [US5] Web `/help-me-choose/[category]` + entry button on the four category pages (only when a quiz exists), result cards with reasons + «شوف كل النتايج», `quiz_completed` event (no PII); admin quiz tab (`/admin/content?tab=quiz`) editor (questions/answers/rules, field + operator pickers from the spec template); i18n
- [x] T017 [US5] TesterArmy: seeded fridges → answers → expected top product and reason; all «مش متأكد» → popularity order; edit a rule in the admin → ranking changes

## Phase 6: User Stories 6 + 7 — SEO and Merchant feed (P1)

- [x] T018 [US6] Web SEO layer: `useSeoPage` (title, description, canonical via `canonicalPath`, OG, hreflang) applied to home, shop, offers, bridal, traders, category, brand, product, pages, guides; search/listing filters canonicalized; `noindex` kept on private pages; site-wide `LocalBusiness`; `BreadcrumbList` on product/category/brand/guide; `NUXT_PUBLIC_SITE_URL` + `NUXT_PUBLIC_SITE_INDEXABLE` runtime config
- [x] T019 [US6/US7] API `GET /seo/sitemap-entries` and `GET /feeds/google.xml` (in-stock visible products with an image, flash sale price + dates, escaped text, absolute URLs from `PUBLIC_SITE_URL`); API e2e (hidden/archived/out/on-request/no-image excluded, flash fields, XML well-formed)
- [x] T020 [US6/US7] Nuxt server routes `/sitemap.xml` (ar + en alternates, index split > 45k), `/robots.txt` (disallow list, sitemap line, staging `Disallow: /`), `/feeds/google.xml` proxy; `routeRules` `swr: 3600`; tests
- [x] T021 [US6/US7] TesterArmy: sitemap contains/omits the right URLs; robots disallows private paths; filtered listing canonical; product page JSON-LD has Product, Offer, BreadcrumbList (+ AggregateRating after an approved review); feed lists an in-stock product and the flash sale price, omits a hidden one

## Phase 7: Polish

- [ ] T022 English + 320 px pass on every new page and the editor, a11y (editor keyboard use, focus after publish/restore, live regions), hydration check, Lighthouse budget on `/`
- [ ] T023 Docs: `docs/PHASE-1.md` Slice 6; README roadmap; tick umbrella T070–T075
- [ ] T024 Review: security (sanitizer allowlist, upload validation, public endpoints never leak drafts, permissions/CSRF/audit), SEO validation (Rich Results, Merchant feed spec), consistency with spec

## Dependencies & Strategy

- Phase 1 blocks all (T004 installs dependencies before any delegated UI work that imports them).
- US1/US2 (Phase 2) first: it replaces the placeholder home. Phases 3–6 can follow in any order after Phase 2; Phase 6's sitemap needs pages/guides endpoints from Phases 3–4 (it can ship with what exists and grow).
- Chunks: A = T001–T005 (shared + sanitizer + home API), B = T006 (storefront home), C = T007–T008 (editor + home e2e), D = T009–T011 (pages + traders), E = T012–T014 (guides), F = T015–T017 (quiz), G = T018–T021 (SEO + feed), H = T022–T024.
