# Spec 018: Home trust bar

Client feedback (2026-11-05): the "وعود معرض محمد سراج" bento is mostly empty cards with generic promises.

## Change
- Replace the four big bento tiles with one slim bar under the hero: the four CMS promises as icon + title + short line (no number: the hero already shows the years, a real figure can be added when the client supplies one).
- Same CMS data (`uspStrip.items`, exactly 4), same section id; the visible heading becomes screen-reader only.
- Mobile: 2x2 grid after the number; desktop: one row.

## Done when
- Home shows the bar at 1280 px and 375 px, Arabic and English, light and dark; no CLS regression; gates green.
