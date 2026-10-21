# Research: Slice 6 — Content, CMS & SEO

## R1. Home versions: draft row + published history

**Decision**: Keep using `content_versions`. One row with `status = 'draft'` per page is the working copy (upserted on autosave). Publishing copies the draft into a new `published` row (label, author, `publishedAt`); the newest `published` row is current. Older published rows are the history; keep the newest 20 per page and delete older ones in the same transaction. Restore copies a history row into the draft. Discard copies the current published row into the draft; undo re-saves the previous draft content sent back by the client.
**Rationale**: Matches the existing table and seed (the seed already writes the first published version) and the prototype's model (draft vs published + versions list). No new table.
**Alternatives**: A `version` integer with a separate history table — more schema for no gain at one admin.

## R2. Section schema

**Decision**: `content.ts` lists `HOME_SECTION_IDS` (announce, hero, uspStrip, featuredCategories, flash, bridalTeaser, tradersTeaser, aboutTeaser, partners, guides) and `content-schema.ts` defines one Zod object per section with field length limits; `homeContentSchema` is an object of all sections; `homeLayoutSchema = { order: SectionId[] (each once), hidden: SectionId[] }`. The seed's current `layout.sections` array migrates to `order` (and `hidden: []`) via the seed and a tolerant reader. Dynamic sections (flash, guides, partners, featuredCategories) store only headings and references (category slugs; brands from visible brands with logos); their items come from live data at render time.
**Rationale**: Typed, validated content; the editor builds its form from the same field metadata (label key, kind, max length) exported from `content.ts`.

## R3. Rich text: TipTap in the admin, `sanitize-html` on the API

**Decision**: The admin edits with TipTap (StarterKit limited to h2–h4, paragraph, bold, italic, bullet/ordered list, blockquote, hard break; Link; Image only for guides). The API sanitizes every saved body with `sanitize-html` using the same allowlist (pages: no images; guides: `img` with `src` under `/uploads/` only, `alt` required), forces `rel="noopener noreferrer" target="_blank"` on external links, drops `javascript:`/`data:` URLs, styles, classes and event handlers. The storefront renders the sanitized HTML with `v-html` inside a `prose`-styled container.
**Rationale**: Sanitizing on the server makes the API the trust boundary (FR-008, SC-007); TipTap's schema keeps editor output inside the allowlist so sanitizing rarely changes content.
**Alternatives**: DOMPurify on the client — client sanitizing does not protect other consumers (feed, SSR) and runs on every view.

## R4. Image uploads for content

**Decision**: `POST /admin/content/images` (multipart `file`) stores under `uploads/content/<yyyy-mm>/<random>.<ext>` using the existing product-image validation (type sniffing JPEG/PNG/WebP, size limit) and serving path `/uploads/...`. Content links/images must start with `/uploads/` (images) or be a site path / https URL (links).
**Rationale**: Reuses proven code and the same Caddy/static serving.

## R5. Quiz scoring

**Decision**: Pure `scoreQuiz` in `@serag/shared/quiz.ts`. Input: products (id, popularity, spec values map, orderable), quiz definition, answers (`questionId → answerId | 'unsure'`). For every chosen answer, each rule of that answer whose condition matches the product's spec value adds its points; the reason is the label of the matched rule with the highest points. Result: products with score > 0 sorted by score desc, popularity desc, top 3; if none, top 3 by popularity with the neutral reason key. Conditions: `eq`, `neq`, `gte`, `lte`, `contains`, `isTrue` on spec template fields (numbers compared numerically, booleans for `isTrue`). The API loads visible, orderable products of the category with their spec values and popularity (same popularity source as listing sort), then calls `scoreQuiz`.
**Rationale**: Deterministic, unit-testable, no DB-specific logic; matches PRD US-2.5.

## R6. SEO plumbing

**Decision**:
- Meta/canonical/hreflang: a `useSeoPage({ title, description, canonicalPath, image? })` composable wrapping `useSeoMeta` + `useHead` link tags; `canonicalPath` from `@serag/shared/seo.ts` drops all query parameters except `page` ≥ 2. Search results (`/shop?q=…`) are `noindex, follow` and canonicalize to `/shop`.
- Sitemap: API `GET /seo/sitemap-entries` returns `{ path, lastmod }[]` for public entities; Nuxt `server/routes/sitemap.xml.ts` renders XML with ar + en (`/en` prefix) `xhtml:link` alternates, cached `swr: 3600`. Split into a sitemap index if entries > 45,000.
- robots: Nuxt server route (disallow `/admin`, `/en/admin`, `/cart`, `/checkout`, `/order/`, `/compare`, `/wishlist`, `/bridal/` lists by token, `/confirm`, `/api/`; `Sitemap:` line). Staging/non-production (`NUXT_PUBLIC_SITE_INDEXABLE !== 'true'`) answers `Disallow: /`.
- Structured data: `LocalBusiness` (type `HomeGoodsStore`) site-wide from store settings, omitted while any of name/address/phone/hours contains a `[` placeholder; `BreadcrumbList` on product/category/brand/guide; `Article` on guides.
- Absolute URLs from `NUXT_PUBLIC_SITE_URL` (new runtime config, default `http://localhost:3000`).
**Rationale**: API owns data and visibility rules; Nuxt owns URLs and locales.

## R7. Google Merchant feed

**Decision**: API `GET /feeds/google.xml` builds RSS 2.0 with `xmlns:g`, streaming items for products that are visible, not archived, availability state `in_stock` or `low`, with at least one image. Fields per US-11.5; prices from piastres → `"1234.00 EGP"`; flash sale → `g:sale_price` + `g:sale_price_effective_date` (`start/end` ISO 8601). Text fields XML-escaped; description = plain text stripped of any markup, ≤ 5000 chars. Nuxt `server/routes/feeds/google.xml.ts` proxies it with `swr: 3600` so the public URL is on the storefront origin. Absolute links use `siteUrl` passed from Nuxt (`?base=` ignored; the API reads `PUBLIC_SITE_URL` env shared via `.env`).
**Rationale**: Reuses card pricing (flash) logic in the API; one-hour freshness meets FR-019.

## R8. Fallbacks and caching of the home

**Decision**: `GET /content/home` returns the published version; if none exists, the API returns the built-in defaults exported from `@serag/shared/content.ts` (same as the seed). The Nuxt home uses `useAsyncData` with the content response; Nuxt `routeRules['/']` gets `swr: 60` so a publish shows within a minute; the admin "view site" link appends a cache-busting query.
**Rationale**: A 60 s SWR window keeps the Lighthouse budget while a publish still shows within a minute (spec SC-001).
