import type { GuideCard } from '@serag/shared'
import {
  DEFAULT_LISTING_FILTERS,
  patchListingFilters,
  type ListingFilters,
} from '~/utils/catalog-query'

const GUIDES_PAGE_SIZE = 12

/**
 * Composable for the public `/guides` listing.
 * Reads `?page` from the route, fetches one SSR page of published guides, and
 * exposes a minimal `ListingFilters` object so `StoreListingPagination` writes
 * only `page` back to the URL.
 */
export async function useGuidesList() {
  const route = useRoute()
  const storeApi = useStoreApi()

  const page = computed(() => {
    const raw = typeof route.query.page === 'string' ? route.query.page : ''
    const parsed = /^\d+$/.test(raw) ? parseInt(raw, 10) : 1
    return parsed >= 1 ? parsed : 1
  })

  const { data, pending, error, refresh } = await useAsyncData(
    () => `guides:${page.value}`,
    () => storeApi.guides(page.value, GUIDES_PAGE_SIZE),
  )

  const items = computed<GuideCard[]>(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const pageSize = computed(() => data.value?.pageSize ?? GUIDES_PAGE_SIZE)
  const isEmpty = computed(() => !pending.value && !error.value && items.value.length === 0)
  const loadError = computed(() => Boolean(error.value))

  const paginationFilters = computed<ListingFilters>(() =>
    patchListingFilters(
      { ...DEFAULT_LISTING_FILTERS, specs: {} },
      { page: page.value },
    ),
  )

  return {
    page,
    items,
    total,
    pageSize,
    pending,
    error,
    loadError,
    isEmpty,
    paginationFilters,
    refresh,
  }
}
