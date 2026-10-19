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
  async getCartQuote(input: CartQuoteInput): Promise<CartQuote> {
    const productIds = input.items.map((i) => i.productId)
    const products = await loadCartProducts(this.prisma, productIds)

    const [zones, codDeposit, coupon] = await Promise.all([
      this.settingsService.getZones(),
      this.settingsService.getCodDeposit(),
      this.couponService.evaluateForQuote(
        input.couponCode,
        products,
        input.items,
        input.phone,
      ),
    ])

    return buildCartQuote(input, products, { zones, codDeposit, coupon })
  }
}
