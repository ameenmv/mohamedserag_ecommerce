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
  const settings = useState<StoreSettings>('store-settings', () => ({
    whatsapp: '201000000000',
    phone: '01000000000',
    name: 'معرض محمد سراج',
  }))

  return settings.value
}
