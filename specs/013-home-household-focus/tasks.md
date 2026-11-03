# Tasks 013: Home refocus on household goods, fewer traders

- [x] T001 Hero card: in `apps/web/app/components/store/home/StoreHomeHeroArt.vue` replace the screens card with a household card (`data-hero-card="household"`, same classes/position as screens, a cooking-pot line icon, label `t('store.home.heroArt.household')`).
- [x] T002 Splash card: in `apps/web/app/components/common/CommonSplash.vue` mirror the hero change (card 3: `data-splash-card="household"`, same icon/classes/label) and replace `'screens'` with `'household'` in `LAND_SCRIPT` (keep it a plain inline script).
- [x] T003 i18n: add `store.home.heroArt.household` ("منزلي" / "Household") to `apps/web/i18n/locales/ar.json` and `en.json`; keep `heroArt.screens` only if still used elsewhere (grep), else remove from both.
- [x] T004 Hero button: in `apps/web/app/components/store/home/StoreHomeHero.vue` stop rendering the secondary CTA; remove now-unused code and the `heroTradersCta` key if unused (both locales).
- [x] T005 Nav: in `apps/web/app/components/store/header/StoreHeaderCategoryNav.vue` remove the "آراء التجار" link; relabel the remaining traders link "للتجار" / "Wholesale" (`store.header.tradersWholesale`); remove `store.header.tradersReviews` if unused; check the mobile menu for the same two links.
- [x] T006 Home sections: in `apps/web/app/components/store/home/StoreHomeSections.vue` stop rendering `traderReels` and drop it from the anchors list; keep `HOME_SECTION_IDS` and the admin editing untouched.
- [x] T007 Traders page: in `apps/web/app/pages/traders.vue` render `StoreHomeTraderReels` with `home.sections.traderReels` (hidden when it has no items), keeping the `traders-reviews` anchor id working on that page.
- [x] T008 Featured categories default in `packages/shared/src/content.ts` (Arabic and English defaults): `['household','refrigerators','washers','acs','cookers','tvs']`; update `packages/shared` tests if they pin the old list.
- [x] T009 Seed: in `apps/api/prisma/seed.ts` add the `household` top-level category (ar name "منزلي", English translation "Household", intro), re-parent `cookware` under it, add `small-appliances` with 4 sample visible products (mixer, kettle, air fryer, iron; prices in piastres), keep seed idempotent.
- [x] T010 Tests: update unit/e2e tests that referenced the hero secondary button, the "آراء التجار" link or the screens card (`grep -rn` in `tests/e2e`, `apps/web/test`, `packages/shared`).
- [x] T011 Orchestrator: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, prod build + Lighthouse-style check of the home (script size, 65 JS files), verify splash landing on the household card, run the free OpenCode review, commit.

Verified 2026-11-03: lint, typecheck, unit tests pass; prod build splash landing offsets are 1 px or less on all four cards (household included); free OpenCode review timed out (inconclusive, diff reviewed by hand); seed not run against a database yet.
