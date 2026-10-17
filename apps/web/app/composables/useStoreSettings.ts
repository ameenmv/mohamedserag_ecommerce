export interface StoreSettings {
  whatsapp: string
  phone: string
  name: string
}

/**
 * Storefront public settings.
 * TODO(Slice 6): Load public store settings from GET /api/settings/public instead of placeholder values.
 */
export function useStoreSettings(): StoreSettings {
  const base = useState('store-settings-raw', () => ({
    whatsapp: '201000000000',
    phone: '01000000000',
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
    get name() {
      return useNuxtApp().$i18n.t('brand.storeName')
    },
  }
}
