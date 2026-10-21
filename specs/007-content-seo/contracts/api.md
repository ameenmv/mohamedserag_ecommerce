# API Contracts: Slice 6 — Content, CMS & SEO

Base URL ends in `/api` (storefront XML routes are served by Nuxt on the site origin). Types live in `@serag/shared` (`content.ts`, `quiz.ts`, `seo.ts`).

## Public

| Method & path | Response | Notes |
|---|---|---|
| `GET /content/home` | `PublicHome { layout: { order, hidden }, sections: HomeContent, publishedAt }` | published version or built-in defaults; never draft/author |
| `GET /pages` | `{ items: { slug, title }[] }` | published pages, for the footer |
| `GET /pages/:slug` | `PublicPage { slug, title, body, seoTitle, seoDescription, updatedAt }` | 404 «الصفحة دي مش موجودة» when unpublished/unknown |
| `GET /guides?page=1&pageSize=12` | `{ items: GuideCard[], total, page, pageSize }` | published, `publishedAt desc`; `GuideCard = { slug, title, summary, cover, publishedAt, categories: { slug, name }[] }` |
| `GET /guides/:slug` | `PublicGuide = GuideCard & { body, seoTitle, seoDescription, updatedAt, products: ProductCard[] }` | 404 when unpublished/unknown; products visible & non-archived only, with flash + rating |
| `GET /quiz/:categorySlug` | `PublicQuiz { category: { slug, name }, questions: { id, text, answers: { id, text }[] }[] }` | 404 when the category has no quiz or is hidden; rules are not exposed |
| `POST /quiz/:categorySlug/results` | `{ items: { product: ProductCard, reason: string }[], fallback: boolean }` | body `{ answers: Record<questionId, answerId \| 'unsure'> }` (Zod); throttle 30/min/IP |
| `GET /seo/sitemap-entries` | `{ entries: { path: string, lastmod: string }[] }` | public, visible, non-archived only; static paths included |
| `GET /feeds/google.xml` | `application/rss+xml` | RSS 2.0 + `xmlns:g="http://base.google.com/ns/1.0"`; see R7 |

Storefront (Nuxt server routes, `swr: 3600`): `/sitemap.xml`, `/robots.txt`, `/feeds/google.xml` (proxy).

## Admin (`content.manage`, CSRF on mutations, `@Audit`)

| Method & path | Body → Response | Notes |
|---|---|---|
| `GET /admin/content/home` | → `AdminHomeState { draft: { sections, layout, updatedAt }, published: { sections, layout, publishedAt, label }, changes: number }` | draft = published when none exists |
| `PUT /admin/content/home/draft` | `{ sections, layout }` → `AdminHomeState` | autosave; validates shape and limits (400 with field paths) |
| `POST /admin/content/home/publish` | `{ label? }` → `AdminHomeState` | 409 «مفيش تعديلات للنشر» when draft equals published; prunes history to 20 |
| `POST /admin/content/home/discard` | → `AdminHomeState` | draft := published |
| `GET /admin/content/home/versions` | → `{ items: { id, label, publishedAt, author: { name } \| null, current: boolean }[] }` | newest first, ≤ 20 |
| `POST /admin/content/home/versions/:id/restore` | → `AdminHomeState` | version → draft (not published); 404 unknown |
| `POST /admin/content/images` | multipart `file` → `{ url }` | JPEG/PNG/WebP, product-image size limit; stored under `/uploads/content/` |
| `GET /admin/pages` | → `{ items: AdminPageRow[] }` | `AdminPageRow = { id, slug, title, published, updatedAt }` |
| `GET /admin/pages/:id` | → `AdminPage` (all fields) | |
| `PATCH /admin/pages/:id` | `pageInputSchema` (title, body, seoTitle, seoDescription, published) → `AdminPage` | body sanitized (pages allowlist); slugs fixed (no create/delete at launch) |
| `GET /admin/guides?q=&status=&page=` | → `{ items: AdminGuideRow[], total, page, pageSize }` | |
| `POST /admin/guides` | `guideInputSchema` → `AdminGuide` | 409 «الرابط ده مستخدم» on duplicate slug |
| `GET /admin/guides/:id` | → `AdminGuide` | includes product/category summaries for the pickers |
| `PATCH /admin/guides/:id` | `guideInputSchema` (partial) → `AdminGuide` | body sanitized (guides allowlist) |
| `DELETE /admin/guides/:id` | → 204 | |
| `GET /admin/quiz` | → `{ items: { categoryId, categorySlug, categoryName, hasQuiz, questionCount }[] }` | quiz-capable categories |
| `GET /admin/quiz/:categoryId` | → `{ category, specFields: { key, label, type }[], definition: QuizDefinition \| null, warnings: string[] }` | warnings for rules on removed spec fields |
| `PUT /admin/quiz/:categoryId` | `quizDefinitionSchema` → same as GET | validates rule fields/operators against the spec template (400) |
| `DELETE /admin/quiz/:categoryId` | → 204 | removes the quiz (entry point disappears) |

Errors use the existing `{ statusCode, message, issues? }` shape with Egyptian Arabic messages.
