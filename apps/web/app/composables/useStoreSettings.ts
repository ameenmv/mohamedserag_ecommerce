import { storePhoneDisplay, storeWhatsappDigits } from '~/utils/store-settings'

export interface StoreSettings {
  readonly whatsapp: string
  readonly phone: string
  readonly name: string
  readonly installmentMinPrice: number
}

/** Minimum installment price: 10,000 EGP in integer piastres. */
const INSTALLMENT_MIN_PRICE_PIASTRES = 1_000_000

/**
 * Storefront public settings loaded from `GET /settings/store`.
 * Shares the `'store:info'` fetch with the site-wide JSON-LD so it is
 * requested only once per navigation.
 *
 * `whatsapp` and `phone` are empty strings when the value is missing or
 * still a `[placeholder]`; callers must hide the corresponding links.
 */
export function useStoreSettings(): StoreSettings {
  const { t } = useI18n()
  const storeApi = useStoreApi()
  const { data } = useAsyncData('store:info', () => storeApi.storeInfo())

  const whatsapp = computed(() => storeWhatsappDigits(data.value?.whatsapp))
  const phone = computed(() => storePhoneDisplay(data.value?.phone))
  const name = computed(() => {
    const value = data.value?.name?.trim() ?? ''
    if (value === '' || value.includes('[')) {
      return t('brand.storeName')
    }
    return value
  })

  return {
    get whatsapp() {
      return whatsapp.value
    },
    get phone() {
      return phone.value
    },
    get name() {
      return name.value
    },
    installmentMinPrice: INSTALLMENT_MIN_PRICE_PIASTRES,
  }
}
