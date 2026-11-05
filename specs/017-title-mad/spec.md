# Spec 017: Thmanyah headlines with "مد" (kashida) per title

**Branch**: `013-client-feedback-round-1` · **Created**: 2026-11-05 · **Status**: Draft

## Why
The owner disliked Alexandria and Cairo for Arabic headlines and prefers Thmanyah Serif Display, as shown on font.thmanyah.com, where words stretch with a "مد" (tatweel/kashida). Headlines are the brand voice of the store (the client cares about them most), so every Arabic title should carry a well-placed مد that suits that title.

## Requirements
- FR-1 Arabic headlines (`.font-display`) use Thmanyah Serif Display Black again; where the Thmanyah files are absent (CI) the fallback stack is Cairo, then system sans (never Alexandria).
- FR-2 Every Arabic storefront title (hero, section titles, category header, FAQ headline, page titles, product story, footer/CTA headings that use `.font-display`) shows a مد built from tatweel characters (U+0640), placed per title by a deterministic rule, not random: different titles get different positions and lengths.
- FR-3 Placement rules (pure function, unit tested): only after letters that join to the next letter; never right after a first letter of a 2-letter word, never between ل and ا/أ/إ/آ, never before a final non-joining ending that would look broken; preference order seen/sheen/sad/dad > ba/ta/tha/noon/ya/fa/qaf > kaf/lam/meem/ha/ain/ghain/ha/kha/jeem; one run per chosen word, at most 2 words per title, 1 to 3 tatweels depending on title size; words shorter than 3 letters and Latin/number runs are untouched; text that already contains a tatweel is left as the editor wrote it.
- FR-4 Accessibility and SEO: the real text stays in the DOM (visually hidden) and the stretched version is `aria-hidden`; `<title>`, meta, JSON-LD and breadcrumbs keep the plain text.
- FR-5 English (LTR) titles are untouched.
- FR-6 The مد appears with a short stretch animation on entrance (transform only, no layout shift), off for reduced motion.
- FR-7 Typography of titles is re-tuned for Thmanyah Serif with مد (line height, bottom padding for descenders, no letter-spacing, no clipping at 320 px).
- FR-8 No new runtime dependency; home first-load JS stays within the Lighthouse script budget.

## Success criteria
- SC-1 On home, a category, FAQ and a product page in Arabic, every large title shows a مد and no title has a broken join or clipped letter (visual check at 375 and 1280).
- SC-2 Two different titles never share the same pattern by default; unit tests cover the rules.
- SC-3 CLS stays below 0.1 compared with the baseline.
