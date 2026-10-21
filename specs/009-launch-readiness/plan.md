# Implementation Plan: Launch readiness

**Branch**: `009-launch-readiness` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

## Summary

Close the gaps between "all slices built" and "safe to launch": per-visitor rate limiting for server-rendered pages, production security headers with a CSP, daily backups with a verified restore, structured error logs and uptime checks, Lighthouse budgets on the four pages that sell, an automated accessibility check, a 1280/375/320 px regression in CI, and a deploy runbook plus launch checklist for the owner-dependent steps.

## Technical Context

**Language/Version**: TypeScript (strict), Node 24
**Primary Dependencies**: existing stack. Additions: `axe-core` as a **test-only** dev dependency of `tests/e2e` (injected into pages for the accessibility check). Backups use the official `postgres` image's `pg_dump` in a small compose service (no new runtime library). Structured logs use NestJS's built-in JSON logger (`ConsoleLogger` with `json: true`) — no new logging library.
**Topology**: Caddy (TLS, the only trusted proxy hop) → `web:3000` (Nuxt SSR) and `api:4000` on the compose network. Caddy appends the client address to `X-Forwarded-For`. The web server takes the **last** entry of the incoming `X-Forwarded-For` when the request came from the proxy (or its socket address otherwise) and sends it to the API as `X-Forwarded-For`; the API (`trust proxy` = 1) resolves `req.ip` from that single hop.
**Testing**: Vitest unit (IP derivation, header builder), API e2e (per-IP throttle buckets, spoofed leading XFF ignored), TesterArmy (CSP violations, accessibility scan, viewports), Lighthouse CI (four URLs), a scripted backup/restore check.
**Performance Goals**: PRD §7 — LCP < 2.5 s, CLS < 0.1, home JS < 200 KB gzipped, mobile Lighthouse ≥ 0.9.
**Constraints**: No secrets in the repo; CSP must not break Nuxt hydration, the TipTap editor, Umami or uploaded images; changes to Caddy must keep `/api`, `/uploads` and `/stats` routing.

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I One stack | Only a test-only dev dependency (`axe-core`); backups via the postgres image | ✅ |
| II Arabic RTL | Overview placeholder warning in ar + en | ✅ |
| III One brand system | No visual changes beyond the warning card | ✅ |
| IV API-first, permission-checked | Throttling per visitor; no new public endpoints | ✅ |
| V Accessible, fast, mobile-first | Lighthouse on four pages, axe scan, 320 px regression | ✅ |
| VI WhatsApp is the channel | Contact links stay hidden until real numbers exist | ✅ |

## Project Structure

```text
apps/web/
├── server/utils/visitor-ip.ts          # derive visitor IP from the trusted hop (pure, unit-tested)
├── app/utils/api.ts                    # SSR headers: forward X-Forwarded-For (+ cookie as today)
├── app/composables/useStoreApi.ts      # public $fetch calls use the same SSR headers
└── app/components/admin/dashboard/AdminDashboardSetupWarning.vue   # placeholder store details warning

apps/api/src/
├── main.ts                             # trust proxy documented; JSON logger in production
└── common/request-logging.interceptor.ts (or middleware)  # request id, structured error log, no PII

docker/
├── Caddyfile                           # security headers + CSP (web), frame-ancestors, permissions policy
├── compose.yml                         # backup service (daily pg_dump, 30-day rotation) + healthchecks
└── backup/                             # backup + restore scripts

lighthouserc.json                       # four URLs (home, category, product, checkout)
.github/workflows/ci.yml                # Lighthouse URLs; viewport matrix for the browser suite
tests/e2e/tests/
├── support/a11y.ts                     # inject axe-core, return serious/critical violations
├── accessibility.e2e.ts                # public + admin pages
└── csp.e2e.ts                          # main journeys with zero CSP violations (production proxy only)

docs/
├── DEPLOY.md                           # runbook: server, env/secrets, first deploy, HTTPS, backups/restore, update, rollback
└── LAUNCH-CHECKLIST.md                 # PRD §13 items, where each is set, status
```

## Phases

1. **Per-visitor throttling (US1)** — IP derivation helper, SSR header forwarding for public and admin fetches, API trust boundary, API e2e for separate buckets and spoof resistance, keep/justify the store-details exemption.
2. **Hardening (US2)** — Caddy headers + CSP (report violations in dev via console), backup service + restore script + verification, JSON logs with request id and PII-free errors, uptime-ready health checks.
3. **Performance & accessibility (US3)** — measure the four pages behind Caddy, fix the home LCP (likely hero image priority/preload, font loading, JS splitting), image formats/sizes, Lighthouse CI on four URLs, axe scan in the browser suite.
4. **Regression & KPIs (US4)** — viewport matrix in CI, analytics events verified in the e2e Docker overlay.
5. **Runbook & owner checklist (US5)** — DEPLOY.md, LAUNCH-CHECKLIST.md, overview placeholder warning.
