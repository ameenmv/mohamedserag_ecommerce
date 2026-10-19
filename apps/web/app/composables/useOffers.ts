import type { OffersResponse } from '@serag/shared'

/**
 * Composable for fetching public offers (active flash sales and discounted items).
 * Runs via useAsyncData for SSR parity.
 */
export async function useOffers() {
  const storeApi = useStoreApi()

  const asyncData = await useAsyncData<OffersResponse>(
    'store:offers',
    () => storeApi.offers(),
  )

  const flash = computed(() => asyncData.data.value?.flash ?? [])
  const discounted = computed(() => asyncData.data.value?.discounted ?? [])
  const isEmpty = computed(
    () =>
      !asyncData.pending.value &&
      flash.value.length === 0 &&
      discounted.value.length === 0,
  )

  return {
    ...asyncData,
    flash,
    discounted,
    isEmpty,
  }
}
