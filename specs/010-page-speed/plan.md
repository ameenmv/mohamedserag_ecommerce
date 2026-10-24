# Implementation Plan: Page speed

**Branch**: `010-page-speed` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/010-page-speed/spec.md`

## Summary

Bring the category, product and checkout pages to the PRD §7 mobile budgets (speed ≥ 0.9, LCP < 2.5 s, CLS < 0.1, no console errors) and make all four Lighthouse URLs blocking in CI.

Research found the cause of the late first paint ([research.md](research.md) R1). `@nuxt/fonts` generates metric-matched fallback faces `"<Family> Fallback: <local font>"` for Segoe UI, Helvetica Neue, Arial and **Noto Sans**. The `local("Noto Sans")` lookup alone holds the first paint for 1–2 s: on Linux (CI) the name covers dozens of per-script files, and Android ships Noto as its system font, so phones may pay part of it too. With that one fallback removed, the scriptless category page paints at about 0.24 s instead of 2.3 s.

So the plan is a configuration change first, measured in CI, followed by targeted fixes only if a page still misses a budget. The gate flips from warn to error last.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 24, Nuxt 4.6, Vue 3.5
**Primary Dependencies**: existing only — `@nuxt/fonts` (fallback config), `@nuxt/image`, Tailwind 4, Lighthouse CI 0.15.1 (CI-only)
**Storage**: N/A
**Testing**: Lighthouse CI (four URLs, 3 runs, median) in the main CI job; TesterArmy browser suite incl. `csp.e2e.ts`, `accessibility.e2e.ts` and the 375/320 px journey reruns; Vitest unit tests
**Target Platform**: mobile browsers (mid-range Android, Chrome), simulated as Lighthouse mobile / slow 4G at 375 px through Caddy (HTTP/2, compression)
**Project Type**: web application (Nuxt storefront + NestJS API, monorepo)
**Performance Goals**: on home, `/c/refrigerators`, `/p/fresh-cooker-4b-s15` and `/checkout`: speed ≥ 0.9, LCP < 2.5 s, CLS < 0.1, zero console errors; home JS ≤ 200 KB
**Constraints**: no visual change a shopper would notice (FR-004); CSP unchanged (FR-005); no new runtime dependency (FR-007); every control works on the first tap (FR-003)
**Scale/Scope**: 4 pages, mostly `apps/web/nuxt.config.ts` plus at most a few components; CI config and docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I One Stack, Monorepo | Config of existing modules only; no new dependency | ✅ |
| II Arabic RTL and Egyptian Voice | Arabic stays the default; IBM Plex Sans Arabic is still the body face, fallbacks only change what shows before it loads | ✅ |
| III One Brand System | Brand fonts and tokens unchanged; fallback metrics keep text size and line height so nothing jumps | ✅ (verified by CLS and the side-by-side review) |
| IV API-First, Permission-Checked | No API change | ✅ |
| V Accessible, Fast and Mobile-First | This feature delivers the "LCP < 2.5 s on mid-range Android" rule for the remaining pages; the accessibility scan must stay green | ✅ |
| VI WhatsApp Is the Channel | No change | ✅ |

**Post-design re-check:** unchanged. The design adds no dependency, no API and no new UI.

## Project Structure

### Documentation (this feature)

```text
specs/010-page-speed/
├── plan.md              # This file
├── research.md          # R1–R5: the font-fallback cause and the follow-up levers
├── data-model.md        # Page budget and speed measurement (records, not tables)
├── quickstart.md        # How to measure and verify locally and in CI
├── contracts/
│   └── lighthouse-budgets.md   # The four URLs and their assertions (the CI gate)
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── nuxt.config.ts                       # fonts: fallbacks without Noto Sans (+ Roboto for Android)
└── app/                                 # only if a page still misses a budget after R1 (R3/R4)
lighthouserc.json                        # category/product/checkout assertions warn → error
.github/workflows/ci.yml                 # unchanged unless a Lighthouse step needs tuning
docs/PHASE-1.md                          # measurements before/after (FR-009)
specs/009-launch-readiness/tasks.md      # T010 ticked with a pointer here
```

**Structure Decision**: Web application layout already in the repo. The change sits mostly in `apps/web/nuxt.config.ts`; component edits only where a measurement points at one.

## Phases

1. **Measure baseline in CI** (FR-009): take the Lighthouse numbers from PR #7 (or the first CI run on this branch) as the "before" record.
2. **Fix the font fallbacks** (R1): set `@nuxt/fonts` fallbacks to fonts that resolve cheaply (`Arial`, `Helvetica Neue`, `Segoe UI`, plus `Roboto` for Android), dropping `Noto Sans`. Check CLS and do the side-by-side review in Arabic and English, at 375 px and desktop.
3. **Re-measure**. If all four pages pass, go to 5. If one still misses, use R2–R4 in order: main-thread time (TBT), image priority and sizes on product/category, and checkout's own JS.
4. **Targeted fixes**, each re-measured. Never lazy-hydrate interactive controls (spec 009 lesson, FR-003).
5. **Gate**: switch the three pages' Lighthouse assertions to `error` and record the "after" numbers.

## Complexity Tracking

No constitution violations to justify.
