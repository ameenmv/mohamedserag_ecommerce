# Spec 012: Motion showcase (from the Serag Showroom prototype)

**Status**: in progress · **Branch**: `010-page-speed` (PR #8) · **Prototype**: the "Serag Showroom" artifact (kept for later ideas)

## Goal

Bring the parts of the prototype the owner picked into the real store, keep the identity (charcoal, sand, logo green, beige; Arabic first) and keep every page-speed and accessibility check passing.

Picked by the owner:

1. **Page transition**: sand-edged charcoal columns close over the page, the next page's name shows, the columns lift.
2. **Custom cursor**: a small sand dot and a trailing ring that grows (with a short label) over things you can press. Mouse and trackpad only.
3. **Product story section** (home): a pinned scroll scene. An appliance illustration "opens" (fridge doors, washer door and drum, cooker knobs and flames, TV screen on, AC louver and air) while four callouts arrive, then the price and add-to-cart. Works for any appliance kind and is fully controlled from the dashboard.
4. **Reviews community section** (home): like aliveapp.co's "The Alive Community": giant outlined words in the middle that fill as you scroll, real review cards around them moving at different speeds.
5. **Fly to cart**: on add to cart, the product's own photo flies in an arc to the header cart, which bumps.
6. General GSAP polish where it helps, a dark-mode pass, and design fixes.

## Requirements

- FR-1 Transitions run only on in-app navigation (never the first load), skip the admin, skip for reduced motion, never block taps longer than ~0.5 s, and must not break e2e tests (overlay never intercepts pointer events).
- FR-2 The cursor is off on touch devices, in the admin, and for reduced motion; the native cursor stays visible for text fields.
- FR-3 Product story is a CMS home section (`productStory`) with: title, appliance kind (`fridge | washer | cooker | tv | ac`), product slug, 2–4 callouts (value + label). It renders only when the product exists and is visible. Old saved content without the section still parses (zod default), and old layouts get the new id slotted in (existing `addMissingSections`).
- FR-4 Reviews is a CMS home section (`reviews`) with eyebrow, title, highlight word, subtitle; it renders only with at least 4 approved reviews (real data from `GET /api/reviews/latest`). It replaces the current "extra" reviews wall.
- FR-5 Fly to cart uses the Web Animations API (no GSAP needed), starts from the card's or gallery's image, falls back to the button, and is skipped for reduced motion.
- FR-6 Page speed: nothing new in the first-load bundle beyond small CSS/JS; GSAP still loads only after the first interaction. CI Lighthouse (four pages) stays green.
- FR-7 Accessibility: decorative layers `aria-hidden`; outlined/faded words are decoration with the real text present; contrast passes axe in light and dark.
- FR-8 i18n: every string in both `ar.json` and `en.json`; admin strings in `i18n/admin/*`.

## Out of scope (kept in the artifact for later)

3D category ring, pinned horizontal gallery, Flip filtering, flip-clock countdown, quiz slide transitions, thanks-page confetti, about-page years strip.
