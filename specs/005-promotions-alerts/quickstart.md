# Quickstart: Validate Slice 4

1. **Flash** — admin creates a sale (now−1 min → now+1 h) with a fridge at a lower price → card, product page and /offers show the sale price + countdown → cart/order use it → «إنهاء العرض دلوقتي» → regular price everywhere.
2. **Coupon** — admin creates `SERAG10` (10%, min 5,000 ج.م, fridges) → checkout with a fridge + a discounted washer → discount on the fridge only → place order → cancel → redemption released.
3. **Notify me** — out-of-stock product → «بلّغني أول ما يوصل» → admin restocks → «ابعت على واتساب» marks it sent.

Gates: `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @serag/api test:e2e && pnpm test:e2e && pnpm build`
