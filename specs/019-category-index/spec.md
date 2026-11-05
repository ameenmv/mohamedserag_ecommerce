# Spec 019: Category index (editorial list) and slim category header

Client feedback + design review 2026-11-05: category cards are generic and the category page banner is big and empty. Chosen direction: luxury magazine, option B of the demo.

## Home "تسوّق حسب القسم"
- Replace the card grid with an editorial index: one large row per category (huge Arabic title in the category accent colour, one-line description from `intro`, product count, "من X ج.م", arrow), hairline dividers.
- Every row shows a small product thumbnail on a category-tinted tile (always visible, also on touch).
- Desktop hover (fine pointer only): the row tints, the title shifts slightly, the arrow fills, and a large product preview follows the mouse (smoothed with lerp, scale/clip reveal on enter, fade on leave). The preview is a decorative image, not focusable. Keyboard focus shows the same row highlight (no floating preview).
- Reduced motion or coarse pointer: no floating preview, no movement; colour change only.
- No orphans or special cases: works for 1 to 12 categories.

## Category page header
- Replace the tall banner with a text-only header: breadcrumb, large title (mad), a short line with product count and starting price, intro as one line, accent underline. No illustration, no big box.

## Data
- `CategoryTreeNode` gains `coverImage: string | null` (url of the best visible product image in the category or its descendants: featured first, then lowest sort) and `startingPrice: number | null` (min visible product price in piastres, descendants included).

## Done when
- API unit/e2e tests cover the two fields; web tests cover pure helpers; i18n parity holds; lint, typecheck, tests green; verified at 1440 and 390, Arabic and English, light and dark; no CLS or home script-budget regression.
