# Quickstart: validating Slice 2

## Prerequisites
```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
```
Dev servers: `.claude/launch.json` configs `api` (port 4000) and `web` (port 3000).

## Gates
```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @serag/api test:e2e
pnpm test:e2e        # TesterArmy runner; stop dev servers on 3000/4000 first
pnpm build
```

## Scenarios (map to spec stories)
1. **COD order (US1)**: add two products → `/checkout` with الدقهلية / طلخا → fee = Mansoura zone → place → thank-you shows «هنكلمك نأكد الطلب»; admin list shows it at «جديد». e2e: `checkout-cod.e2e.ts` (also asserts < 90 s).
2. **Transfer + confirm link (US2)**: InstaPay order → thank-you WhatsApp link contains order no, amount and `/admin/confirm/<token>` → open as admin (login redirect returns) → confirm → «مؤكد», payment recorded, stock reduced. e2e: `checkout-transfer.e2e.ts`, `confirm-link.e2e.ts` (reject then confirm).
3. **Large COD deposit (US3)**: COD cart > 30,000 ج.م → deposit shown before placing → «بانتظار العربون» → confirm deposit → «مؤكد», remaining shown. e2e: `cod-deposit.e2e.ts`.
4. **Admin lifecycle (US4)**: dispatch → deliver; cancel a confirmed order restores stock; WhatsApp button opens the status template and is logged; CSV export and invoice print. e2e: `order-admin.e2e.ts`.
5. **Token secrecy**: `/order/<no>/thanks` without or with a wrong `t` shows nothing; `/admin/confirm/<token>` without a session redirects to login with no order data.

Contracts: [contracts/api.md](contracts/api.md). States and stock rules: [data-model.md](data-model.md).
