import type { CategoryTreeNode } from '@serag/shared'

/**
 * Top-level categories for the header's category bar and the footer column.
 * One request per page load (shared key); an unavailable API leaves the list empty.
 */
export async function useNavCategories() {
  const storeApi = useStoreApi()
  const { data } = await useAsyncData<CategoryTreeNode[]>(
    'store:nav-categories',
    () => storeApi.categories().catch(() => [] as CategoryTreeNode[]),
    { getCachedData: payloadCache },
  )
  return computed(() => data.value ?? [])
}
