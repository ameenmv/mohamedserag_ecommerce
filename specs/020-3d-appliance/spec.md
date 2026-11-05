# Spec 020: Realistic 3D appliance in the product story

Client/owner direction 2026-11-05: the CSS-drawn appliance in the home product story becomes a realistic, customisable 3D appliance. It is a GENERIC appliance (no brand, no exact model); real product photos live on the product page, and the section says so.

## Phase 1 (this spec's first delivery): the refrigerator
- WebGL scene built in code with `three` (procedural geometry, no model files): rounded-bevel body, two doors (freezer + fresh) with chrome bar handles, door seals, glass shelves, interior LED light and simple props, adjustable feet.
- Realism: physically based materials (brushed steel, glossy enamel, black glass, chrome, rubber) with a procedural environment map, ACES tone mapping, soft contact shadow, subtle floor reflection. Transparent canvas over the section background.
- Interaction: drag to rotate with inertia (limited yaw, tiny pitch), the doors open/close driven by the existing pinned scroll scene (progress 0..1), visitor-selectable finish swatches (steel, white, black, champagne).
- Illustration hint under the scene (ar/en): that this is a generic illustration and the real product photos are on the product page.
- Loads after the visitor's first input (like the story itself); `three` stays out of the first-load budget. Falls back to the current CSS appliance without WebGL, on `prefers-reduced-motion` (static frame) or if loading fails.
- Pauses rendering offscreen and when the tab is hidden; disposes everything on unmount; DPR capped.

## Later phases
- Washer, cooker (with flames), AC, TV in the same style; admin controls (appliance kind already exists in the CMS; add finish and linked product); optional "best sellers" carousel using real sales data.

## Done when
- Fridge renders convincingly at 1440 and 390, Arabic RTL, no layout shift, no console errors, 60fps on a mid laptop; fallback works; lint, typecheck, tests green; home first-load script size unchanged (three in its own lazy chunk).
