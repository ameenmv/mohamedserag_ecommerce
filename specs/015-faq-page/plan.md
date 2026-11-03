# Plan 015: FAQ page

Branch `013-client-feedback-round-1` · Spec: [spec.md](spec.md)

## Findings

- `/pages/faq` is a generic CMS page (`Page` model: slug, title, body rich text, translations, published) rendered by `pages/pages/[slug].vue`; `PAGE_SLUG_ORDER` and the footer know the `faq` slug.
- Admin content pages editor exists (`components/admin/content/pages`), admin API in `apps/api/src/admin-content`, public API in `apps/api/src/content`, shared Zod schemas in `packages/shared/src/content-schema.ts`.
- Rules: Zod at every boundary, `@RequirePermission` on admin routes, admin strings in `i18n/admin/*`, ar/en parity, integer-free (no money here).

## Decisions

1. **Data:** new Prisma model `FaqEntry` (id, topic enum-like string key, question, answer (sanitised HTML via the same sanitiser as pages), `translations` JSON `{ en: { question, answer } }`, sort, visible, timestamps) plus topics as a fixed shared list (`delivery-payment`, `warranty`, `returns`, `products`, `wholesale`) with ar/en labels in i18n. One migration.
2. **API:** public `GET /faq` (visible entries, ordered, localized by `Accept-Language`/locale like other content); admin CRUD under the content admin module with `content` permission, Zod schemas in `@serag/shared`, audit-log entries like other content.
3. **Storefront:** a dedicated route `pages/faq.vue` (takes precedence over `pages/[slug]`), thin page composing `StoreFaq*` components: premium header (Alexandria black title, gold hairline), topic tabs, search (uses `normalizeArabic`), accordion (one open at a time, `aria-expanded`, `aria-controls`, region, keyboard, CSS height animation via grid-rows trick, reduced motion off), anchor deep links (`#q-<id>`), contact card (WhatsApp/phone from store settings), FAQPage JSON-LD through the existing SEO helper. The CMS `faq` page entry is kept as fallback only when no FAQ entries exist.
4. **Admin:** a "FAQ" screen under Content: list grouped by topic with drag/up-down ordering, add/edit sheet (topic, question, answer rich text, English tab, visible), delete with confirm; follows the existing admin patterns (sheets, tables).
5. **Seed:** about 15 starter entries (Arabic and English) in the seed, idempotent: delivery times and areas (placeholders to confirm), payment on delivery, installation, warranty by brand, returns/exchange window, original products, wholesale pricing, store hours/location, tracking an order.

## Risks

- Policy facts are placeholders: mark them in the seed and in the report so the client confirms.
- Home JS budget is untouched (FAQ is its own route).
- The sanitiser must be reused, not re-implemented.
