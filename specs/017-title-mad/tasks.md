# Tasks 017: Thmanyah headlines with مد

- [ ] T001 Restore Thmanyah Serif Display in `apps/web/app/assets/css/thmanyah.css` (`@font-face` for `thmanyahserifdisplay-Black.woff2`, `--font-display: 'Thmanyah Serif Display', 'Cairo', system-ui, sans-serif` for `:root:lang(ar)`); keep the Cairo entry in `nuxt.config.ts` as the fallback and main.css `--font-display` as `'Cairo', ...` when the Thmanyah files are absent.
- [ ] T002 Pure util `apps/web/app/utils/mad.ts` (`addMad(text, options)`) with the FR-3 rules and unit tests `apps/web/test/mad.test.ts` (placement per letter class, lam-alef guard, short words, existing tatweel, Latin untouched, determinism, different titles differ).
- [ ] T003 Component `apps/web/app/components/common/CommonMadText.vue` (props: `text`, `size`; Arabic locale only; hidden real text plus aria-hidden stretched text; tatweel runs wrapped in a span with the stretch animation).
- [ ] T004 Apply it to every Arabic `.font-display` title that shows copy (grep `font-display` in `apps/web/app/components` and `pages`): hero (title split into plain + highlighted part), home section titles, category header, FAQ header, content page titles, product story, traders, offers, shop, cart/checkout page titles, 404.
- [ ] T005 CSS: stretch animation, tuned heading metrics for Thmanyah Serif with مد, reduced motion, dark mode; no letter-spacing on Arabic.
- [ ] T006 Orchestrator: gates, prod build screenshots (home, category, FAQ, product, 375 and 1280), CLS check, commit.
