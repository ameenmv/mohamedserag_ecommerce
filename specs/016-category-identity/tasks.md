# Tasks 016: Category identity and motion

- [ ] T001 Shared: add `CATEGORY_ACCENTS` and `CATEGORY_ILLUSTRATIONS` (const arrays + Zod enums) and extend category schemas/types in `packages/shared/src` with tests.
- [ ] T002 API: add `accent` and `illustration` to Prisma `Category` + migration (defaults `green` / `default`); expose in public and admin category endpoints; seed values for the six existing categories plus household and small appliances; tests.
- [ ] T003 Admin: add accent swatch picker and illustration picker to `apps/web/app/components/admin/catalog/AdminCatalogCategorySheet.vue` (admin i18n keys ar/en).
- [ ] T004 Storefront: `apps/web/app/components/store/category/StoreCategoryHeader.vue` (+ `StoreCategoryIllustration.vue` with the SVG set) used by `apps/web/app/pages/c/[slug].vue`; accent CSS variables in main.css with light/dark contrast-safe values; stroke-draw and rise animations, reduced motion respected.
- [ ] T005 Transition and nav: make the page-transition overlay take the destination category accent; add an active (`aria-current`) state to the category bar links.
- [ ] T006 i18n parity (ar/en) for any new storefront strings; tests for the pure helpers.
- [ ] T007 Orchestrator: gates, screenshots of three categories at 375/1280 ar+en light/dark, Lighthouse for the category URL, free OpenCode review, commit.
