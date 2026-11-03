# Tasks 014: Arabic headline font

- [ ] T001 Register Alexandria in `apps/web/nuxt.config.ts` fonts config (google provider, weights 800 and 900, arabic subset, swap, no preload) following the existing entries.
- [ ] T002 In `apps/web/app/assets/css/thmanyah.css` set the Arabic `--font-display` to Alexandria first, keep `--font-sans` as Thmanyah Sans, remove the Serif Display `@font-face` and its notes; if Thmanyah files are absent the stack must still give Alexandria headings (move the display rule to main.css if needed).
- [ ] T003 Re-tune Arabic heading rules (`.font-display`, clamp headings, `.text-outline` exclusions): line-height, bottom padding, no letter-spacing, weight 800/900; verify home hero, section titles, category and product titles, 404 page.
- [ ] T004 Orchestrator: prod build, screenshots at 375 and 1280 (light and dark), Lighthouse mobile on the four URLs (CLS < 0.1, script budget untouched), commit.
