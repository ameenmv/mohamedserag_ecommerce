import { Injectable } from '@nestjs/common'
import {
  buildCartQuote,
  type CartQuote,
  type CartQuoteInput,
} from '@serag/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'
import { loadCartProducts } from './cart-products.js'
import { CouponService } from './coupon.service.js'
import { isFirstOrderForPhone } from './first-order.js'

@Injectable()
export class CartQuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: StoreSettingsService,
    private readonly couponService: CouponService,
  ) {}

  /**
   * Evaluates cart pricing, availability, zone fees, and coupons.
   */
  async getCartQuote(input: CartQuoteInput, ip?: string): Promise<CartQuote> {
    const productIds = input.items.map((i) => i.productId)
    const products = await loadCartProducts(this.prisma, productIds)

    const [zones, codDeposit, deliveryOffers, coupon, isFirstOrder] = await Promise.all([
      this.settingsService.getZones(),
      this.settingsService.getCodDeposit(),
      this.settingsService.getDeliveryOffers(),
      this.couponService.evaluateForQuote(
        input.couponCode,
        products,
        input.items,
        input.phone,
        ip,
      ),
      isFirstOrderForPhone(this.prisma, input.phone),
    ])

    return buildCartQuote(input, products, {
      zones,
      codDeposit,
      coupon,
      deliveryOffers,
      isFirstOrder,
    })
  }
}
