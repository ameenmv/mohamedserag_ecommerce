# Mohamed Serag Store Constitution

Product source of truth: [docs/PRD.md](../../docs/PRD.md).

## Core Principles

### I. One Stack, Monorepo
The product is built with Nuxt 4 (SSR storefront and `/admin`), NestJS (REST API) and PostgreSQL via Prisma, styled with Tailwind and shadcn-vue, in one pnpm/Turborepo monorepo deployed with Docker on a VPS. New dependencies need a reason in the spec that introduces them. The static HTML prototypes (`*.html`, `admin/`) are design references, not production code.

### II. Arabic RTL and Egyptian Voice
All UI is `lang="ar" dir="rtl"`. Copy is written in the Egyptian dialect used across the storefront ("مستنيين تأكيدك", "اتحفظ"). Numbers, prices and IDs use Latin digits in the Outfit font, set `direction:ltr` where they mix with Arabic.

### III. One Brand System
Colors, type and radii come from shared tokens (Serag green `#16291E`/`#2A4D38`, gold `#B5A45C`/`#D2C27A`, cream `#F4F1E6`/`#FAF7EE`; Lalezar for display, IBM Plex Sans Arabic for body, Outfit for numbers), exposed as Tailwind theme values and CSS variables so light and dark themes stay in sync. shadcn-vue components are themed, never used with default colors.

### IV. API-First, Permission-Checked
Every read and write goes through the NestJS API; the frontend never talks to the database. Every admin endpoint checks a named permission even while only one admin role exists, so roles can be enabled without touching endpoints. Validation lives in shared schemas used by both apps.

### V. Accessible, Fast and Mobile-First
Real buttons, links, labels and inputs; visible focus; 4.5:1 contrast; 44px touch targets; reduced motion respected. Every page works at 320px with no horizontal page scroll. Public pages are server-rendered with LCP < 2.5s on mid-range Android over 4G.

### VI. WhatsApp Is the Channel
Customer communication at launch happens through prefilled WhatsApp links, not paid APIs. Any feature that needs a message to the customer or the admin defines its prefilled text and where the button lives.

## Constraints

- Placeholder facts stay as visible placeholders (`[رقم الواتساب]`), never invented.
- Phone numbers are never shown publicly.
- Prices on a confirmed bridal reservation never change during its lock period.
- Scope per phase follows docs/PRD.md section 4; out-of-scope items are not built early.

## Governance

This constitution guides every spec under `specs/`. Changes need a note in the spec that motivated them and an update to docs/PRD.md when they change product scope.

**Version**: 2.0.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-16 (moved from static-first prototype to Nuxt + NestJS product stack)
