# Feature Specification: Launch readiness

**Feature Branch**: `009-launch-readiness`
**Created**: 2026-10-20
**Status**: Draft
**Input**: Phase 1 umbrella T090–T092 (PRD §7 non-functional requirements, §11 KPIs, §13 open questions) plus the throttling issue found in Slice 7: every server-rendered page reaches the API from the web server's address, so all visitors share one rate-limit budget.

## Overview

All seven Phase 1 slices are built. Before the store goes live, the site must hold up under real traffic, protect visitors and data, meet its speed and accessibility targets on the pages customers actually use, survive a lost server, and be deployable by following written steps. The parts that need the owner (real numbers, domain, server) are collected in one checklist so nothing blocks on guesswork.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Every visitor gets their own request budget (Priority: P1)

A busy evening brings many shoppers at once. Each shopper's page views count against their own limit, so one heavy user (or a bot) gets slowed down while everyone else browses normally, and nobody can dodge their limit by faking a header.

**Why this priority**: Today the store would start failing pages (missing data, hidden contact links) at roughly two page renders a second across all visitors. That is a launch blocker.

**Independent Test**: Simulate two visitors through the web server: each gets the full budget independently; a visitor sending a fake "forwarded for" header is still counted under their real address.

**Acceptance Scenarios**:

1. **Given** two visitors from different addresses, **When** each loads pages, **Then** each is limited separately and one visitor reaching the limit does not affect the other.
2. **Given** a visitor who sends a made-up forwarding header, **When** they exceed the limit, **Then** they are limited under their real address.
3. **Given** the admin portal and public pages rendered on the server, **When** the API applies limits (login, checkout, reviews, notify-me, quiz), **Then** those limits apply per visitor, not per web server.

---

### User Story 2 — The site is hardened and recoverable (Priority: P1)

The owner wants the site to resist common web attacks and to come back after a disaster with at most a day of data lost.

**Why this priority**: PRD §7 requires HTTPS only, security headers, daily backups kept 30 days, and observability. Losing orders or being framed by a phishing page would hurt trust at launch.

**Independent Test**: Request the home, a product page, the admin login and an API route through the production proxy and check the response headers; run a backup, restore it into an empty database and compare row counts; stop the API and see the uptime check report it.

**Acceptance Scenarios**:

1. **Given** any page through the production proxy, **Then** responses carry HSTS, no-sniff, a referrer policy, a frame-ancestors restriction (no framing by other sites), a permissions policy, and a content security policy that allows only the site's own scripts, styles, fonts, images and analytics.
2. **Given** the CSP, **When** every main journey runs (browse, search, product, cart, checkout, thank-you, bridal builder, admin), **Then** no CSP violations appear in the browser console.
3. **Given** the production stack, **Then** a database backup runs daily, backups older than 30 days are removed, and a documented restore into a fresh database succeeds with matching order, product and settings counts.
4. **Given** the API or web is down, **Then** the health endpoints and an uptime check reveal it, and API errors are logged in a structured form with a request id and no customer phone numbers.

---

### User Story 3 — Fast and accessible on the pages that sell (Priority: P1)

A shopper on a mid-range Android phone over 4G opens the home, a category, a product and checkout. Each page shows its main content quickly, does not jump around, and works with a keyboard or screen reader.

**Why this priority**: PRD §7 sets LCP < 2.5 s, CLS < 0.1, WCAG 2.2 AA and a home JS budget; Slice 1 left the home LCP at ≈ 4.2 s locally as a known follow-up.

**Independent Test**: Lighthouse (mobile, 375 px) in CI against home, a category, a product page and checkout through the production proxy; an automated accessibility scan of the main public and admin pages.

**Acceptance Scenarios**:

1. **Given** the CI Lighthouse run on home, category, product and checkout, **Then** each meets performance ≥ 0.9, accessibility = 1, LCP < 2.5 s, CLS < 0.1, and no console errors.
2. **Given** the home page, **Then** its JavaScript is under 200 KB gzipped and images are served as AVIF/WebP in responsive sizes with lazy loading below the fold.
3. **Given** an automated accessibility scan of the main public pages and the admin overview, orders, reports and settings, **Then** there are no serious or critical violations, and keyboard focus is visible throughout.

---

### User Story 4 — Confidence the whole store works (Priority: P2)

Before launch the team runs every journey at desktop, tablet-phone and small-phone widths and confirms the KPI events reach analytics.

**Why this priority**: Each slice was tested on its own; launch needs one regression pass across all of them and proof the KPI funnel can be measured.

**Independent Test**: The browser suite runs at 1280, 375 and 320 px in CI; an exploratory run walks the main journeys; a checkout in the production stack shows `checkout_start` and `order_placed` in analytics.

**Acceptance Scenarios**:

1. **Given** the full browser suite, **When** run at 1280, 375 and 320 px, **Then** every journey passes with no horizontal page scroll.
2. **Given** the production stack with analytics, **When** a shopper views a product, adds to cart, starts checkout and places an order, **Then** `product_view`, `add_to_cart`, `checkout_start` and `order_placed` appear in analytics without any phone number or name.

---

### User Story 5 — Go live by following the steps (Priority: P2, partly owner-dependent)

The owner (or whoever deploys) follows a written runbook to set up the server, domain and HTTPS, load real store data, and switch indexing on.

**Why this priority**: The deploy itself needs the owner's server and domain; everything else (runbook, checklist, scripts) can be ready now.

**Independent Test**: Follow the runbook on a clean machine with Docker to bring up the production stack, restore a backup, set store data from «الإعدادات», and pass the launch checklist except items marked as owner input.

**Acceptance Scenarios**:

1. **Given** the runbook, **Then** it covers server prerequisites, environment variables (with which are secrets), first deploy, migrations and seed, HTTPS via the domain, backups and restore, updating to a new version, and rollback.
2. **Given** the launch checklist, **Then** each PRD §13 open question that affects launch (store hours and address, real WhatsApp and payment numbers, Fawry, delivery cities per zone, installment threshold, domain, analytics choice, cookie banner, returns policy review, product photos) is listed with where it is set in the admin or config, and its status.
3. **Given** a fresh database, **When** the owner has not yet entered real data, **Then** the admin overview shows a clear warning listing the placeholder store details, and the storefront keeps hiding contact links that would point at placeholder numbers.

### Edge Cases

- A visitor behind a shared address (mobile carrier NAT) shares that address's budget; limits must stay generous enough for normal browsing (only abuse-prone actions keep tight limits).
- Requests that reach the web server without the trusted proxy (direct to the container) must not be able to choose their counted address.
- CSP must allow the analytics script, uploaded images, the TipTap editor and image previews in the admin, and inline styles that Vue/Nuxt inject; anything broader is a regression.
- Backups must not fill the disk: rotation keeps 30 days; a failed backup is visible.
- Lighthouse in CI runs against seeded data, so product/category URLs used for the budget must exist in the seed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Server-side calls from the web app to the API MUST carry the visitor's address derived only from the trusted proxy hop (never from a client-supplied value), and the API MUST count rate limits per that visitor address.
- **FR-002**: The trust boundary MUST be explicit and documented: production (proxy → web → API) and development (web → API) both resolve the correct visitor address; direct requests to the web server without the proxy are counted under their connection address.
- **FR-003**: The temporary throttling exemption on the public store-details endpoint MAY stay (cheap read) but MUST be justified in code; no other endpoint is exempted.
- **FR-004**: Production responses MUST include HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'` (or equivalent `X-Frame-Options: DENY`), a `Permissions-Policy` disabling unused features, and a Content-Security-Policy limited to the site's own origin plus the analytics path; the CSP MUST produce no violations on the main journeys.
- **FR-005**: The production stack MUST run a daily database backup (compressed, timestamped), keep 30 days, report failures in logs, and document a restore that is verified by comparing counts.
- **FR-006**: The API MUST log errors in a structured format with a request id, method, path and status, without phone numbers, addresses or tokens; health endpoints for API and web MUST be suitable for an external uptime check.
- **FR-007**: Lighthouse CI MUST assert the PRD budgets on home, one category, one product page and checkout (mobile, 375 px) through the production proxy.
- **FR-008**: The home page MUST load under 200 KB of gzipped JavaScript and reach LCP < 2.5 s in CI; images MUST use modern formats, explicit sizes and lazy loading below the fold.
- **FR-009**: An automated accessibility check MUST run in the browser suite on the main public pages and key admin pages with zero serious/critical violations.
- **FR-010**: The browser suite MUST run at 1280, 375 and 320 px in CI (at least the journey specs), and KPI events MUST reach analytics without personal data.
- **FR-011**: A deploy runbook and a launch checklist MUST exist in `docs/`, covering FR-005 restore, environment and secrets, HTTPS/domain, updates and rollback, and every launch-relevant PRD §13 item with its owner status.
- **FR-012**: The admin overview MUST warn while store details are still placeholders (listing which), linking to «الإعدادات».

### Key Entities

- **Visitor address**: the client IP as seen by the trusted proxy; used only for rate limiting and spam handling, never displayed.
- **Backup**: a compressed, timestamped database dump with a 30-day retention.
- **Launch checklist item**: an owner question or setting, where it is set, status (done / waiting on owner).

## Success Criteria *(mandatory)*

- **SC-001**: With 20 simulated visitors each loading 10 pages within a minute, no visitor receives a rate-limit error; a single visitor exceeding the per-visitor limit is limited without affecting the others.
- **SC-002**: A securityheaders-style check of the production stack shows all FR-004 headers, and the main journeys log zero CSP violations.
- **SC-003**: A backup restored into an empty database matches the source row counts for orders, products, settings and users.
- **SC-004**: Lighthouse CI passes on all four budget pages (performance ≥ 0.9, accessibility 1, LCP < 2.5 s, CLS < 0.1).
- **SC-005**: The browser suite passes at 1280, 375 and 320 px, and the accessibility scan reports zero serious/critical violations.
- **SC-006**: Someone who has not worked on the project can deploy the stack on a clean Docker host from the runbook in under an hour (excluding DNS propagation).

## Assumptions

- Production topology is the existing compose stack: Caddy (TLS, one proxy hop) → web and API containers on a private network.
- Umami stays the analytics tool (PRD §13 item 7 recorded as decided unless the owner says otherwise); no ad pixels, so no cookie banner is needed (item 8).
- The owner provides real data later through «الإعدادات»; this slice does not invent store numbers.
- Error tracking uses structured logs plus the uptime check; a hosted error tracker (e.g. Sentry) is out of scope unless the owner chooses one.
- The VPS provider and domain are the owner's choice; the runbook stays provider-neutral.

## Out of Scope

- Phase 2 features (accounts, loyalty, PWA, WhatsApp Cloud API, e-receipts, roles UI).
- Writing the returns policy text or taking product photos (owner tasks tracked in the checklist).
