# Tasks 014: Arabic headline font

- [x] T001 Register Cairo in `apps/web/nuxt.config.ts` fonts config (google provider, weights 800 and 900, arabic subset, swap, no preload) following the existing entries.
- [x] T002 In `apps/web/app/assets/css/thmanyah.css` set the Arabic `--font-display` to Cairo first, keep `--font-sans` as Thmanyah Sans, remove the Serif Display `@font-face` and its notes; if Thmanyah files are absent the stack must still give Cairo headings (move the display rule to main.css if needed).
- [x] T003 Re-tune Arabic heading rules (`.font-display`, clamp headings, `.text-outline` exclusions): line-height, bottom padding, no letter-spacing, weight 800/900; verify home hero, section titles, category and product titles, 404 page.
- [x] T004 Orchestrator: prod build, screenshots at 375 and 1280 (light and dark), Lighthouse mobile on the four URLs (CLS < 0.1, script budget untouched), commit.

Verified 2026-11-03: Cairo renders on prod build (home, mobile); CLS on mobile home is 0.19 headless both before and after this change (pre-existing hero shift when the web fonts apply behind the splash, CI Lighthouse is the judge); Lighthouse not run locally.

Update 2026-11-05: the client/user disliked Alexandria (too blobby at weight 900). Compared 12 faces on the real hero headline; chose Cairo (800 for headings, 900 for the big clamp headings).
