import { buildLocalBusiness } from '@serag/shared'

/**
 * Emits the site-wide `LocalBusiness` (HomeGoodsStore) JSON-LD from the public store settings.
 * Nothing is emitted while the settings still hold placeholders or when the request fails.
 */
export function useLocalBusinessJsonLd(): void {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl)
  const storeApi = useStoreApi()

  const { data } = useAsyncData('store:info', () => storeApi.storeInfo(), { getCachedData: payloadCache })

  const jsonLd = computed(() => {
    const info = data.value
    return info ? buildLocalBusiness(info, siteUrl) : null
  })

  useJsonLd('ld-localbusiness', () => jsonLd.value)
}
