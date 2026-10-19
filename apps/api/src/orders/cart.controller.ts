import { Body, Controller, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common'
import {
  cartQuoteInputSchema,
  type CartQuote,
  type CartQuoteInput,
} from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { CartQuoteService } from './cart-quote.service.js'

@Controller('cart')
export class CartController {
  constructor(private readonly cartQuoteService: CartQuoteService) {}

  /**
   * POST /api/cart/quote
   * Validates cart items, calculates availability, live prices, zone fees, and coupons.
   */
  @Post('quote')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getQuote(
    @Body(new ZodValidationPipe(cartQuoteInputSchema)) body: CartQuoteInput,
    @Ip() ip: string,
  ): Promise<CartQuote> {
    return this.cartQuoteService.getCartQuote(body, ip)
  }
}
