# Tasks: Admin Dashboard

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Phase 1: Setup
- [x] T001 Remove the old prototype files in `admin/` (already deleted in the working tree) and create `admin/assets/pages/`

## Phase 2: Foundation (blocks every story)
- [x] T002 `admin/assets/admin.css` — tokens (light/dark), shell layout, cards, chips, tables, forms, switches, toast, palette, print rules, 375px rules
- [x] T003 `admin/assets/seed.js` — orders, products (from `config.js` CATALOG), traders, customers, CMS content + versions, settings (zones from `SERAG.zones`)
- [x] T004 `admin/assets/store.js` — `SeragStore` with `orders/products/traders/customers/cms/settings` collections, persistence, storefront order bridge, change events, reset
- [x] T005 `admin/assets/shell.js` — sidebar with live badges, header search → palette, mobile drawer, command palette, `g`+key shortcuts, theme toggle, toast, `fmt`/`esc`/`csv` helpers

## Phase 3: US1 Overview (P1)
- [x] T006 [P] `admin/index.html` + `pages/overview.js` — hero with live counts, KPI cards with sparklines, revenue chart 7/30/90, channels donut, recent orders, top products

## Phase 4: US2 Orders (P1)
- [x] T007 [P] `admin/orders.html` + `pages/orders.js` — status filters with counts, search, list, detail, timeline, advance/cancel, CSV export, print invoice, storefront order highlight

## Phase 5: US3 Products (P1)
- [x] T008 [P] `admin/products.html` + `pages/products.js` — stats, category chips, search, table with stock bars and visibility switch, editor with live card preview, flash toggle, add/save/delete

## Phase 6: US4 CMS (P2)
- [x] T009 [P] `admin/cms.html` + `pages/cms.js` — section list (reorder/hide), field editor with change markers and reset, live preview desktop/mobile, JSON tab, publish/discard, version history restore

## Phase 7: US5 Customers (P2) — written directly (agy headless run was denied write permission)
- [x] T010 [P] `admin/customers.html` + `pages/customers.js` — traders tab (credit limit chips, approve/reject), customers table with tiers

## Phase 8: US6 Settings (P3) — written directly (agy headless run was denied write permission)
- [x] T011 [P] `admin/settings.html` + `pages/settings.js` — store info, zones + payments switches, team roles, palette preview, reset demo data

## Phase 9: Polish
- [x] T012 Review agy output against the brief and constitution — agy reviewed `pages/customers.js` (a11y labels, 44px targets, focus after re-render, deep-link highlight, sortable columns); reviewed and browser-tested, accepted as is
- [x] T013 Check every page in the browser at desktop (1024) and 375, light and dark, with no console errors
