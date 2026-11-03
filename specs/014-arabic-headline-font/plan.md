# Plan 014: Arabic headline font

Branch `013-client-feedback-round-1` · Spec: [spec.md](spec.md)

## Findings

- Arabic headlines: `:root:lang(ar) { --font-display: 'Thmanyah Serif Display', 'Thmanyah Sans', sans-serif }` in `apps/web/app/assets/css/thmanyah.css`, loaded only when the Thmanyah files exist; headings use `.font-display` (weight 900, leading 1.25, tighter 1.12 for `text-[clamp(`). The CSS was tuned earlier for Lalezar.
- `nuxt.config.ts` configures `@nuxt/fonts` with the google provider for the Latin faces; web fonts are applied only after first paint (`fonts-ready` class), system fonts before.
- Without the Thmanyah files (CI) the Arabic display falls back to the main.css stack.

## Decisions

1. Add **Alexandria** (variable, weights 100-900, open license) through `@nuxt/fonts` (google provider, weights 800-900, arabic subset) in `nuxt.config.ts`, consistent with the existing font entries (no preload, applied after first paint).
2. Define the Arabic display face in one place (`--font-display` for `:root:lang(ar)`): `'Alexandria', 'Thmanyah Sans', system-ui, sans-serif`. Body `--font-sans` stays Thmanyah Sans.
3. Re-tune the Arabic `.font-display` rules (leading, padding for ascenders/descenders, no letter-spacing) in `thmanyah.css` or main.css for Alexandria; remove the serif-specific comments. The Thmanyah Serif Display `@font-face` is removed (not needed), the Sans faces stay.
4. Check CLS with the font-swap and keep the `size-adjust`/fallback metrics from `@nuxt/fonts`.

## Risks

- Layout shift at swap; verify with Lighthouse and a screenshot diff.
- Outlined text (`.text-outline`) and very large clamp headings: check clipping.
