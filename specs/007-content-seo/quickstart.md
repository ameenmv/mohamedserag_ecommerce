# Quickstart: Slice 6 — Content, CMS & SEO

## Run

```bash
pnpm install                      # after Claude adds sanitize-html and TipTap
pnpm db:migrate                   # adds guides.summary
pnpm db:seed                      # home version, pages, 3 guides, 4 quizzes
pnpm dev
```

## Check each story

1. **Home**: open `/` → sections in the published order; `/admin/content` → edit the hero title → preview changes, `/` doesn't → publish → `/` shows it within a minute; hide «للتجار» → publish → gone; restore the previous version → publish.
2. **Pages & traders**: `/admin/content?tab=pages` → edit returns policy (bold + list) → `/pages/returns`; unpublish FAQ → `/pages/faq` 404 and the footer drops it; `/traders` → WhatsApp button opens the traders number with the prefilled message.
3. **Guides**: `/admin/content?tab=guides` → new guide with cover, 2 categories, 3 products → publish → `/guides` and the home guides section; unpublish → 404.
4. **Quiz**: `/c/refrigerators` → «ساعدني أختار» → answer → 3 products with reasons; `/admin/content?tab=quiz` → change a rule's points → ranking changes.
5. **SEO**: `/sitemap.xml`, `/robots.txt`; view source of a product, guide and `/c/refrigerators?sort=price_asc` → canonical, hreflang, JSON-LD (Rich Results test).
6. **Feed**: `/feeds/google.xml` → in-stock products only; a flash-sale product has `g:sale_price` and the effective date.

## Gates

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @serag/api test:e2e && pnpm build
# browser e2e on isolated servers (see docs): APP_URL=http://localhost:3200 API_URL=http://localhost:4200 pnpm test:e2e
```
