---
description: "Tasks for Slice 7 — Dashboard, reports & settings"
---

# Tasks: Slice 7 — Dashboard, reports & settings

**Input**: `specs/008-dashboard-reports/` (spec, plan, research, data-model, contracts)

**Tests**: Requested — shared unit tests, API e2e per endpoint, TesterArmy browser e2e per story. Workflow: Claude briefs → implementer (agy when it has quota, otherwise OpenCode free models via `.agents/skills/serag-engineering/scripts/opencode-relay.sh`) → Claude reviews, runs gates + `pnpm test:e2e` on isolated servers, checks the browser → commit + push on `008-dashboard-reports` when the user asks. Branches are never deleted.

## Phase 1: Foundational — shared modules

- [x] T001 [P] `packages/shared/src/reports.ts` + `reports-schema.ts`: preset → `{ from, to }` in Cairo (today, 7d, 30d, 90d, this_month, last_month, custom ≤ 366 days), bucket keys for day/week (Saturday start)/month, `fillBuckets`, AOV and percentage helpers (one decimal), proportional discount split with largest-remainder rounding (splits sum to the total), report row types, CSV row builders (pounds with two decimals); tests
- [x] T002 [P] `packages/shared/src/dashboard.ts`: counter ids, labels keys, admin link + required permission per counter, `DashboardSummary` type, previous-period helper; tests
- [x] T003 [P] `packages/shared/src/settings.ts` + `settings-schema.ts`: section ids, per-section schemas (store info with Egyptian/international phone rule and placeholder warnings, payments ≥ 1 enabled, zones with one zone per governorate, COD deposit threshold > 0 and pct 1–100, lowStock default 0–999, synonyms groups, templates non-empty ≤ 1000 with `TEMPLATE_VARIABLES` per key), `renderTemplatePreview(template, sample)`, `unknownTemplateVariables`; tests

## Phase 2: User Story 1 — Dashboard (P1) 🎯

- [x] T004 [US1] API `admin-dashboard`: `GET /admin/dashboard/summary?range=` — seven counters (filtered by the caller's permissions) + dense Cairo-day series of revenue (delivered by delivery event), delivered orders and deposits, totals and previous-period totals; grouped SQL, no N+1; API e2e (counts match seeded data, delivered order lands on its delivery day, deposit separate, permission filtering)
- [x] T005 [US1] Filters the counters link to: orders list `?status=new|awaiting_payment|awaiting_deposit` (exists) and new `?lockExpiring=7` for bridal; products `?stock=low` (exists); reviews `?tab=pending`; notify page filter «جاهزة للإرسال»; verify each link lands on the matching list (API + web)
- [x] T006 [US1] Web «نظرة عامة»: counters grid (calm state at zero, hidden without permission), 7/30/90 switch, `AdminChartLine`/`AdminChartBar` SVG charts with table alternative, totals vs previous period; keep the welcome header, merge the existing pending-reviews and expiring-locks cards into counters; i18n; 375 px
- [x] T007 [US1] TesterArmy: seed one item per counter → counts and links; deliver an order → today's revenue includes it; deposit appears in the deposits series

## Phase 3: User Story 2 — Reports (P1)

- [x] T008 [US2] API `admin-reports`: revenue, splits, best-sellers, coupons, flash-sales, bridal-funnel, repeat-customers per `reportQuerySchema`; CSV export endpoint per report (BOM, Arabic headers, formula-safe cells via `common/csv-cell.ts`, Cairo dates); `reports.read`; no phones/addresses; API e2e with seeded orders (splits sum to total, empty buckets zero, coupon/flash/bridal/repeat numbers, CSV headers + BOM, 403 without permission)
- [x] T009 [US2] Web `/admin/reports` (existing nav entry G T): period presets + custom range, groupBy, tabs per report (`?tab=`), tables + charts, export buttons, empty states; i18n; 375 px
- [x] T010 [US2] TesterArmy: seeded delivered orders → revenue/splits/best sellers/coupon/flash/bridal funnel/repeat match; export downloads a CSV with the same total

## Phase 4: User Story 3 — Settings (P1)

- [ ] T011 [US3] API `admin-settings`: `GET /admin/settings`, `PUT /admin/settings/:section` (Zod per section, version check → 409 with latest, audit with phones masked), `POST /admin/settings/templates/preview`; new `lowStock` key used as the default threshold when creating products; readers (checkout settings, store info, search synonyms, WhatsApp builders, COD deposit rule) use saved values on the next request; API e2e (validation per section, 409 on stale version, audit row, checkout reflects a disabled method and a new zone fee, template with unknown variable 400)
- [ ] T012 [US3] Web `/admin/settings` (existing nav entry G S): sections store info, WhatsApp, payments, zones (places: governorate from `EGYPT_GOVERNORATES` + optional city, fee), COD deposit, low-stock default, synonyms (group editor), templates (variable chips, live preview); per-section save with changed markers, field errors, conflict dialog (shadcn) offering to load the latest; links to bridal settings and the quiz editor; i18n; 375 px
- [ ] T013 [US3] Storefront wiring: `useStoreSettings` loads `GET /settings/store` (replaces its placeholders TODO) so footer/header phone and WhatsApp use saved values; verify `/traders`, checkout methods/fees and LocalBusiness pick up changes within a minute
- [ ] T014 [US3] TesterArmy: change store phone + traders WhatsApp → footer and `/traders`; disable a payment method → checkout hides it; zone fee change → checkout fee; template edit → preview and order WhatsApp text; stale save → conflict dialog; restore original settings afterwards

## Phase 5: Polish

- [ ] T015 English + 375/320 px pass on the three pages, keyboard use of tabs/charts/forms, chart table alternatives, hydration check
- [ ] T016 Docs: `docs/PHASE-1.md` Slice 7; README roadmap; tick umbrella T080–T083
- [ ] T017 Review: permissions (counters, reports, exports, settings), CSRF/audit on settings, no PII in reports/CSV, CSV formula safety, settings validation edge cases, performance with a large seeded dataset (20k orders) against SC-006

## Dependencies & Strategy

- Phase 1 blocks all. Phases 2–4 are independent after Phase 1 (dashboard, reports and settings touch different modules); T013 depends on T011.
- Chunks: A = T001–T003, B = T004–T007, C = T008–T010, D = T011–T014, E = T015–T017.
