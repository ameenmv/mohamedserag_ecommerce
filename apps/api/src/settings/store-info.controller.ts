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
   * Not throttled: every storefront page renders it server-side, and those calls all reach
   * the API from the web server's address, so the per-IP limit would drop the store's
   * contact links under normal traffic. It is a single cheap read with no user input.
   */
  @Get()
  @Public()
  @SkipThrottle()
  async getStoreInfo(): Promise<PublicStoreInfo> {
    return this.storeSettings.getStoreInfo()
  }
}
