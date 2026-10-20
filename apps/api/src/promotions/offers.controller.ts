import { Controller, Get, Header } from '@nestjs/common'
import type { OffersResponse } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { OffersService } from './offers.service.js'

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  /**
   * GET /api/offers
   * Public endpoint returning running flash sales (with products) and non-flash discounted products.
   */
  @Get()
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  async getOffers(): Promise<OffersResponse> {
    return this.offersService.getOffers()
  }
}
