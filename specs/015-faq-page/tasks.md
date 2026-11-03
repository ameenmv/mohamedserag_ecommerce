# Tasks 015: FAQ page

- [x] T001 Shared: add FAQ topics list, `FaqEntry` types and Zod schemas (public entry, admin create/update, reorder) to `packages/shared/src` with unit tests (validation, topic enum, English translation shape).
- [x] T002 API schema: add Prisma model `FaqEntry` + migration in `apps/api/prisma`; regenerate client.
- [x] T003 API public: `GET /faq` (visible entries ordered by topic order then sort, localized) in `apps/api/src/content` with tests.
- [x] T004 API admin: CRUD + reorder endpoints in `apps/api/src/admin-content` with `@RequirePermission`, Zod pipes, sanitised answers, audit log, tests.
- [x] T005 Seed: about 15 starter entries ar/en in `apps/api/prisma/seed.ts` (idempotent, placeholders flagged in comments).
- [ ] T006 Web data: `useFaq` composable (SSR `useAsyncData`), search/filter logic as a pure util with unit tests (Arabic normalisation).
- [ ] T007 Storefront components in `apps/web/app/components/store/faq/` (`StoreFaqHeader`, `StoreFaqTabs`, `StoreFaqSearch`, `StoreFaqAccordion`, `StoreFaqContactCard`) and thin `apps/web/app/pages/faq.vue`; premium styling, motion, a11y, RTL, dark mode; JSON-LD via existing SEO helper; fallback to the CMS page when empty.
- [ ] T008 i18n: storefront keys in `locales/ar.json` and `en.json`, admin keys in `i18n/admin/ar.json` and `en.json` (parity test must pass).
- [ ] T009 Admin screen: `apps/web/app/pages/admin/content/faq.vue` + components under `components/admin/content/faq/` (grouped list, add/edit sheet with English tab, reorder, visibility, delete confirm) and a sidebar entry.
- [ ] T010 e2e: add a browser spec for the storefront accordion/tabs/search in `tests/e2e`.
- [ ] T011 Orchestrator: gates (lint, typecheck, test, api e2e, test:e2e), screenshots 375/1280 ar+en, free OpenCode review, commit.
