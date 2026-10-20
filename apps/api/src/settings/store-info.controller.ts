import { Controller, Get } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import type { PublicStoreInfo } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { StoreSettingsService } from './store-settings.service.js'

@Controller('settings/store')
export class StoreInfoController {
  constructor(private readonly storeSettings: StoreSettingsService) {}

  /**
   * GET /api/settings/store
   * Public store details (name, phones, WhatsApp numbers, address, hours) for the
   * storefront footer, the traders page and structured data.
   *
   * Not throttled: every storefront page renders it server-side, so a single visitor
   * triggers many of these calls per page view and the per-IP limit would drop the store's
   * contact links under normal traffic. It is a single cheap read with no user input, and
   * the response is identical for every visitor, which is why it is exempt rather than
   * relying on the forwarded visitor IP.
   */
  @Get()
  @Public()
  @SkipThrottle()
  async getStoreInfo(): Promise<PublicStoreInfo> {
    return this.storeSettings.getStoreInfo()
  }
}
