# Plan 016: Category identity and motion

Branch `013-client-feedback-round-1` · Spec: [spec.md](spec.md)

## Findings

- Category page `apps/web/app/pages/c/[slug].vue` is one template: breadcrumb, title with gold underline, intro, "help me choose" bar, filters and listing.
- `Category` has name, slug, parent, intro, seo, `translations` JSON, sort, visible; no colour or illustration field.
- The home already has motion infrastructure: page transition (spec 012), `title-draw` underline, GSAP loaded after first input, CSS-first animations for the first screen.

## Decisions

1. **Data:** add to `Category`: `accent` (key from a fixed brand-harmonious palette, default `green`) and `illustration` (key from a fixed set, default derived from slug); `intro` already acts as the short line. Palette and illustration keys live in `packages/shared` (Zod enums), shown in the admin category sheet as pickers, returned by the public category endpoints. One migration; existing rows default sensibly.
2. **Header band:** a new `StoreCategoryHeader` component replaces the title block: a rounded band tinted with the accent (CSS custom properties per accent key, light and dark variants tested for contrast), a large line illustration (inline SVG set: fridge, washer, tv, ac, cooker, cookware, small appliances, household, default) drawn with a stroke-draw animation, title and intro rising in. CSS-only first-paint animation (no GSAP on this page's critical path).
3. **Transition colour:** the page transition overlay reads the destination category accent (a CSS variable set before navigation from the link's category slug) so category navigation transitions are coloured.
4. **Nav highlight:** the active category in the green bar gets a visible active state (`aria-current`).
5. **Budget:** SVGs inline in one component, CSS animation only; verify category Lighthouse.

## Risks

- Contrast of accents on the dark theme; contrast check for each of the palette keys.
- Interaction with spec 013 (new household category) and 014 (headline font): build after them.
