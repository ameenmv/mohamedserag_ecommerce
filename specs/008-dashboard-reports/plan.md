# Implementation Plan: Slice 7 — Dashboard, reports & settings

**Branch**: `008-dashboard-reports` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

## Summary

Turn «نظرة عامة» into a real morning overview (seven action counters linking to filtered pages, revenue / delivered orders / deposits charts for 7/30/90 days), add `/admin/reports` (revenue over time, splits, best sellers, coupons, flash sales, bridal funnel, repeat customers, CSV export of each) and `/admin/settings` (store info, WhatsApp numbers, payment methods, delivery zones, COD deposit rule, low-stock default, search synonyms, WhatsApp templates) with server validation, optimistic concurrency and audit. No new tables: everything is computed from existing orders, order events, payments, bridal lists, reviews, notify requests and products, and settings stay in the `settings` key–value table.

## Technical Context

**Language/Version**: TypeScript (strict), Node 24
**Primary Dependencies**: Nuxt 4, @nuxtjs/i18n, shadcn-vue, Tailwind 4; NestJS 12, Prisma 7 (raw SQL via `$queryRaw` for grouped report queries); Zod 4 in `@serag/shared`. **No new dependencies**: charts are small SVG components (the prototype draws its overview chart in SVG), CSV reuses the existing orders-export helpers (`common/csv-cell.ts`: BOM, formula-safe cells).
**Storage**: PostgreSQL. Delivery day = time of the order's latest `delivered` event (`order_events.status = 'delivered'`); deposits = confirmed `payments` on orders with `deposit_amount` set or `type = 'bridal'`; all bucketing in `Africa/Cairo` with `date_trunc` (weeks starting Saturday). Settings: one row per section in `settings` (`key`, `value` json, `updated_at` used as the version).
**Testing**: Vitest unit (shared report math, bucketing, CSV rows, settings schemas, template variable checks), API e2e (`apps/api/test`), TesterArmy browser e2e (`tests/e2e`).
**Performance Goals**: overview ≤ 2 s and a 90-day report ≤ 2 s with 20,000 orders — grouped SQL per report (no N+1), indexes added only if a query plan needs them (orders `(status)`, order_events `(status, at)`).
**Constraints**: reports never return customer phones or addresses; settings changes need `settings.manage` + CSRF + audit (phones masked); settings take effect within one minute (public settings endpoints read fresh values; Nuxt SWR caches stay ≤ 60 s); money in piastres; ar + en UI; 375 px admin.

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I One stack | No new libraries; SVG charts and existing CSV helpers | ✅ |
| II Arabic RTL, Egyptian voice | All new UI ar + en; validation messages Egyptian Arabic | ✅ |
| III One brand system | Overview follows the prototype; admin tokens and shadcn components | ✅ |
| IV API-first, permission-checked | `reports.read`, `settings.manage`, per-counter permission filtering; Zod schemas in shared | ✅ |
| V Accessible, fast, mobile-first | Charts have table alternatives; keyboard tabs; 375 px; grouped queries | ✅ |
| VI WhatsApp is the channel | Templates editable with variable checks and live preview | ✅ |

## Project Structure

```text
packages/shared/src/
├── reports.ts            # ReportPeriod/grouping types, presets → date range (Cairo), bucket keys, AOV/percent math, CSV row builders
├── reports-schema.ts     # reportQuerySchema (preset | from/to ≤ 366 days, groupBy)
├── dashboard.ts          # DashboardSummary types, counter ids → admin link + permission
├── settings.ts           # StoreInfo/Whatsapp/Payments/Zones/CodDeposit/LowStock/Synonyms/Templates types, TEMPLATE_VARIABLES per template
└── settings-schema.ts    # one Zod schema per section (+ cross-field rules: one zone per governorate, ≥ 1 payment method, template variables)

apps/api/src/
├── admin-dashboard/      # GET /admin/dashboard/summary?range=7|30|90 (counters filtered by permission + series)
├── admin-reports/        # GET /admin/reports/:report (+ .csv) — revenue, splits, best-sellers, coupons, flash-sales, bridal-funnel, repeat-customers
└── admin-settings/       # GET /admin/settings, PUT /admin/settings/:section (version check, audit), template preview helper

apps/web/
├── app/pages/admin/index.vue                       # overview: counters + charts (existing cards kept/merged)
├── app/pages/admin/reports.vue                     # tabs per report, period picker, export buttons
├── app/pages/admin/settings.vue                    # sections (tabs or anchored cards), each with its own form + save
├── app/components/admin/dashboard/AdminDashboard*  # counters grid, range switch, charts
├── app/components/admin/reports/AdminReports*      # period picker, tables, charts
├── app/components/admin/settings/AdminSettings*    # one form component per section
├── app/components/admin/charts/AdminChart{Line,Bar}.vue  # small SVG charts with table fallback
└── app/composables/useAdminDashboard.ts, useAdminReports.ts, useAdminSettings.ts
```

## Delivery chunks (see tasks.md)

- **A** shared reports/settings/dashboard modules + tests.
- **B** dashboard API + overview page + filters the counters link to.
- **C** reports API (+ CSV) + reports page.
- **D** settings API + settings page; storefront/checkout read the new settings.
- **E** browser e2e, English/320 px pass, docs, security review.
