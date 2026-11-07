# 026: Product page gallery lightbox and UX polish

## Why
The owner wants the product page enhanced, starting with the gallery: tapping the image should open a full gallery. The page should also read better and feel as polished as the rest of the "luxury magazine" storefront.

## Current state
- `pages/p/[slug].vue` composes `StoreProductPageGallery` (138 lines: main image, prev/next arrows, thumbnails, hover zoom), `StoreProductPageSummary` (sticky buy box on lg), lazy `Specs`, `SetContents`, `Warranty`, `Delivery`, `Reviews`, related products, and the mobile `StickyBar`.
- UI kit has `components/ui/dialog` (reka-ui). No new dependencies.
- Performance budget: Lighthouse mobile ≥ 0.9 on the product page, LCP is the first image (eager, fetchpriority high). Keep that.

## 1. Gallery (main work)
- **Main image**: click or Enter opens the lightbox at the current image. Cursor shows zoom-in; a small "expand" icon button in a corner for discoverability (44 px target, aria-label).
- **Mobile**: swipe left/right on the main image changes image (pointer events, RTL-aware direction), with dots under the image instead of thumbnails below 640 px. Tap opens the lightbox.
- **Image counter** chip "2 / 5" on the main image when there is more than one image.
- **Thumbnails** (≥ 640 px): active one has a brand ring; keyboard arrows move between them.
- **Lightbox** (new `StoreProductPageLightbox.vue`, lazy-loaded so it does not add to the first-load JS; built on the existing Dialog):
  - full-screen dark backdrop, image fitted to the viewport, product name and counter at the top, close button;
  - prev/next buttons, keyboard ← → (mirrored in RTL) and Esc, swipe on touch;
  - zoom: double-click/double-tap toggles 2× at the tapped point; when zoomed, drag pans; pinch-zoom on touch up to 3×;
  - thumbnail strip at the bottom on ≥ 640 px;
  - focus trapped inside, returns to the image that opened it; body scroll locked;
  - preloads the neighbour images only after it opens;
  - reduced motion: no slide animations, instant swaps.
- Pure helpers (next/prev index with wrap, swipe direction in RTL, zoom clamp and pan bounds) in `utils/product-gallery.ts` with unit tests.

## 2. Page UX polish
- **Buy box**: show the saving as both amount and percent; installment hint line if the product has one (skip if no data); trust row (warranty years, delivery, cash on delivery) as three compact icon items under the add-to-cart button.
- **Section nav**: a slim sticky in-page nav under the header on ≥ 1024 px (المواصفات، الضمان، التوصيل، التقييمات) that highlights the section in view; hidden on mobile where the sticky buy bar already sits.
- **Specs**: two-column definition list on ≥ 640 px with the "key specs" (first 4 comparable fields) shown first as large figures; the rest in the table.
- **Related products**: horizontal snap scroller on mobile, grid on desktop (keep current cards).
- Keep the 3D story and anything on the home page untouched.

## Out of scope
Video, 360° spin, AR, user-uploaded photos, changing the data model.

## Acceptance
- Unit tests for the gallery helpers.
- Browser, ar and en, light and dark, 1280 and 375 px: open lightbox by click, keyboard and tap; navigate; zoom/pan; Esc returns focus; swipe on mobile changes images in the correct direction in RTL.
- No extra first-load JS on the product page beyond a small increase (lightbox chunk lazy); LCP image unchanged.
- Gates green.
