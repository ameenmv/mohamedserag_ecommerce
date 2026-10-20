# Feature Specification: Slice 6 — Content, CMS & SEO

**Feature Branch**: `007-content-seo`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Slice 6 — Content, CMS & SEO (PRD E10, E11, US-2.5, US-12.6; umbrella T070–T075): CMS-driven homepage with draft → preview → publish and version history; content pages (about, policies, FAQ) with a rich-text editor and SEO fields; buying guides blog; traders page; «ساعدني أختار» quiz with admin-editable questions and scoring rules; SEO (structured data, sitemap, robots, canonical URLs, landing-page meta); Google Merchant feed."

Product source of truth: [docs/PRD.md](../../docs/PRD.md) (E10 US-10.1, E11 US-11.1–11.5, E2 US-2.5, E12 US-12.6, §5 site map, §7 performance/SEO). Builds on [002-phase1-launch](../002-phase1-launch/spec.md) (catalog, category/brand intro and SEO fields already editable), [005-promotions-alerts](../005-promotions-alerts/spec.md) (flash prices) and [006-reviews](../006-reviews/spec.md) (approved-review ratings). The admin CMS editor follows the approved prototype (`prototype/admin/cms.html`, `prototype/admin/assets/pages/cms.js`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shopper sees a living homepage (Priority: P1)

A shopper opens the home page and sees the store's sections in the order the store chose: announcement bar, hero, the four promises strip, featured categories, the running flash sale, the bridal teaser, the traders teaser, the about teaser, partner brands and the latest guides. Sections the store hid do not appear; a flash-sale or guides section with nothing to show disappears instead of showing an empty box.

**Why this priority**: The home page is still a placeholder; it is the first page most shoppers and Google see, and every other slice's features (offers, bridal, traders, guides) are reached from it.

**Independent Test**: Open `/` → the sections of the published home appear in the published order with their published text → hide the traders section and publish in the admin → reload `/` → the traders section is gone and the others keep their order → end every flash sale → the flash section is not shown.

**Acceptance Scenarios**:

1. **Given** a published home version, **When** a shopper opens `/`, **Then** the page is server-rendered with the published sections in the published order and the published text, images and links.
2. **Given** a section marked hidden in the published version, **Then** it is not rendered at all.
3. **Given** the flash section is visible but no flash sale is running (or no guides are published), **Then** that section is omitted rather than shown empty.
4. **Given** a draft with unpublished changes, **Then** shoppers still see only the published version.
5. **Given** a phone at 320 px, **Then** every section fits without horizontal scrolling and the page meets the existing performance budget.

---

### User Story 2 - Admin edits and publishes the homepage (Priority: P1)

The admin opens «محرر الموقع», picks a section, edits its fields, reorders sections and shows or hides them, and sees a live desktop/mobile preview of the draft. Changed fields are marked against the published version. «انشر على الموقع» publishes the draft as a new version with a label; «رجّع كل التعديلات» discards the draft (with undo); the version history lists past versions and any of them can be restored into the draft.

**Why this priority**: The PRD's goal is that the site stays fresh without a developer; without the editor the home page can only change through code.

**Independent Test**: Edit the hero title → the preview updates and the field is marked changed → the public home is unchanged → move «تجهيز العرايس» above the categories and hide the traders section → publish → the public home shows the new title and order without the traders section → restore the previous version from the history → publish → the public home is back as it was.

**Acceptance Scenarios**:

1. **Given** the editor, **When** the admin edits a field, **Then** the draft is saved automatically and the preview (desktop and mobile widths) reflects it immediately; the field shows it differs from the published value and can be reset to it.
2. **Given** a draft, **When** the admin reorders or hides sections, **Then** the preview follows and the publish bar counts the pending changes.
3. **Given** pending changes, **When** the admin publishes (button or Ctrl/⌘+Enter), **Then** a new published version is stored with a label, time and author, and the public home shows it within one minute.
4. **Given** pending changes, **When** the admin discards them, **Then** the draft returns to the published version and an undo toast can bring the changes back.
5. **Given** the version history, **When** the admin restores a version, **Then** its content and layout become the draft (not published until the admin publishes).
6. **Given** invalid input (empty hero title, a link that is not a site path or https URL, text over its limit), **Then** the field shows an inline error and publishing is blocked until it is fixed.
7. **Given** an admin without `content.manage`, **Then** the editor and its API are refused.

---

### User Story 3 - Shopper reads store pages and the traders page (Priority: P1)

A shopper opens «من نحن», the delivery, returns, warranty and privacy policies, or the FAQ from the footer and reads them as formatted text. A trader opens `/traders`, sees who the store serves and which brands it carries, and taps «كلّم قسم الجملة على واتساب», which opens WhatsApp to the traders number with a message asking for their business name and governorate. The admin edits each page's title, body (rich text) and SEO title/description and can unpublish a page.

**Why this priority**: Policies are required for trust and legal clarity (returns per Consumer Protection Law 181/2018), and the traders section is a launch audience in the PRD.

**Independent Test**: Edit the returns policy body in the admin (add a bold line and a list) and its SEO title → open `/pages/returns` → the formatted text and the new browser title appear → unpublish the FAQ → `/pages/faq` answers «الصفحة دي مش موجودة» with a 404 and the footer no longer links to it → open `/traders` and tap the WhatsApp button → the link targets the traders number with the prefilled message.

**Acceptance Scenarios**:

1. **Given** a published page, **When** a shopper opens `/pages/:slug`, **Then** the title and formatted body render server-side with the page's SEO title and description.
2. **Given** an unpublished or unknown page, **Then** the shopper gets a 404 page and the footer omits it.
3. **Given** the admin pages editor, **When** the admin saves a body containing scripts, inline event handlers, styles or links with `javascript:`, **Then** those are removed before storing and never reach shoppers.
4. **Given** `/traders`, **Then** the WhatsApp button opens the traders WhatsApp number from settings with a prefilled Arabic message asking for the business name and governorate; with no traders number set it falls back to the main WhatsApp number.

---

### User Story 4 - Shopper reads buying guides (Priority: P2)

A shopper opens «دليل الشراء» and sees published guides newest first with cover, title and summary; opening a guide shows the article, its category tags and up to four related products as normal product cards. The admin creates, edits, publishes and unpublishes guides (title, slug, cover image, summary, body, categories, related products, SEO fields). The three guides from the prototype are migrated.

**Why this priority**: Guides drive search traffic and help unsure buyers, but the store can launch with policies and the home page first.

**Independent Test**: Create a guide with a cover, two categories and three related products and publish it → it appears first on `/guides` and in the home guides section → open it → the body, tags and three product cards show → unpublish it → it disappears from the list, the home section and the sitemap, and its URL answers 404.

**Acceptance Scenarios**:

1. **Given** published guides, **Then** `/guides` lists them newest first (12 per page) and `/guides/:slug` renders the article server-side with its SEO fields and `Article` structured data.
2. **Given** a guide's related products, **Then** only visible, non-archived products are shown, as standard product cards (with flash prices and ratings).
3. **Given** a slug already used by another guide, **Then** saving is refused with a clear message.
4. **Given** an unpublished guide, **Then** shoppers get 404 and the admin can still preview it.

---

### User Story 5 - Unsure shopper takes the «ساعدني أختار» quiz (Priority: P2)

On the fridges, washers, TVs or ACs category page a shopper taps «ساعدني أختار», answers 3–5 questions (each with «مش متأكد»), and gets up to three recommended in-stock products, each with a one-line reason, plus «شوف كل النتايج». The admin edits each quiz's questions, answers and scoring rules.

**Why this priority**: The quiz converts unsure shoppers, but it depends on good spec data and is not needed to sell.

**Independent Test**: Seed four fridges with different capacities and inverter flags → answer «عيلة 5 أفراد أو أكتر» and «موفّر في الكهربا» → the top result is the large inverter fridge with the reason «مناسبة لعيلة كبيرة» → answer «مش متأكد» to everything → three results ordered by popularity → change a rule's points in the admin → the ranking changes accordingly.

**Acceptance Scenarios**:

1. **Given** a quiz for the category, **When** the shopper finishes, **Then** visible, orderable products in the category are scored by the rules of the chosen answers; the top three are shown; ties go to the more popular product; each shows the label of its highest-scoring matched rule as the reason.
2. **Given** «مش متأكد» on a question, **Then** that question adds no points.
3. **Given** no product scores above zero, **Then** the three most popular orderable products are shown with a neutral reason.
4. **Given** «شوف كل النتايج», **Then** the shopper lands on the category listing.
5. **Given** a category with no quiz, **Then** no quiz entry point is shown.
6. **Given** the admin quiz editor, **Then** the admin can add, edit, reorder and remove questions and answers (3–5 questions, 2–6 answers each plus the automatic «مش متأكد») and rules of the form *spec field + condition + value → points + reason label*, validated against the category's spec template.

---

### User Story 6 - Search engines understand the store (Priority: P1)

Google and other crawlers get server-rendered pages with correct titles and descriptions, canonical URLs, a sitemap of every public page, a robots file that keeps private pages out, and structured data: `Product` + `Offer` + `AggregateRating` + `BreadcrumbList` on products, `BreadcrumbList` on category and brand pages, `Article` on guides, and `LocalBusiness` (with the showroom address and hours) site-wide.

**Why this priority**: The PRD's growth plan depends on local search («ثلاجات سامسونج في المنصورة») and Google Shopping.

**Independent Test**: Fetch `/sitemap.xml` → it lists the home, shop, offers, bridal, traders, every visible category, brand and product, every published page and guide, and nothing private → fetch `/robots.txt` → it disallows admin, cart, checkout, order, compare, wishlist and bridal list URLs and points to the sitemap → open `/c/refrigerators?brand=samsung&sort=price_asc` → its canonical is `/c/refrigerators` → validate a product page's structured data → Product, Offer, AggregateRating (when reviews exist) and BreadcrumbList are present.

**Acceptance Scenarios**:

1. **Given** the sitemap, **Then** it lists only public, visible, non-archived URLs with last-modified dates, includes English alternates, and refreshes within an hour of content changes.
2. **Given** robots.txt, **Then** private and personal URLs are disallowed and the sitemap and feed locations are declared.
3. **Given** a filtered, sorted or paginated listing, **Then** its canonical URL is the clean category, brand, shop or search path (page 2+ keeps its `page` parameter) and no duplicate content is indexable.
4. **Given** product, category, brand, guide and page URLs, **Then** each has a title, description, canonical and Open Graph tags, and the English version declares `hreflang` alternates.
5. **Given** every public page, **Then** the `LocalBusiness` block carries the store name, address, phone and opening hours from settings, and is omitted while those settings still hold placeholders.

---

### User Story 7 - Products appear in Google Shopping (Priority: P1)

The store submits `/feeds/google.xml` to Google Merchant Center; the feed lists every in-stock, visible product with id, title, description, link, image, price, sale price during a running flash sale, availability, brand and condition.

**Why this priority**: The PRD names Google Shopping as a launch traffic channel.

**Independent Test**: Fetch `/feeds/google.xml` → it is valid RSS 2.0 with the Google namespace → a product on a running flash sale shows its regular price and the sale price with the sale's end date → an out-of-stock product and a hidden product are absent → put a product back in stock → within an hour it appears.

**Acceptance Scenarios**:

1. **Given** the feed, **Then** each item has `g:id` (model code), title, description (plain text, ≤ 5000 chars), link (absolute product URL), `g:image_link` (absolute), `g:price` in EGP, `g:availability`, `g:brand`, `g:condition` new, and `g:sale_price` plus `g:sale_price_effective_date` while a flash sale runs.
2. **Given** products that are hidden, archived, out of stock or on request, or that have no image, **Then** they are not in the feed.
3. **Given** a change to price, stock or a flash sale, **Then** the feed reflects it within one hour.

---

### Edge Cases

- No published home version exists (fresh database): the home page renders the built-in default sections from the seed defaults instead of failing.
- The admin publishes while another browser tab holds an older draft: the publish uses the draft that was saved last; the editor reloads the draft when the tab regains focus.
- A home section links to a category, brand, product or guide that was later hidden or deleted: the link is dropped from the rendered section (categories) or the section still renders with its other content; the editor flags the broken reference.
- Uploaded images (hero, guide covers) reuse the product image rules: JPEG/PNG/WebP up to the existing size limit, stored and served the same way.
- Rich text pasted from Word or a website keeps headings, paragraphs, bold/italic, lists, links and quotes only; everything else is stripped.
- A quiz rule refers to a spec field that is later removed from the category template: the rule is ignored when scoring and flagged in the editor.
- Very large catalogs: the sitemap and the feed stream their output and stay under the search engines' limits (50,000 URLs per sitemap; split into an index if exceeded).
- Store settings still hold placeholders («[رقم الهاتف]», «[عنوان المعرض]»): `LocalBusiness` is omitted and the traders WhatsApp button falls back to the main number; the admin dashboard keeps flagging the missing data.

## Requirements *(mandatory)*

### Homepage CMS

- **FR-001**: The system MUST store the homepage as versions, each with section content, section order and hidden flags, a label, author and time; exactly one version is published and at most one is the working draft.
- **FR-002**: The home sections MUST be: announcement bar, hero, promises strip, featured categories, flash sale, bridal teaser, traders teaser, about teaser, partner brands, guides. Each section has a fixed set of typed, length-limited fields validated on save and on publish.
- **FR-003**: The public home MUST render only the published version, server-side, in its order, skipping hidden sections and sections with no data to show.
- **FR-004**: The editor MUST autosave the draft, show per-field "changed" markers with reset, reorder and show/hide sections, and preview the draft at desktop and mobile widths.
- **FR-005**: Publishing MUST create a new published version from the draft, keep the previous ones in a history (at least the last 20), and support discard-draft with undo and restore-version-into-draft.
- **FR-006**: Links in home content MUST be either site paths or https URLs; images MUST come from the store's own uploads.

### Pages and traders

- **FR-007**: Content pages (about, delivery, returns, warranty, privacy, FAQ) MUST have title, rich-text body, SEO title/description and a published flag, editable in the admin; `/pages/:slug` renders published pages and 404s otherwise.
- **FR-008**: Rich text MUST be sanitized on save to an allowlist (headings h2–h4, paragraphs, line breaks, bold, italic, ordered/unordered lists, links with http(s)/mailto/tel or site paths, blockquotes, and in guides images from the store's uploads); links that leave the site open in a new tab with `rel="noopener"`.
- **FR-009**: `/traders` MUST present the wholesale offer and a WhatsApp button to the traders number (falling back to the main number) with a prefilled message asking for business name and governorate; its texts come from the home traders section and settings.

### Guides

- **FR-010**: Guides MUST have title, unique slug, cover image, summary, rich-text body, category tags, up to four related products, SEO fields, published flag and publish date; `/guides` lists published guides newest first with paging, and `/guides/:slug` renders one.
- **FR-011**: The home guides section MUST show the latest three published guides.
- **FR-012**: The three prototype guides MUST be migrated into the seed as published guides.

### Quiz

- **FR-013**: Each quiz-enabled category (fridges, washers, TVs, ACs at launch) MUST have 3–5 questions with 2–6 answers each plus «مش متأكد», and rules *spec field + condition (=, ≠, ≥, ≤, contains, is true) + value → points (−5…+5) + reason label*, editable in the admin and validated against the category's spec template.
- **FR-014**: Scoring MUST consider visible, orderable products in the category, add the points of every matched rule of the chosen answers, return the top three (ties broken by popularity), give each the label of its highest-scoring matched rule as the reason, and fall back to the three most popular products when nothing scores.
- **FR-015**: Quiz answers and results MUST NOT be stored with personal data; a `quiz_completed` funnel event carries only the category and the result count.

### SEO and feed

- **FR-016**: Every public page MUST have a title, description, canonical URL and Open Graph tags; filtered, sorted and searched listings canonicalize to their clean path (keeping `page` ≥ 2); English pages declare `hreflang` alternates for ar/en.
- **FR-017**: The site MUST serve `/sitemap.xml` with all public, visible URLs (home, shop, offers, bridal, traders, categories, brands, products, published pages and guides) and `/robots.txt` disallowing admin, cart, checkout, order, compare, wishlist, bridal list, confirm and API URLs, declaring the sitemap.
- **FR-018**: Structured data MUST include `Product` + `Offer` (+ `AggregateRating` from approved reviews only) + `BreadcrumbList` on product pages, `BreadcrumbList` on category and brand pages, `Article` on guides, and a site-wide `LocalBusiness` built from store settings (omitted while placeholders remain).
- **FR-019**: `/feeds/google.xml` MUST list in-stock, visible, non-archived products that have an image, with the fields of US-11.5 and the flash sale price and dates while a sale runs, and MUST reflect catalog changes within one hour.

### Security, permissions and language

- **FR-020**: All admin content endpoints (home, pages, guides, quiz, uploads for them) MUST require `content.manage`, CSRF on mutations, and write audit entries.
- **FR-021**: Public content endpoints MUST return published content only and never drafts, authors or audit data.
- **FR-022**: All interface text MUST exist in Arabic and English; store content (home texts, pages, guides, quiz) is authored in Arabic only at launch and shown as-is on the English site.

### Key Entities

- **Content version** (exists): the home page's content, layout (order + hidden), status (draft/published), label, author, published time.
- **Page** (exists): slug, title, sanitized body, SEO fields, published flag.
- **Guide** (exists; gains summary): slug, title, cover, summary, sanitized body, category tags, related products, SEO fields, published flag and date.
- **Quiz** (exists as `QuizRule`, one per category): questions with answers, and scoring rules tied to answers.
- **Store settings** (exist): name, phones, WhatsApp numbers (main, traders), address and opening hours used by `LocalBusiness` and the traders page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The admin can change a home text, reorder a section and publish in under 2 minutes without help, and the public home shows the change within one minute.
- **SC-002**: Restoring any of the last 20 home versions and publishing it takes under 30 seconds.
- **SC-003**: The home page keeps the existing performance budget on mobile (LCP < 2.5 s, CLS < 0.1, Lighthouse performance ≥ 0.9, accessibility = 1).
- **SC-004**: 100 % of public pages have a unique title, description and canonical; Google's Rich Results test reports no errors for product, guide and home pages.
- **SC-005**: The Merchant feed validates in Google Merchant Center with zero errors for products that have complete data, and price or stock changes appear in it within one hour.
- **SC-006**: A shopper completes the quiz in under 60 seconds and gets three recommendations whenever the category has at least three orderable products.
- **SC-007**: No script, style or event-handler markup saved in pages or guides ever reaches the storefront (verified by automated tests).

## Assumptions

- The data tables for content versions, pages, guides and quiz rules already exist from Slice 0; this slice adds at most small fields (e.g. a guide summary) through a migration.
- Category and brand intro text and SEO fields are already editable (Slice 1); this slice only makes sure their pages emit the right meta, canonical and breadcrumbs.
- A single admin edits content at a time (one shared draft); concurrent editing protection is limited to "last saved draft wins" with a reload on focus.
- Store content is Arabic-only at launch (FR-022); translating content is out of scope.
- Image uploads reuse the existing product image storage, limits and serving.
- The Merchant feed and sitemap may be cached for up to one hour.
- Final legal wording of the returns policy remains the store's lawyer's responsibility; the seed keeps marked placeholder texts.
- Analytics for content uses the existing privacy-safe funnel events; no new tracking tools.
