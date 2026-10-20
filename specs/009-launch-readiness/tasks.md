# Tasks: Launch readiness

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Phase 1: Per-visitor throttling (US1, P1)

- [x] T001 [US1] `apps/web/server/utils/visitor-ip.ts`: derive the visitor IP (last `X-Forwarded-For` entry when the request came through the trusted proxy, else the socket address; strip ports/IPv6 brackets) + unit tests incl. spoofed leading entries
- [x] T002 [US1] Forward the visitor IP as `X-Forwarded-For` on every SSR API call (public `useStoreApi`, catalog/content fetchers, `adminFetch`), alongside the cookie; unit test the header builder
- [x] T003 [US1] API: document the trust boundary in `main.ts` (`trust proxy` 1), confirm `req.ip` and the throttler use it; API e2e: two forwarded IPs get separate budgets, a spoofed leading entry cannot reset a budget; justify the `GET /settings/store` exemption in code
- [x] T004 [US1] TesterArmy: the full suite passes with default parallel workers (no throttling flakes)

## Phase 2: Hardening (US2, P1)

- [ ] T005 [US2] Caddy: HSTS (keep), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options DENY` + `frame-ancestors 'none'`, `Permissions-Policy`, CSP for the web (self scripts/styles/fonts/images/connect, `/stats` analytics, `data:`/`blob:` images where the admin needs them); API keeps helmet
- [ ] T006 [US2] TesterArmy `csp.e2e.ts` against the Docker e2e overlay: main journeys (home, search, product, cart, checkout, thank-you, bridal builder, admin overview/products editor/content editor) with zero CSP violations; header assertions
- [ ] T007 [US2] Backups: compose `backup` service (daily `pg_dump -Fc`, timestamped, 30-day rotation, failure logged), `docker/backup/restore.sh`, a verify script comparing orders/products/settings/users counts after restoring into a scratch database
- [ ] T008 [US2] Observability: JSON logs in production, request id on every request (`X-Request-Id`), structured error log (method, path, status, request id; no phones/addresses/tokens), web and API healthchecks documented for an uptime monitor

## Phase 3: Performance & accessibility (US3, P1)

- [ ] T009 [US3] Measure home, a category, a product and checkout with Lighthouse (mobile) behind Caddy; record LCP element, JS size and opportunities
- [ ] T010 [US3] Fix what the measurement shows (hero/LCP image priority and sizes, font loading, JS splitting, lazy below-the-fold images) until all four pages meet the budgets locally
- [ ] T011 [US3] `lighthouserc.json`: four URLs with the PRD assertions (+ JS size budget on home); CI green
- [ ] T012 [US3] `axe-core` (tests/e2e dev dependency) + `support/a11y.ts` + `accessibility.e2e.ts`: home, category, product, cart, checkout, bridal builder, guides, admin login, overview, orders, products, reports, settings — zero serious/critical; fix what it finds

## Phase 4: Regression & KPIs (US4, P2)

- [ ] T013 [US4] CI viewport matrix for the browser suite (1280, 375, 320) or a viewport fixture that repeats the journey specs; fix failures
- [ ] T014 [US4] Analytics: in the Docker e2e overlay, a product view → add to cart → checkout → order run shows the four KPI events in Umami with no personal data

## Phase 5: Runbook & owner checklist (US5, P2)

- [ ] T015 [US5] `docs/DEPLOY.md`: server prerequisites, env vars (secrets marked), first deploy, migrate + seed, domain + HTTPS, backups and restore, updating, rollback, uptime monitor
- [ ] T016 [US5] `docs/LAUNCH-CHECKLIST.md`: every launch-relevant PRD §13 item with where it is set (admin «الإعدادات», bridal settings, env) and status; mark analytics = Umami and no cookie banner as decided unless the owner objects
- [ ] T017 [US5] Admin overview warning while store details are placeholders (lists fields, links to «الإعدادات»), ar + en; e2e
- [ ] T018 Docs: PHASE-1 status, README; tick umbrella T090–T092 where done (T092 deploy stays open for the owner); review

## Dependencies & Strategy

- Phase 1 first (it unblocks reliable parallel e2e runs). Phases 2, 3 and 5 are independent; Phase 4 after 1–3.
- Chunks: A = T001–T004, B = T005–T008, C = T009–T012, D = T013–T014, E = T015–T018.
- Owner-dependent (not code): real store data, domain, VPS — tracked in LAUNCH-CHECKLIST.md.
