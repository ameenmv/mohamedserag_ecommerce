# Phase 1 — Launch: progress

> **تجهيز الإطلاق:** حدود الطلبات بقت لكل زائر، وفيه CSP وheaders أمان، وباك أب يومي متجرّب، ولوجز من غير بيانات العملاء، وفحص accessibility وLighthouse في CI، ودليل نشر وقائمة بالحاجات المطلوبة من صاحب المحل. الباقي: سرعة صفحات القسم والمنتج والدفع، وبيانات المحل الحقيقية والسيرفر.
>
> المرحلة الأولى (الإطلاق) — **Slice 0 (الأساس) و Slice 1 (الكتالوج) و Slice 2 (السلة والدفع) و Slice 3 (جهّز بيتك) و Slice 4 (العروض وتنبيهات التوفر) و Slice 5 (التقييمات) و Slice 6 (المحتوى والـSEO) و Slice 7 (لوحة التحكم والتقارير والإعدادات) خلصوا بالكامل** — كل شرائح المرحلة الأولى خلصت، والباقي تجهيز الإطلاق.
> في Slice 7: «نظرة عامة» بقت شاشة الصبح: عدادات للطلبات الجديدة والمدفوعات المستنية تأكيد والعرابين وتثبيتات العرايس اللي قربت تخلص والتقييمات وطلبات «بلّغني» الجاهزة والمنتجات اللي قربت تخلص، كل عداد بيفتح الصفحة متفلترة، ورسوم للإيراد (الطلبات المتسلمة بس) والعرابين لوحدها. صفحة «التقارير» فيها الإيراد والتقسيمات والأكثر مبيعاً والكوبونات والعروض ومسار العروسة والعملاء المتكررين، وكل تقرير بيتصدّر CSV بيفتح على Excel بالعربي. وصفحة «الإعدادات» بتخلّي صاحب المعرض يغيّر بيانات المعرض والأرقام وطرق الدفع ومناطق التوصيل والعربون وحد المخزون وكلمات البحث وقوالب الرسائل من غير مبرمج.

**Updated:** 21 Oct 2026 · **Branch:** `009-launch-readiness` · **Source of truth:** [PRD](PRD.md) · [spec](../specs/009-launch-readiness/spec.md) · [plan](../specs/009-launch-readiness/plan.md) · [tasks](../specs/009-launch-readiness/tasks.md) · [deploy](DEPLOY.md) · [operations](OPERATIONS.md) · [launch checklist](LAUNCH-CHECKLIST.md)

## Where we are

| Slice | Scope | Status |
|---|---|---|
| **0 — Foundation** | Monorepo, web + API, database, seed, admin auth, Docker, CI | ✅ **Done** (CI green on GitHub, PR #1 merged into main) |
| 1 — Catalog & discovery | Categories, brands, product pages, Arabic search, filters, compare, wishlist, admin products | ✅ **Done** (branch `002-slice1-catalog`) |
| 2 — Cart, checkout & payments | Zones, COD, transfers, large-COD deposit, one-tap confirm | ✅ **Done** (branch `003-slice2-checkout`) |
| 3 — Bridal builder «جهّز بيتك» | Tiers, sharing, deposit and price lock | ✅ **Done** (branch `004-bridal-builder`) |
| **4 — Promotions & stock alerts** | Flash sales, coupons, notify-me | ✅ **Done** (branch `005-promotions-alerts`) |
| **5 — Reviews** | Review form, moderation, verified buyers, ratings | ✅ **Done** (branch `006-reviews`) |
| **6 — Content, CMS & SEO** | Homepage CMS, pages, guides, quiz, SEO, Merchant feed | ✅ **Done** (branch `007-content-seo`) |
| **7 — Dashboard, reports & settings** | Overview counters and charts, reports with CSV, settings | ✅ **Done** (branch `008-dashboard-reports`) |
| **Launch readiness** | Per-visitor rate limits, CSP and headers, backups, logs, Lighthouse and accessibility in CI, viewport regression, runbook | 🟡 **Code done except page speed** (branch `009-launch-readiness`); owner items in the [launch checklist](LAUNCH-CHECKLIST.md) |

## Slice 0 — task by task

`C` = Claude did it directly · `A` = Argon (Gemini) wrote it, Claude reviewed and tested it · `F` = Gemini 3.8 Flash wrote it (Argon quota ran out until ~23 Oct), Claude reviewed and tested it.

| Task | What | Who | Status |
|---|---|---|---|
| T001 | Branch, move the prototype into `prototype/` | C | ✅ |
| T002 | Root workspace: pnpm, Turborepo, env example | C | ✅ |
| T003 | `packages/config`: tsconfig, ESLint, Prettier | C | ✅ |
| T004 | `packages/shared`: Arabic/phone normalizers, money, enums, order flow, WhatsApp, zones (44 tests) | A | ✅ |
| T005 | `packages/ui`: brand tokens light/dark (contrast tested) | A | ✅ |
| T006 | Nuxt 4 app: Tailwind 4, shadcn-vue, fonts, images, i18n, RTL | C | ✅ |
| T007 | Store shell (header, footer, bottom nav) and admin shell (sidebar, Ctrl/⌘ K, «G ثم حرف», undo toasts, dark mode) | A | ✅ |
| T008 | NestJS 12 API: SWC tests, helmet, throttling, Zod pipe, DB health | C | ✅ |
| T008b | Dev and test Postgres 17 in Docker | C | ✅ |
| T009 | Prisma schema for every PRD entity + Arabic trigram search index | A | ✅ |
| T009b | First migration + generated client + `PrismaService` | C | ✅ |
| T010 | Seed: 26 products in piastres, specs, synonyms, zones, settings, bridal tiers, pages, 6 demo orders, admin from env (idempotent) | A | ✅ |
| T011 | Admin auth: hashed sessions, CSRF, fail-closed permission guard, audit log, login page | A | ✅ |
| T012 | Docker: full stack compose, e2e overlay, Caddy, Dockerfiles, hardened multi-stage images | C | ✅ |
| T012b | Test seed endpoints behind `ALLOW_TEST_SEED` + secret header, cleanup routes | F | ✅ |
| T012c | Analytics (Umami under `/stats`) + canonical funnel events + pre-load queue | F | ✅ |
| T013 | e2e runner + smoke, admin-login and test-seed suites (7/7 passing on dev and Docker) | C | ✅ |
| T014 | GitHub Actions CI + Lighthouse CI (checks, docker, lighthouse) | F | ✅ Green on GitHub (PR #1 merged into main) |
| T015 | [`STACK.md`](STACK.md) | F | ✅ |

**Slice 0 status:** Code-complete (100%), verified locally, in Docker, and green in GitHub Actions CI after merging PR #1 into main. `docker compose up` brings the stack up, `/` shows the RTL brand shell, `/admin` redirects to login, the seeded admin reaches the dashboard, and browser e2e 7/7 passes on dev and against the Docker stack.

## Slice 1 — status

- Catalog, category, and brand pages with filters and facets.
- Arabic search with typo tolerance and trigram similarity matching.
- Product detail page, compare, and wishlist.
- Admin products management + bulk CSV import.
- End-to-end test coverage across all catalog features; Lighthouse a11y/SEO/best-practices 100 (performance 63–70 tracked separately).

## Slice 2 — status

- Cart drawer + `/cart` with server re-pricing.
- `/checkout` with zones by governorate+city, Arabic-digit phones, idempotent orders, and large-COD deposit.
- Thank-you page protected by a public token.
- One-tap `/admin/confirm/:token` with login redirect, reject with reason + WhatsApp reply.
- Status flow with history and stock movements (no negative stock, exact restore on cancel, race-safe).
- Admin orders list/detail, WhatsApp status messages, CSV export with formula-injection protection, printable internal invoice.
- Funnel events without personal data.
- Tests: API e2e 116, browser e2e 32 (stable 3/3 full runs), unit 171 shared + 193 web + 74 api.

## Slice 3 — status

- Three active tiers (أساسية، ذهبية، القصر) with per-room product catalogs and highlights, plus start from scratch.
- Room-by-room editing (المطبخ، الغسيل، الصالة، أوض النوم، أجهزة صغيرة، أدوات المطبخ) with real-time totals, room subtotals, difference from tier, and debounced autosave.
- In-place item swap with category alternatives and price differences, quantity stepper (1–10), and search-based catalog add.
- Dual-token list security: private edit link with auto-save vs. clean read-only share link (with showroom WhatsApp inquiry) never exposing the edit token.
- Product-page eager «أضيفي لجهاز العروسة» button with category-to-room auto-placement, device list memory, and toast/inline confirmation link.
- Bridal reservation with deposit (10% default) and 30-day regular price lock; partial electronic deposit support (moves to locked only when fully paid).
- Stock reservation deferred to agreed delivery date (`bridal_delivery_agreed` stock movement) with shortage warnings and exact cancel restoration.
- Admin bridal operations: order type filter, days-left badges, agreed delivery date recording, lock extension, re-pricing with WhatsApp explanation, and dashboard expiring locks card.
- Admin bridal settings and tier editor (`/admin/bridal`) protected by `bridal.manage` permission and CSRF.
- Funnel events (`bridal_list_created`, `bridal_list_shared`, `bridal_reserved`) without personal data or tokens.

## Slice 4 — status

- Flash sales with effective pricing everywhere (cards, product, search, cart, orders; bridal keeps regular prices), live countdown that swaps prices at zero without reload, `/offers`.
- Coupons (percent/fixed, min order, dates, total + per-phone limits, category/brand scope, flash/old-price items excluded, row-locked in the order transaction, released on cancel/payment rejection and re-activated on confirm, localized refusal reasons, 409 recovery at checkout, `coupon_applied` event).
- Admin `/admin/promotions` (flash sales with overlap check and end-now, coupons with usage stats and deactivate-instead-of-delete, shadcn confirm dialogs).
- Notify-me (form on out-of-stock products with honeypot + throttle + one entry per product/phone, `/admin/notify` waiting lists back-in-stock first, prefilled WhatsApp send that marks sent and logs the message, `notify_me_requested` event).
- Security review outcome (coupon guessing limiter, phone masking in audit snapshots, XFF not spoofable behind Caddy because only Caddy's ports are published).
- Tests: API e2e 212, browser e2e 50 (all on isolated servers, incl. no horizontal scroll on admin pages at 320px), unit 262 shared + 82 api + 253 web; production build clean.

## Slice 5 — status

- Review form on every product page (lazy, accessible star radio group with arrow keys, client checks mirroring the server limits, honeypot, 3 submissions/min/IP, one review per phone per product, `review_submitted` event with only product and stars).
- Admin `/admin/reviews` behind `reviews.moderate`: pending / approved / rejected tabs with counts, product search and stars filter, approve (re-checks the verified-buyer flag), reject or hide, store reply, delete in a shadcn confirm dialog (frees the phone to review again), live pending badge in the sidebar and a dashboard card. Every change is audited with the phone masked.
- Storefront: stars and count on every product card and near the price, summary with star breakdown, approved reviews newest first with «اشترى من المعرض» and the store reply, «تحميل المزيد» 10 at a time, empty state, `aggregateRating` in the product JSON-LD only when there are approved reviews. Ratings for a whole page come from one grouped query.
- Security review outcome: the public API never returns phone, IP or status; review text and names render as plain text (`dir="auto"`), with bidi-override and control characters stripped before storing; submitting uses the same visibility rule as the public pages; audit snapshots mask phones. A 409 on a repeat review tells a caller that a phone already reviewed that product; with 3 tries a minute this is accepted as low risk. Reviewer IPs are stored for spam handling and have no retention job yet.
- Tests: API e2e 267, browser e2e 56 (isolated servers, incl. English and 320px), unit 294 shared + 87 api + 258 web + 3 ui; production build clean.

## Slice 6 — status

- **Homepage CMS:** the home is rendered from the published content version (10 sections in the layout order, hidden and empty sections skipped, flash / partners / guides / featured categories from live data, SWR 60 s). Admin «محرر الموقع» (`/admin/content`, `content.manage`): reorder and show/hide sections, field editor with changed markers, reset, counters and image upload, a draft that autosaves without overlapping saves and is flushed before publishing, desktop/mobile preview of the draft, publish (Ctrl/⌘+Enter, transaction, history kept to 20), discard with undo, version history with restore. The announce bar starts hidden because the header already carries that strip.
- **Pages and traders:** `/pages/<slug>` for about, delivery, returns, warranty, privacy and FAQ with SEO fields; footer links come from the published pages; `/traders` uses the home traders texts and a WhatsApp button to the traders number (disabled while the store numbers are placeholders). Pages are edited with a lazy TipTap editor shaped like the server allowlist; bodies are sanitized with `sanitize-html` on save.
- **Guides:** `/guides` and `/guides/<slug>` (Article JSON-LD, up to 4 linked product cards with flash and rating), latest 3 on the home, admin guides tab with cover upload, category/product pickers, rich text with uploaded images, publish date set on first publish. Three guides are seeded.
- **«ساعدني أختار»:** quizzes for fridges, washers, TVs and ACs (seeded), one question at a time with «مش متأكد», top 3 orderable products scored by the shared rules with the reason of the strongest matching rule, popularity fallback, `quiz_completed` event with only category, fallback flag and result count. Entry card on category pages that have a quiz; admin quiz tab validates rule fields and operators against the category spec template.
- **SEO and feed:** one canonical per page (filters and sort dropped, `page` ≥ 2 kept; search results `noindex`), OG tags, hreflang, BreadcrumbList on product/category/brand/guide pages, site-wide LocalBusiness from store settings (omitted while placeholders remain), `/sitemap.xml` with ar/en alternates (index split above 45,000 URLs), `/robots.txt` (`Disallow: /` unless `NUXT_PUBLIC_SITE_INDEXABLE=true`), `/feeds/google.xml` (RSS 2.0 + `g:` namespace, in-stock visible products with an image, flash sale price and dates), XML routes cached for an hour. New public endpoint `GET /api/settings/store` for the store details.
- **Security review outcome:** every admin content endpoint (home, pages, guides, quiz, content uploads) requires `content.manage`, CSRF and writes an audit entry; public endpoints return published content only (no drafts, labels, authors or quiz rules); rich text is sanitized on the server (scripts, handlers, styles, `javascript:`/`data:` URLs removed, images only from `/uploads/`, external links get `rel="noopener noreferrer"`) and `v-html` is used only for that output; store texts elsewhere render as plain text; JSON-LD escapes `<`; content uploads reuse the product image sniffing and size limit; feed and sitemap text is XML-escaped with invalid characters dropped; quiz results are throttled 30/min/IP.
- **Before launch:** set `PUBLIC_SITE_URL`, `NUXT_PUBLIC_SITE_URL` and `NUXT_PUBLIC_SITE_INDEXABLE=true` on production, replace the store placeholders (they also unlock LocalBusiness and the traders WhatsApp button), then validate a product and a guide in Google's Rich Results Test and submit the feed in Merchant Center (not possible from the dev machine).
- Polish pass: English and 320 px sweep of every new page and the editor tabs (only Arabic store content shows on English pages, by design), single `<h1>` per page, the listing toolbar no longer overflows at 320 px, flaky catalog price test fixed. Local Lighthouse on `/` (bare Node server, no compression): accessibility 100, best practices 100, CLS 0; performance 59 there because responses are uncompressed — the CI budget runs behind Caddy and decides.
- Tests: API e2e 314, browser e2e 61 (isolated servers, incl. English and 320 px), unit 327 shared + 114 api + 352 web + 3 ui; production build clean.

## Launch readiness — status

- **Per-visitor rate limits:** server-rendered pages forward the visitor's address (`X-Forwarded-For`, taken from the trusted proxy only) on every API call, so each visitor has their own budget; a spoofed leading address is ignored (API e2e). The Slice 7 follow-up is closed.
- **Security headers:** the web app sends a Content-Security-Policy with a hash for every inline script (no `'unsafe-inline'` or `'unsafe-eval'` for scripts); Caddy adds HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options SAMEORIGIN` and `Permissions-Policy`. Framing is `'self'` because the admin home preview frames our own page. `csp.e2e.ts` walks the storefront and admin journeys with zero violations; it caught `@nuxt/image`'s `onerror` handler (allowed by exact hash) and Zod's `new Function` probe (Zod runs `jitless`).
- **Backups:** a `backup` service dumps the database and archives uploads daily, keeps 30 days, logs `backup_ok` / `backup_failed`; restore and verify scripts, tested end to end against the dev database (counts matched). See [OPERATIONS.md](OPERATIONS.md).
- **Logs and health:** JSON logs in production, `X-Request-Id` on every response, one redacted `HttpError` entry per 5xx (no query strings, phones or tokens; Nest's own raw error log is suppressed), `/healthz` for the web and `/api/health` for the API.
- **Accessibility:** axe-core scans 13 public and admin pages in the browser suite with zero serious/critical issues; it found and we fixed muted text at 4.49:1 (token darkened to `#5C6660`) and amber badge text.
- **Page speed (open):** Lighthouse CI now measures home, a category, a product and checkout against the seeded catalogue. Done: link prefetch on interaction, home sections hydrate when visible, only the body font preloaded, Zod config without loading all of Zod. Home is gated (perf ≥ 0.9, LCP < 2.5 s, JS ≤ 200 KB); the other three pages report as warnings until their LCP (≈3.1–3.3 s locally, text element) is fixed — the measurement shows the first paint is held by CSS/text layout, not by JavaScript.
- **Regression:** CI runs the browser suite on the production build (not `pnpm dev`) and repeats the shopper journeys at 375 and 320 px.
- **Deploy:** [DEPLOY.md](DEPLOY.md) (server, env with secrets marked, first deploy, Umami, update, rollback), `docker/.env.production.example`, the seed skips demo orders on a server (`SEED_DEMO_ORDERS=false`), and compose now passes the public URL to the web app (canonical URLs, hreflang, sitemap). The admin overview warns while store details are placeholders.

## Slice 7 — status

- **Overview «نظرة عامة»:** seven action counters (new orders, payments waiting for confirmation, deposits waiting, bridal locks ending within 7 days, pending reviews, notify-me lists ready to send, low-stock products), each hidden when the admin lacks the permission for the page it opens and linking to that page already filtered (new `lockExpiring=7` filter on the orders list and export, `?ready=1` on notify-me). Revenue, delivered orders and deposits for 7/30/90 days with the previous-period change; revenue counts delivered orders on their delivery day (Cairo time), deposits are confirmed payments on bridal or large-COD orders, shown separately. Charts are plain SVG with keyboard focus, tooltips and a table view; the axis runs right to left in Arabic.
- **Reports «التقارير»** (`reports.read`): revenue, orders and AOV by day/week (weeks start Saturday)/month; splits by category and brand (current product category/brand, order discount split per line, delivery fees as their own row, so every split sums to the total) and by payment method, zone and order vs bridal; best sellers; coupons; flash sales (units at the sale price, discount labelled approximate because the regular price at sale time isn't stored); bridal funnel lists → paid reservations → delivered; repeat customers (counts only). Presets or a custom range up to 366 days, tabs synced to the URL, CSV export per report (UTF-8 BOM, Arabic headers, money in pounds, formula-like cells neutralised).
- **Settings «الإعدادات»** (`settings.manage`): store info and WhatsApp numbers (main, traders), payment methods and account details, delivery zones (governorates from the list + optional city, fee; one zone without places catches everything else), large-COD deposit rule, low-stock default (applies to new products), search synonyms (saving reindexes search) and WhatsApp templates (allowed variables as chips, live preview). Each section saves on its own with field errors, changed markers, a leave guard and a conflict dialog when someone saved first (version check, 409 with the latest values). Every save is audited with phone numbers masked. The storefront header, footer, product page, checkout and thank-you pages now read the saved store numbers and hide phone/WhatsApp links while they are still placeholders.
- **Review outcome:** every dashboard counter, report, export and settings route is permission-checked (fail-closed) and tested with a restricted admin; settings saves need CSRF and write an audit row; reports and CSVs carry no customer phones, names or addresses (repeat customers return counts only); CSV cells that start like a formula are prefixed with `'` (tested with a `=HYPERLINK` product name); settings validation covers bad phones, no enabled payment method, a governorate in two zones, deposit % outside 1–100, low stock outside 0–999, one-word synonym groups and unknown template variables.
- **Performance (SC-006):** with 20,000 delivered orders over a year added to the dev database, the 90-day overview answered in ~0.3 s, the 90-day reports in 0.01–0.24 s, a full-year splits report in ~0.48 s, and the server-rendered `/admin` and `/admin/reports` pages in ~0.3 s (target: under 2 s). The test orders were deleted afterwards.
- **Follow-up closed in launch readiness:** server-side renders now forward the visitor IP, so rate limits are per visitor.
- Polish pass: English and 320 px check of the three pages (added to the admin overflow e2e), keyboard use of tabs, charts and forms, no hydration warnings.
- Tests: API e2e 350, browser e2e 64 (isolated servers, one worker as in CI, incl. English and 320 px), unit 407 shared + 127 api + 402 web + 3 ui; production build clean.

## Quality gates (verified)

| Gate | Result |
|---|---|
| Lint + typecheck (all packages) | ✅ |
| Unit tests: shared 171 · web 193 · api 74 · ui 3 (441 total) | ✅ |
| API e2e tests against real test DB | ✅ 116 |
| Browser e2e | ✅ 32 |
| Production builds (API, web) | ✅ |
| Docker stack (`docker compose build` + up with e2e overlay) — last verified in Slice 0 | ✅ All services healthy (db, migrate exits 0, api, web, umami, caddy); `/api/health` ok, RTL home, `/admin` → login, `/stats/script.js` 200, `/api/test/*` 403 without secret, `seed` tool service works, browser e2e 32 against Docker |
| Lighthouse CI budgets (perf ≥ 0.9, a11y = 1, LCP < 2.5 s, CLS < 0.1 on `/`) | ✅ Verified in CI |

## Found and fixed during review

### 2026-10-16: Web architecture refactor, bilingual UI (ar/en) & engineering skill
- **Web architecture refactor:** Refactored pages under `apps/web/app/pages/` to thin composition shells handling routes, SEO/meta, and layout selection only. Split the monolithic admin login into `components/admin/login/*` with generic form controls in `components/form/{FormField,FormPasswordInput,FormAlert}.vue` and `components/common/LocaleSwitcher.vue`. Reorganized storefront header/footer and admin sidebar/topbar/dashboard into dedicated subcomponents. Extracted state and API operations into composables (`useAdminSession`, `useAdminAuth`, `useApiClient` with `adminFetch`, `useLoginForm`, `useAdminShortcuts`, `useAdminRouteTitleSync`, `useNavActive`), pure utilities (`utils/{api,auth,i18n}.ts`), `constants/navigation.ts`, and `types/admin.ts`.
- **Dev-only prefilled admin login:** Configured `apps/web/nuxt.config.ts` via `$development.runtimeConfig.public.devLogin` to prefill the login form with `ADMIN_EMAIL` and `ADMIN_PASSWORD` (fallback `admin@serag.local` / `change-me`) during local development. In production builds, `devLogin` fields are strictly empty strings.
- **Bilingual UI (Arabic default, English):** Configured `@nuxtjs/i18n` with Arabic as default RTL (`/`) and English as LTR (`/en/...`) using `prefix_except_default`. Browser-language detection is off so `/` is always Arabic, `useLocaleHead` keeps document `lang`, `dir`, and hreflang meta up to date, English fonts are overridden in `main.css`, login API error codes are mapped to localized keys (`loginErrorKey`), and locale parity is enforced by `apps/web/test/i18n-messages.test.ts`.
- **Agent engineering handbook:** Documented monorepo conventions, layer rules, and definition of done in `.agents/skills/serag-engineering/` (`SKILL.md` + reference guides), mirrored to `AGENTS.md`, `CLAUDE.md`, and `.claude/skills/serag-engineering`.
- **Review catches:**
  - *Component auto-import mismatch:* Nuxt auto-import requires component filenames in nested folders to match directory prefixes (e.g. `components/admin/dashboard/AdminDashboardWelcomeHeader.vue` registers as `<AdminDashboardWelcomeHeader>`). Shortened or mismatched tags caused component resolution errors in Vue and were fixed.
  - *Circular import between auth composables:* Splitting auth actions from session state revealed a circular dependency when auth functions and fetch wrappers imported each other. Resolved by isolating state in `useAdminSession` and consumers in `useAdminAuth` and `useApiClient` (`adminFetch`).

### In this round (Claude review of T012b, T012c, T014, Docker & tests)
- **Prisma JSON zones parsed with Zod:** delivery zones stored in JSON columns now go through Zod schemas so invalid runtime payloads cannot bypass validation.
- **API test DB now seeded:** test database setup now runs seed data during global setup, preventing empty-DB failures in API test suites.
- **Flaky run ID:** nanoid generated underscores that broke regex patterns in test run cleaners; updated to URL-safe alphanumeric IDs.
- **Arabic search normalization:** search assertion now follows the Arabic normalizer (folding ث → ت).
- **Test script separation:** `pnpm test` no longer starts browser tests; browser e2e runs strictly under `pnpm test:e2e`.
- **E2E telemetry flag:** fixed the environment variable name to `E2E_TELEMETRY_DISABLED`.
- **Docker Compose variable substitution:** compose `:?` on unset admin variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) broke every command; defaults restored.
- **Browser API base in Docker:** browser API base made same-origin `/api` instead of hardcoded `localhost:4000` (which caused login failures inside Docker).
- **Docker build context size:** duplicate per-Dockerfile `.dockerignore` files removed so `node_modules` stays out of the build context (context reduced to 2.8 MB).
- **Dev test seed secret length:** dev `TEST_SEED_SECRET` placeholder in `.env.example` lengthened to ≥ 16 characters to satisfy guard constraints.
- **Production hydration crash from `dropMessageCompiler`:** fixed, now guarded by `errors-in-console`.
- **Lighthouse budget met:** achieved by smaller initial JS, HTML compression, client-only toast CSS, and IBM Plex Sans Arabic trimmed to 400/700 (font-medium renders as 400, font-semibold as 700).
- **Lighthouse measured through Caddy/HTTP/2:** CI now runs against the production build behind Caddy with HTTP/2 and compression (`docker/Caddyfile.lighthouse`).

### Previous review fixes (earlier Slice 0 tasks)
- **Credentials in the URL:** the login form could submit natively before Vue hydrated, which put the email and password in the URL. The form is now POST-only and its inputs and button stay disabled until hydration. The e2e suite caught this.
- **Unknown npm package:** the shadcn-vue CLI rewrote imports to an npm package named `cn`. The imports now point back at our own helper, and the package is removed.
- **Version pins:** Prisma stays on 7.10 (8.x is a release candidate), TypeScript stays on 6.0 (the Nest CLI doesn't support 7 yet), and `nestjs-zod` is replaced by our own Zod pipe because it doesn't support Nest 12.
- **Schema and code cleanups:** duplicate timestamps and a redundant quiz slug are removed. The Arabic «الحث الحراري» induction parsing is fixed.

## Still open (be honest)

- **Umami dashboard access:** The Umami dashboard UI is not reachable under `/stats` (only the tracker script and `/api/send` are reverse-proxied by Caddy). To view analytics, access Umami directly via `docker compose port umami 3000` or an SSH tunnel. A dedicated subdomain will be configured later for production.
- **Store-owner data:** Real showroom information from PRD §13 (phone numbers, WhatsApp numbers, address, working hours, returns policy, and delivery city lists) is still placeholder data.

## Waiting on the store owner (PRD §13)

- Real phone and WhatsApp numbers, address and working hours (placeholders for now)
- Fawry: which method to use, or drop it
- City lists for each delivery zone
- Contents of the bridal tiers
- A lawyer's review of the returns policy

## Next steps

1. **Launch readiness** (T090–T092): forward the visitor IP on server-side API calls (per-visitor throttling), full regression at 1280/375/320 px, Lighthouse and security headers, real store data (replace the store placeholders from «الإعدادات»), VPS deploy and backups.

## How to check it yourself

### Local development

```bash
cp .env.example .env
pnpm install
pnpm db:setup         # Starts Postgres in Docker + migrates + generates client + seeds demo data
pnpm dev              # Storefront on http://localhost:3000 · Admin on http://localhost:3000/admin
pnpm test:e2e         # Runs browser e2e tests (7/7 passing)
```

### Full stack in Docker

```bash
# 1. Build images
SESSION_SECRET=$(openssl rand -hex 32) UMAMI_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker/compose.yml build

# 2. Run the stack
SESSION_SECRET=$(openssl rand -hex 32) UMAMI_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker/compose.yml up -d

# 3. Seed demo data & admin user
ADMIN_EMAIL=admin@serag.local ADMIN_PASSWORD=change-me \
  docker compose -f docker/compose.yml --profile tools run --rm seed

# 4. Run e2e tests against the Docker stack (with test seed overlay)
SESSION_SECRET=$(openssl rand -hex 32) UMAMI_SECRET=$(openssl rand -hex 32) \
  TEST_SEED_SECRET=ci-test-seed-secret-must-be-32-chars-long-min \
  docker compose -f docker/compose.yml -f docker/compose.e2e.yml up -d

APP_URL=http://localhost API_URL=http://localhost/api \
  TEST_SEED_SECRET=ci-test-seed-secret-must-be-32-chars-long-min \
  pnpm test:e2e
```
