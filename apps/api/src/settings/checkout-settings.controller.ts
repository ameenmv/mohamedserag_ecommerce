import { Controller, Get } from '@nestjs/common'
import {
  EGYPT_GOVERNORATES,
  type CheckoutPaymentMethod,
  type CheckoutSettings,
  type PaymentMethod,
} from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { StoreSettingsService } from './store-settings.service.js'

@Controller('settings/checkout')
export class CheckoutSettingsController {
  constructor(private readonly storeSettings: StoreSettingsService) {}

  /**
   * GET /api/settings/checkout
   * Public checkout settings endpoint returning enabled payment methods,
   * COD deposit rules, Egypt governorates list, and zone city suggestions.
   */
  @Get()
  @Public()
  async getCheckoutSettings(): Promise<CheckoutSettings> {
    const [payments, codDeposit, zones, storeWhatsapp] = await Promise.all([
      this.storeSettings.getPayments(),
      this.storeSettings.getCodDeposit(),
      this.storeSettings.getZones(),
      this.storeSettings.getStoreWhatsapp(),
    ])

    const methodOrder: readonly PaymentMethod[] = ['cod', 'instapay', 'vodafone_cash', 'fawry']
    const paymentMethods: CheckoutPaymentMethod[] = []

    for (const method of methodOrder) {
      const config = payments.methods[method]
      if (config && config.enabled) {
        paymentMethods.push({
          method,
          name: config.name,
          hint: config.hint ?? null,
          account: config.account ?? null,
        })
      }
    }

    const citySuggestions: Record<string, string[]> = {}
    for (const zone of zones) {
      for (const place of zone.places) {
        if (place.city) {
          const gov = place.governorate
          const currentList = citySuggestions[gov] ?? []
          if (!currentList.includes(place.city)) {
            citySuggestions[gov] = [...currentList, place.city]
          }
        }
      }
    }

    return {
      paymentMethods,
      codDeposit: {
        threshold: codDeposit.threshold,
        pct: codDeposit.pct,
      },
      storeWhatsapp,
      governorates: [...EGYPT_GOVERNORATES],
      citySuggestions,
    }
  }
}
