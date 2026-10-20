import type {
  SpecTemplateField,
} from '@serag/shared'
import type { MaybeRefOrGetter } from 'vue'
import {
  DEFAULT_LISTING_FILTERS,
  parseListingQuery,
  patchListingFilters,
  toApiQuery,
  toRouteQuery,
  type ListingFilters,
} from '../utils/catalog-query'
import { buildActiveChips } from '../utils/listing-chips'

export interface ActiveFilterChip {
  id: string
  label: string
  remove: () => void
}

export interface UseListingOptions {
  category?: MaybeRefOrGetter<string | undefined>
  brand?: MaybeRefOrGetter<string | undefined>
  fields?: MaybeRefOrGetter<readonly SpecTemplateField[] | SpecTemplateField[] | undefined>
}

export async function useListing(options: UseListingOptions = {}) {
  // 1. Create dependencies and state synchronously
  const route = useRoute()
  const storeApi = useStoreApi()
  const { t } = useI18n()

  const filters = computed<ListingFilters>(() =>
    parseListingQuery(route.query, toValue(options.fields)),
  )

  const apiQuery = computed(() =>
    toApiQuery(filters.value, {
      category: toValue(options.category),
      brand: toValue(options.brand),
    }),
  )

  const scopeKey = computed(() => {
    const cat = toValue(options.category)
    const br = toValue(options.brand)
    if (cat) return `c:${cat}`
    if (br) return `b:${br}`
    return 'shop'
  })

  const serializedQuery = computed(() => JSON.stringify(apiQuery.value))
  const asyncDataKey = computed(() => `listing:${scopeKey.value}:${serializedQuery.value}`)

  // 2. Synchronous useAsyncData call with reactive key (no redundant watch)
  const asyncData = useAsyncData(
    () => asyncDataKey.value,
    () => storeApi.products(apiQuery.value),
  )

  async function setFilters(patch: Partial<ListingFilters>): Promise<void> {
    const next = patchListingFilters(filters.value, patch)
    const nextQuery = toRouteQuery(next)
    await navigateTo(
      {
        path: route.path,
        query: nextQuery,
      },
      { replace: false },
    )
  }

  async function clearFilters(keepSearch = true): Promise<void> {
    const next: ListingFilters = {
      ...DEFAULT_LISTING_FILTERS,
      q: keepSearch ? filters.value.q : undefined,
    }
    await navigateTo(
      {
        path: route.path,
        query: toRouteQuery(next),
      },
      { replace: false },
    )
  }

  const activeChips = computed<ActiveFilterChip[]>(() => {
    const raw = buildActiveChips(filters.value, {
      brands: asyncData.data.value?.facets?.brands,
      fields: toValue(options.fields),
      t,
    })
    return raw.map((chip) => ({
      id: chip.id,
      label: chip.label,
      remove: () => {
        void setFilters(chip.patch)
      },
    }))
  })

  // 3. Await asyncData as the LAST statement before returning plain object
  await asyncData

  return {
    filters,
    data: asyncData.data,
    pending: asyncData.pending,
    error: asyncData.error,
    refresh: asyncData.refresh,
    setFilters,
    clearFilters,
    activeChips,
  }
}
