# Plan 013: Home refocus on household goods, fewer traders

Branch `013-client-feedback-round-1` · Spec: [spec.md](spec.md)

## Findings in the code

- Hero art (`StoreHomeHeroArt.vue`) and the splash (`CommonSplash.vue`) both have a "screens" gold card (`data-hero-card="screens"` / `data-splash-card="screens"`); the splash landing script (`LAND_SCRIPT`) lists the four card keys.
- The hero's secondary button comes from the home content field `hero.secondaryCta` (`StoreHomeHero.vue`).
- The green category bar (`StoreHeaderCategoryNav.vue`) has two traders links: "للتجار والجملة" (`/traders`) and "آراء التجار" (`/#traders-reviews`). The anchor belongs to `StoreHomeTraderReels.vue` (section id `traderReels`, "التجار بيتكلموا عننا", video reels).
- Home sections are an ordered list `HOME_SECTION_IDS` (`packages/shared/src/content.ts`); the layout schema requires every id, so the id must stay.
- `featuredCategories.categorySlugs` default is fridges, washers, tvs, acs, cookers, cookware.
- Categories already support a parent/child tree, descendants' products are included in listings, and the admin category sheet has a parent picker. The public tree hides categories with zero visible products.
- The seed (`apps/api/prisma/seed.ts`) defines categories and the Turkish cookware category.

## Decisions

1. **Hero/splash card:** the screens card becomes a household card: same slot, size, tilt, gold style, a pot icon, key `household`, label `store.home.heroArt.household`. The splash card 3 mirrors it; `LAND_SCRIPT` key `screens` becomes `household`. Both stay decorative (aria-hidden).
2. **Category structure:** a top-level category `household` (name "منزلي" / "Household") with children: the existing `cookware` (re-parented, slug unchanged so URLs keep working) and a new `small-appliances` ("أجهزة منزلية صغيرة"). Seed adds a few sample small-appliance products so the category is not empty. Screens (`tvs`) stay a top-level category.
3. **Featured categories default** order: household, refrigerators, washers, acs, cookers, tvs (the owner's saved order is untouched).
4. **Navigation:** the bar shows top-level categories (household appears automatically once it has products); remove the "آراء التجار" link; keep one traders link labelled "للتجار" / "Wholesale".
5. **Traders on home:** stop rendering the secondary hero button (the field stays in the content model for old data); stop rendering `traderReels` on the home page (keep the section id, its admin editing and its content) and render `StoreHomeTraderReels` on `/traders` using the home content's `traderReels`. Remove `traderReels` from the home anchors list in `StoreHomeSections.vue`.
6. **Budget:** no new client code on the home; the traders page may import the reels component directly.

## Risks

- Home Lighthouse script budget (204800 B median): the change removes code from home; verify with a prod build.
- Splash landing must still be exact: re-measure after the card swap.
- e2e tests may reference the removed hero button or nav link: grep `tests/e2e`.
