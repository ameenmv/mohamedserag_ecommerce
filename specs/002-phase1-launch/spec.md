# Feature Specification: Phase 1 Launch

**Feature Branch**: `002-phase1-launch`
**Created**: 2026-10-16
**Status**: Draft — plan under review
**Input**: Phase 1 scope of [docs/PRD.md](../../docs/PRD.md) (v1.1), epics E1–E13.

The PRD is the source of truth for every user story and acceptance criterion. This spec fixes the **scope, priority order and independent test** for each slice so the plan and tasks can be built and verified one slice at a time. Story IDs (US-x.y) refer to the PRD.

## User Scenarios & Testing

Slices are ordered so each one is shippable on top of the previous ones and testable on its own with the `e2e` runner.

### Slice 0 — Foundation (Priority: P0, blocks everything)
Monorepo, Nuxt 4 web app with brand theme, NestJS API, PostgreSQL via Prisma, seed data from the prototype, admin login with permission guard, Docker Compose, CI with lint/typecheck/unit/e2e.

**Independent Test**: `docker compose up` brings web, api and db up; `/` renders the RTL brand shell; `/admin` redirects to login; logging in with the seeded admin shows the empty dashboard; `npx e2e run` passes the smoke suite.

### Slice 1 — Catalog & discovery (P1) — US-1.1 to US-1.5, US-2.1 to US-2.4, US-3.1
Shoppers browse categories and brands, open product pages with specs, warranty and delivery cost, search with Arabic-aware matching, filter, sort, compare up to 3 and save to wishlist. Admin manages categories, brands, spec templates and products (with CSV import).

**Independent Test**: search «تلاجه» finds fridges; filtering a category by brand and price updates the URL and results; compare shows three fridges side by side; a product created in the admin appears on the site.

**Acceptance Scenarios**:
1. **Given** a product with old price > price, **When** its page opens, **Then** price, old price, % off and «الأسعار شاملة ضريبة القيمة المضافة» are shown.
2. **Given** search text with Arabic-Indic digits «٤٥٠», **When** searching, **Then** 450 L fridges are found.

### Slice 2 — Cart, checkout & payments (P1) — US-5.1 to US-5.5, US-6.1 to US-6.3, US-7.1, US-7.2, US-3.3
Real cart, guest checkout with zone by governorate + city, order creation, thank-you page with public token, WhatsApp proof, one-tap admin confirm link, large-COD deposit, status flow, stock movements, prefilled WhatsApp updates, admin orders page.

**Independent Test**: add two products → checkout with a Mansoura address and InstaPay → thank-you page shows the order and a WhatsApp proof link → opening the confirm link as admin and confirming moves the order to «مؤكد» and deducts stock.

**Acceptance Scenarios**:
1. **Given** a COD cart above 30,000 ج.م, **When** checking out, **Then** a 10% transfer deposit is explained and the order starts at «بانتظار العربون».
2. **Given** an order at «الدفع مرفوض», **When** the admin confirms a new proof from the same link, **Then** it becomes «مؤكد».
3. **Given** `/order/:no/thanks` without the right token, **Then** no order data is shown.

### Slice 3 — Bridal builder (P1, signature) — US-4.1 to US-4.6, US-12.5
Tiers, room-by-room editing, edit/share tokens, WhatsApp share, reservation with deposit and price lock (prices + delivery fee), partial deposit payments, lock expiry, extend/re-price, agreed delivery date reserving stock.

**Independent Test**: choose «ذهبية» → swap the fridge → share link opens read-only → reserve → admin confirms two partial transfers reaching 10% → lock starts with an end date → catalog price change does not change the reservation total.

### Slice 4 — Promotions & stock alerts (P1) — US-8.1 to US-8.3, US-3.2
Old price, flash sales with countdown and automatic revert, coupons with eligibility rules and redemptions, notify-me lists.

**Independent Test**: a flash sale ending in 1 minute shows a countdown and reverts the price after it ends; a coupon is rejected on a flash-sale item and accepted on a regular item.

### Slice 5 — Reviews (P1) — US-9.1, US-9.2
Submit, moderate, verified-buyer tag, unpublish.

**Independent Test**: submitted review is invisible until approved; after approval it appears and changes the average rating.

### Slice 6 — Content, CMS & SEO (P1) — US-11.1 to US-11.5, US-2.5, US-10.1
Homepage sections with draft/preview/publish/versions, pages, guides blog, landing pages, structured data, sitemap, Google Merchant feed, traders section, Help-me-choose quiz.

**Independent Test**: edit the hero in the admin, preview, publish → the homepage shows the new text; `/feeds/google.xml` validates; the fridge quiz returns 3 products with reasons.

### Slice 7 — Admin dashboard, reports & settings (P1) — US-12.1 to US-12.10
Dashboard counters and charts, reports with CSV export, all settings.

**Independent Test**: after placing and delivering a seeded order, the dashboard and the revenue report include it; deposits appear separately.

### Edge Cases
See the acceptance criteria in the PRD; in particular: out-of-stock items inside bridal lists, price changes between cart and checkout, rejected payments, expired locks, coupons on cancelled orders, tokens guessed or forwarded.

## Requirements

### Functional Requirements
- **FR-001**: Everything listed as P1 in docs/PRD.md §4 and §6, and nothing listed as P2.
- **FR-002**: Every slice ships with e2e tests for its independent test and acceptance scenarios.
- **FR-003**: Every admin endpoint checks a permission key.
- **FR-004**: Customer-facing copy in Egyptian Arabic, RTL.

### Key Entities
As in docs/PRD.md §9.

## Success Criteria
- **SC-001**: All slice independent tests pass in CI on every merge to main.
- **SC-002**: Lighthouse mobile on `/`, a category page and a product page: performance ≥ 90, accessibility = 100, LCP < 2.5 s, CLS < 0.1.
- **SC-003**: A guest can go from product page to placed order in under 90 seconds (scripted e2e timing).
- **SC-004**: No P2 feature is built.

## Assumptions
- Real store data (numbers, tier contents, zone city lists, Fawry method) arrive before Slice 2/3 go live; placeholders are used until then (PRD §13).
- One admin user at launch.
