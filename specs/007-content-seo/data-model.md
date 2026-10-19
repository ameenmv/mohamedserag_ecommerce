# Data Model: Slice 6 — Content, CMS & SEO

All tables exist from Slice 0 unless marked **new**. One migration: `guides.summary`.

## content_versions (existing)

| Field | Type | Notes |
|---|---|---|
| id | cuid | |
| page | text | `'home'` in this slice |
| status | enum draft/published | at most one `draft` per page; newest `published` is current |
| data | json | `HomeContent` (validated by `homeContentSchema`) |
| layout | json | `{ order: SectionId[], hidden: SectionId[] }` (legacy `{ sections: [] }` read as `order`) |
| label | text? | e.g. «تعديل الهيرو» or «3 تعديل منشور» |
| publishedAt | timestamptz? | set on published rows |
| userId | fk users? | author |

Rules: publish = insert published row from draft in a transaction, then prune published rows beyond the newest 20 for that page. Restore = copy a published row into the draft. Discard = copy current published into the draft.

### HomeContent sections (shared `content.ts` / `content-schema.ts`)

| Section | Fields (max length) |
|---|---|
| announce | text (120), link? (path/https) |
| hero | eyebrow (40), title (80, required), subtitle (240), primaryCta {label 30, href}, secondaryCta? {label 30, href}, image? (/uploads/…), stats[≤3] {value 10, label 30} |
| uspStrip | items[4] {title 30, description 90} |
| featuredCategories | title (60), categorySlugs[≤8] |
| flash | title (60), subtitle (120) — products from the running flash sale |
| bridalTeaser | eyebrow (40), title (80), subtitle (300), cta {label, href} |
| tradersTeaser | badge (30), title (80), subtitle (300), cta {label, href}, points[≤4] (60) — also feeds `/traders` |
| aboutTeaser | eyebrow (40), title (80), subtitle (300), cta? {label, href} |
| partners | title (60) — visible brands that have a logo |
| guides | title (60) — latest 3 published guides |

## pages (existing)

slug (unique; about, delivery, returns, warranty, privacy, faq), title (≤ 120), body (sanitized HTML, ≤ 50 000 chars), seoTitle (≤ 70), seoDescription (≤ 160), published.

## guides (existing + **summary**)

| Field | Notes |
|---|---|
| slug | unique, `^[a-z0-9-]{3,80}$` |
| title | ≤ 120 |
| summary | **new**, text ≤ 280, used on cards and as fallback meta description |
| cover | `/uploads/...` |
| body | sanitized HTML (guide allowlist, images from uploads) |
| categoryIds | ≤ 4 category ids |
| productIds | ≤ 4 product ids (only visible, non-archived rendered) |
| seoTitle / seoDescription | ≤ 70 / ≤ 160 |
| published / publishedAt | publishedAt set on first publish |

Migration: `ALTER TABLE guides ADD COLUMN summary TEXT`.

## quiz_rules (existing, one per category)

`questions` json:
```json
[{ "id": "family", "text": "عددكم في البيت كام؟", "answers": [{ "id": "small", "text": "1–2" }, { "id": "large", "text": "5 أو أكتر" }] }]
```
`rules` json:
```json
[{ "answerId": "large", "field": "capacityL", "op": "gte", "value": 450, "points": 3, "reason": "مناسبة لعيلة كبيرة" }]
```
Validated by `quizDefinitionSchema`: 3–5 questions, 2–6 answers each (ids unique), rules reference existing answer ids, `op ∈ {eq, neq, gte, lte, contains, isTrue}`, `points ∈ [−5, 5]` integer, reason ≤ 60. «مش متأكد» is implicit (not stored).

## settings (existing)

`store`: name, phone, whatsapp, tradersWhatsapp, address, hours — read for `LocalBusiness` and `/traders`. Placeholder detection: any value containing `[`.

## Derived (not stored)

- Sitemap entries `{ path, lastmod }` from categories, brands, products, pages, guides + static paths.
- Feed items from products + flash sales + images + brands.
