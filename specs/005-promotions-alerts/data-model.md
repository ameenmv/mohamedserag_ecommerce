# Data Model: Slice 4 — Promotions & Stock Alerts

All tables exist; no schema change is required.

## FlashSale (`flash_sales`)
name (1–80), startsAt, endsAt (> startsAt). Derived status: scheduled (now < start), running (start ≤ now < end), ended (now ≥ end).

## FlashSaleItem (`flash_sale_items`)
flashSaleId, productId (unique per sale), salePrice (piastres, 0 < salePrice < product.price at save time).

## Coupon (`coupons`)
code (upper-case, 3–20 chars `[A-Z0-9_-]`, unique), type percent|fixed, value (percent 1–90 / fixed > 0 piastres), minOrder ≥ 0, startsAt?, endsAt? (> startsAt), maxUses? ≥ 1, maxUsesPerPhone? ≥ 1, categoryIds[], brandIds[], active.
Derived: status (inactive / scheduled / running / expired), activeUses, totalDiscount (sum of active redemption amounts).

## CouponRedemption (`coupon_redemptions`)
couponId, orderId, customerPhone (normalized), amount, status active|released.
Transitions: created active with the order → released on cancelled / payment_rejected → active again on payment_rejected → confirmed / awaiting_deposit.

## Order
`couponId`, `discount` (exist). Discount = coupon discount; total = subtotal − discount + deliveryFee.

## NotifyRequest (`notify_requests`)
productId, name (2–60), phone (normalized, unique with productId), status waiting|sent, sentAt?, updatedAt.
