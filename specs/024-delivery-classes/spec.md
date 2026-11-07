# 024: Delivery fee by shipping class, with its own admin page

## Why
A fridge and a cookware set cost very different amounts to deliver, but today the fee depends only on the zone (`packages/shared/src/zones.ts`, one `fee` per zone; `buildCartQuote` in `packages/shared/src/cart.ts`). The owner wants the fee to depend on what is in the order, and a clear separate settings page for everything about delivery.

## Decisions (owner, 2026-11-06)
- Three shipping classes instead of a price per category: `small` (cookware, kitchen tools, small appliances), `medium` (microwaves, small TVs, ACs), `large` (fridges, washers, cookers, freezers, large TVs).
- Fee table = zone × class. Outside Mansoura costs more, outside Dakahlia more again (zones already model this).
- An order pays once, at the largest class in the cart (fridge + pan = one "large" fee; two fridges = one "large" fee).
- Delivery only, installation is not charged.
- Free-delivery options exist but are off by default: free above an amount, and free first order. The owner has not chosen yet, so both are switches.
- Real numbers come from the client later; defaults below are placeholders the admin edits.

## Data
- `ShippingClass` enum in `@serag/shared`: `small | medium | large`.
- `Category.shippingClass` nullable. `null` means inherit from the parent; a root with `null` resolves to `large` (never undercharge).
- `Product.shippingClass` nullable override (e.g. an 85" TV in a "medium" category).
- Resolution order: product override → category → ancestors → `large`. Pure function in shared, unit-tested.
- Zone setting: `fee` becomes `fees: { small, medium, large }` (piastres). Reading an old zone with only `fee` migrates it in the schema: `large = fee`, `medium = round(fee × 0.75)`, `small = round(fee × 0.5)` (rounded to whole pounds). Saving writes the new shape.
- New setting `deliveryOffers`:
  - `freeAbove: { enabled: false, amount: piastres, classes: ShippingClass[] }`: subtotal after discount ≥ amount and the order's class is in `classes`.
  - `firstOrderFree: { enabled: false, classes: ShippingClass[] }`: no earlier non-cancelled order with the same normalized phone.
- Hand-written Prisma migration for the two nullable columns.

## Quote and order
- `buildCartQuote` takes each line's resolved class, picks the max, reads the zone's fee for that class, then applies offers. Quote returns `deliveryClass` and `deliveryFreeReason: 'threshold' | 'first_order' | null` alongside the fee.
- First-order check needs the phone: the quote/checkout request already carries customer data at order time. The API checks it when placing the order (authoritative) and in the quote when a phone is given.
- Order placement re-computes the fee server-side (current behaviour); the stored `deliveryFee` stays a snapshot.
- Bridal reservations keep using the zone fee for `large`.

## Admin: new page "التوصيل" (`/admin/delivery`, own nav item under the store group)
Separate from Settings. The current "مناطق التوصيل" tab moves here and is removed from Settings.
1. **Fees table**: one row per zone (name, governorates/places as today), three money inputs (small / medium / large). Add/remove zone as today.
2. **Category classes**: the category tree with a select per category: inherit (shows the resolved value), small, medium, large.
3. **Offers**: two cards with a switch each; free-above has an amount and class checkboxes; first-order has class checkboxes.
4. A short live example line: "Fridge + pan to Mansoura = X EGP".
- Product form: optional "Delivery class" select in the basics card, default "From category (resolved value)".
- Permission: same permission as current settings (`settings` manage). Audit log entries like other settings.

## Storefront
- Cart and checkout show the fee for the cart's class; when free, show "توصيل مجاني" with the reason.
- When `freeAbove` is enabled and the cart is under the amount, the cart shows "باقي X ج.م وتوصيلك مجاني".
- No change to the product page copy in this slice.

## Out of scope
Per-category custom prices, weight/volume, courier vs store-truck rules, installation fees, coupons that waive delivery.

## Acceptance
- Shared unit tests: class resolution, max-class pick, zone fee by class, old-zone migration, both offers (on/off, class filter, boundary amount).
- API tests: quote and order fee for small-only, mixed, large-only carts; first-order free with a repeat phone.
- Admin page works in ar/en, 1280 and 375 px; Settings no longer shows the zones tab.
- Gates green.
