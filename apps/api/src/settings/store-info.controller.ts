import { Controller, Get } from '@nestjs/common'
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
   */
  @Get()
  @Public()
  async getStoreInfo(): Promise<PublicStoreInfo> {
    return this.storeSettings.getStoreInfo()
  }
}
