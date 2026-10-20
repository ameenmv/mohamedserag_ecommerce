# API Contracts: Slice 7 — Dashboard, reports & settings

Base URL ends in `/api`. Types live in `@serag/shared` (`dashboard.ts`, `reports.ts`, `settings.ts`). Errors use `{ statusCode, message, errors? }` with Egyptian Arabic messages.

## Dashboard (`@AnyAdmin()`; counters filtered by permission)

| Method & path | Response | Notes |
|---|---|---|
| `GET /admin/dashboard/summary?range=7\|30\|90` | `DashboardSummary` | default 30; counters the admin cannot open are omitted |

## Reports (`reports.read`)

| Method & path | Response | Notes |
|---|---|---|
| `GET /admin/reports/revenue?preset=&from=&to=&groupBy=` | `RevenueReport` | `preset` ∈ today, 7d, 30d, 90d, this_month, last_month; or `from`/`to` (YYYY-MM-DD, ≤ 366 days); `groupBy` day/week/month |
| `GET /admin/reports/splits?…` | `SplitsReport` | |
| `GET /admin/reports/best-sellers?…` | `{ items: BestSellerRow[] }` | top 50 |
| `GET /admin/reports/coupons?…` | `{ items: CouponReportRow[] }` | |
| `GET /admin/reports/flash-sales?…` | `{ items: FlashSaleReportRow[] }` | |
| `GET /admin/reports/bridal-funnel?…` | `BridalFunnelReport` | |
| `GET /admin/reports/repeat-customers?…` | `RepeatCustomersReport` | counts only |
| `GET /admin/reports/:report/export?…` | `text/csv; charset=utf-8` with BOM, `Content-Disposition: attachment; filename="serag-<report>-<from>-<to>.csv"` | same query; formula-safe cells |

## Settings (`settings.manage`; CSRF on PUT; `@Audit('settings')`)

| Method & path | Body → Response | Notes |
|---|---|---|
| `GET /admin/settings` | → `{ sections: Record<SettingsSection, { value, version, warnings: string[] }> }` | `version` = row `updated_at` ISO or null; warnings for placeholders / legacy values |
| `PUT /admin/settings/:section` | `{ value, version }` → `{ value, version, warnings }` | 400 field errors; 409 «الإعدادات اتغيرت من مكان تاني» + `{ latest: { value, version } }` when the version is stale |
| `POST /admin/settings/templates/preview` | `{ key, template }` → `{ text, unknownVariables: string[] }` | renders with sample values |

Existing public readers (`GET /settings/checkout`, `GET /settings/store`, search, checkout quote, WhatsApp message builders) keep their shapes and read the saved values.
