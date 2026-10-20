# Quickstart: Slice 7 — Dashboard, reports & settings

1. `pnpm install && pnpm --filter @serag/shared build`
2. Seed: `pnpm --filter @serag/api exec prisma db seed` (demo orders include delivered ones and deposits).
3. API + web on isolated ports (see `.agents/skills/serag-engineering` testing notes), log in as the seeded admin.
4. «نظرة عامة»: counters link to filtered pages; switch 7/30/90 days.
5. «التقارير»: pick «آخر 30 يوم», group by week, open each tab, export CSV and open it in Excel.
6. «الإعدادات»: change the store phone → footer and `/traders` update; disable a payment method → checkout hides it; edit a template → order WhatsApp preview uses it.
7. Gates: `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @serag/api test:e2e && pnpm build`, then `pnpm test:e2e` against the isolated servers.
