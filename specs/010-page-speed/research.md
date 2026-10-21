# Research: Page speed

All measurements: Lighthouse 12.8.2, mobile, 375 × 812 @2x, simulated slow 4G, Chrome headless, through Caddy (HTTP/2, compression) unless noted. Local numbers are noisy (busy machine, benchmark index 1500–2200); CI is the reference.

## R1 — Why does the first paint wait ~2 s on every page?

**Decision**: Stop `@nuxt/fonts` from generating the `"<Family> Fallback: Noto Sans"` face. Configure the fallback list to `Arial`, `Helvetica Neue`, `Segoe UI` and `Roboto`.

**Rationale**: The cause was bisected on a scriptless copy of `/c/refrigerators` served statically, using observed (unthrottled) first paint:

| Variant | First paint |
|---|---|
| Page as built | 2.27–2.31 s (`load` at ~0.3 s) |
| No CSS at all | 0.15 s |
| No web fonts (`@font-face` removed) | 2.28 s, so it's not the web font downloads |
| `backdrop-filter`, `filter`, shadows or transitions disabled | ~2.25 s, so it's not paint cost |
| Every element on one family (`sans-serif`, or Plex + `sans-serif`) | 0.18–0.24 s |
| Font stacks without the generated `… Fallback: …` faces | 0.24 s |
| Only the `Fallback: Arial` / `Segoe UI` / `Helvetica Neue` face kept | 0.24–0.27 s |
| Only the `Fallback: Noto Sans` face kept | **1.29 s** |

The generated fallback faces use `src: local("<font>")` with metric overrides, so text doesn't jump when the web font arrives. Resolving `local("Noto Sans")` is expensive: on Linux the name matches the whole Noto family (dozens of per-script files), and Chrome holds the first paint while it resolves the font. Android's system UI font is also Noto/Roboto, so this isn't only a CI artifact.

Spec 009 saw text LCP with a 1.5–2.8 s render delay on every page. That delay is this font lookup, not CSS or text layout in general. JS was ruled out earlier: the scriptless page painted just as late.

**Alternatives considered**:
- *Drop all generated fallbacks*: fastest, but text would jump when Plex loads (CLS risk and a visible reflow). Rejected.
- *`font-display: optional`*: avoids the swap but can show the fallback for the whole visit on slow connections, which is a brand change. Rejected.
- *Inline critical CSS*: doesn't address the font lookup. Not needed.

## R2 — Main-thread time (TBT) after R1

**Decision**: Measure first. If TBT keeps a page under 0.9, reduce hydration work without delaying interactive controls. Candidates, in order:
1. Defer non-interactive below-the-fold blocks (`hydrate-never` / `hydrate-on-visible` only where there are no buttons, as already done for specs, warranty and delivery).
2. Mount the cart drawer and quote sync on first use instead of on every page.
3. Look for large synchronous work in `useAsyncData` transforms on the category page.

**Rationale**: Locally TBT ranged 260–960 ms between runs on the same build (load noise). Lazy-hydrating product cards and reviews lost taps (spec 009), so interactive parts stay eagerly hydrated.

**Alternatives considered**: hydrate cards on visible plus a click replay. Vue/Nuxt don't replay events for async-hydrated components, so it's out.

## R3 — Images on category and product pages

**Decision**: Verify the first row of cards and the main product image are `priority` / `fetchpriority=high` with correct `sizes`, and that below-the-fold images are lazy. Fix only what Lighthouse flags (`uses-responsive-images`, `offscreen-images`, `prioritize-lcp-image`).

**Rationale**: The LCP element is text today. Once text paints early, an image could become the LCP element on product pages.

## R4 — Checkout's own JS

**Decision**: Only if checkout still misses after R1: check whether zone and validation data load eagerly, and whether the payment-method sections can be server-rendered without client work. The form fields must stay enabled-on-hydrate (golden rule 10).

## R5 — Making the gate strict

**Decision**: In `lighthouserc.json`, move `categories:performance ≥ 0.9` and `largest-contentful-paint < 2500` for `/c`, `/p` and `/checkout` from `warn` to `error`, keeping 3 runs (median). No other CI change.

**Rationale**: This matches the home page gate. A three-run median absorbs runner noise.
