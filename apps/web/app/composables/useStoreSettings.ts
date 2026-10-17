export interface StoreSettings {
  whatsapp: string
  phone: string
  name: string
  installmentMinPrice: number
}

/**
 * Storefront public settings.
 * TODO(Slice 6): Load public store settings from GET /api/settings/public instead of placeholder values.
 */
export function useStoreSettings(): StoreSettings {
  const base = useState('store-settings-raw', () => ({
    whatsapp: '201000000000',
    phone: '01000000000',
    installmentMinPrice: 1000000, // 10,000 EGP in integer piastres
  }))

  return {
    get whatsapp() {
      return base.value.whatsapp
    },
    set whatsapp(val: string) {
      base.value.whatsapp = val
    },
    get phone() {
      return base.value.phone
    },
    set phone(val: string) {
      base.value.phone = val
    },
    get installmentMinPrice() {
      return base.value.installmentMinPrice
    },
    set installmentMinPrice(val: number) {
      base.value.installmentMinPrice = val
    },
    get name() {
      return useNuxtApp().$i18n.t('brand.storeName')
    },
  }
}
