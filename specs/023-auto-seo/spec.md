# 023: Automatic product SEO (slug, title, description)

## Why
The admin should not type a slug, an SEO title or an SEO description for every product. These are built from the product itself. Manual values stay possible for the rare product that needs them, behind a closed "advanced" section.

## Decisions (agreed with the owner, 2026-11-06)
1. Slugs are English, kebab-case: `{brand}-{category noun}-{model}`, e.g. `fresh-cooker-sr-s15`.
2. Only new products get the new slug format. Existing slugs are not touched; no redirect table in this slice.
3. Title and description templates are fixed in code (not editable in settings). Per-product manual override stays optional.

## Behaviour

### Slug
- On create with an empty slug, the API builds `{brandSlug}-{singular(categorySlug)}-{slugify(modelCode)}`, de-duplicates segments (if the model code already starts with the brand, do not repeat it), caps at 80 chars at a dash boundary, and appends `-xxxx` (nanoid 4) only on collision (current behaviour).
- `singular`: `ies` → `y`; trailing `s` dropped unless the word ends in `ss`; otherwise unchanged.
- A slug the admin types is still accepted (current validation and uniqueness check).
- After a product exists, the slug input is read-only with an "Edit link" button. Clicking it shows a warning (old shared links will stop working) and unlocks the field.

### Title (computed at render time, never stored)
- Arabic: `{name} {brand} {modelCode} | معرض محمد سراج` ; English (`/en`): `{nameEn||name} {brand} {modelCode} | Mohamed Serag Store`.
- Skip brand/model if the name already contains them (case-insensitive). Cap at 60 chars: drop the store suffix first, then cut at a word boundary.
- Manual `seoTitle` (per locale, existing fields) wins when not empty.

### Description (computed at render time, never stored)
- Built from: name, brand, price, compare-at price (when there is a discount), warranty, availability, delivery and cash on delivery. Example (ar): `بوتاجاز غاز 4 شعلة فريش بـ 9,400 ج.م بدل 10,800. ضمان 5 سنوات فريش. توصيل لحد البيت والدفع عند الاستلام.`
- Out of stock: replace the price sentence with an "currently unavailable, ask to be notified" sentence. Cap at 155 chars at a sentence, then word, boundary.
- English variant with the same structure. Manual `seoDescription` wins when not empty.
- Because it is computed, a price change updates the description automatically.

### Admin product form
- The SEO card keeps the visible/featured switches as they are.
- Below them, a collapsed section "Google appearance (optional)" (`<details>`-style, closed by default) containing:
  - a Google-result preview (title, `domain/p/slug`, description) using the auto values, or the manual ones when filled;
  - the slug field (moved from the basics card), seoTitle and seoDescription inputs with the auto value as placeholder and the existing counters (60 / 155);
  - a one-line hint that empty fields are generated automatically.
- The section opens by default only when the product already has a manual seoTitle or seoDescription.
- English SEO inputs in the English section follow the same placeholder rule.

## Out of scope
Category and brand SEO, image alt text, a redirect table, a "custom SEO" badge in the product list, settings-editable templates.

## Acceptance
- Unit tests for the pure builders in `packages/shared` (slug, title, description: ar/en, discount, no discount, out of stock, truncation, name already containing brand/model).
- API: creating a product without a slug yields the new format; collision gets a suffix.
- Product page `<title>` and `meta[name=description]` use auto values when manual ones are empty, in both locales.
- Admin: new product shows the closed section with a live preview; existing product shows the slug read-only until "Edit link".
- Gates green.
