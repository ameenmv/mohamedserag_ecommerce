# Tasks: 012 Motion showcase

Implementer: agy (gemini-3.8-flash-medium), fallback Codex, then OpenCode. Claude reviews, runs gates, verifies in the browser and commits each task.

- [ ] T1 Page transition overlay (client plugin + component + CSS) and custom cursor (client component + CSS). Disable `experimental.viewTransition`.
- [ ] T2 Fly-to-cart composable (Web Animations API) wired into card add-to-cart and the product page buy button; header cart bump.
- [ ] T3 `productStory` CMS section: shared types, defaults (ar/en), zod schema with default, API spec update, web visibility rule, admin field metadata (new `appliance` and `callouts` kinds or reuse `stats`), admin i18n, home bundle fetches the product.
- [ ] T4 `StoreHomeProductStory.vue`: five appliance illustrations with open states, pinned GSAP scene (loaded after interaction), static open state without GSAP, add to cart.
- [ ] T5 `reviews` CMS section replacing the extra reviews wall; `StoreHomeReviews.vue` in the Alive "community" style with GSAP parallax; static grid without GSAP.
- [ ] T6 Dark mode pass on all new and recent pieces; design polish.
- [ ] T7 Gates (lint, typecheck, unit, build), local axe on storefront pages, commit, push.
