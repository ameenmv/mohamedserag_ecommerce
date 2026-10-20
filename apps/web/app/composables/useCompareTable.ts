import type { CategoryDetail, ProductDetail } from '@serag/shared'
import { buildCompareTable, type CompareTableResult } from '../utils/compare-table'

/**
 * Composable providing comparison table state and data loaders (PRD US-2.3).
 * Fetches product details and category field templates for selected compare entries.
 */
export function useCompareTable() {
  const { entries, count, remove, clear } = useCompare()
  const storeApi = useStoreApi()

  const loading = ref(false)
  const isMounted = ref(false)
  const products = ref<ProductDetail[]>([])
  const categories = ref<CategoryDetail[]>([])
  const showOnlyDifferences = ref(false)

  const tableData = computed<CompareTableResult>(() =>
    buildCompareTable(products.value, categories.value),
  )

  const displayedRows = computed(() => {
    if (!showOnlyDifferences.value) {
      return tableData.value.rows
    }
    return tableData.value.rows.filter((r) => r.different)
  })

  async function loadData(): Promise<void> {
    if (entries.value.length === 0) {
      products.value = []
      categories.value = []
      return
    }

    loading.value = true
    try {
      const ids = entries.value.map((e) => e.productId)
      const cards = await storeApi.productsByIds(ids)
      if (cards.length === 0) {
        products.value = []
        categories.value = []
        return
      }

      // Parallel fetch for product details
      const productDetails = await Promise.all(
        cards.map((c) => storeApi.product(c.slug)),
      )
      products.value = productDetails

      // Parallel fetch for category specs
      const distinctCategories = Array.from(
        new Set(productDetails.map((p) => p.category.slug)),
      )
      const categoryDetails = await Promise.all(
        distinctCategories.map((slug) => storeApi.category(slug)),
      )
      categories.value = categoryDetails
    } catch {
      // Retain existing products on transient error
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    onMounted(async () => {
      isMounted.value = true
      await loadData()
    })

    // Re-fetch if comparison list changes
    watch(
      () => entries.value.map((e) => e.productId).join(','),
      async (newVal, oldVal) => {
        if (isMounted.value && newVal !== oldVal) {
          await loadData()
        }
      },
    )
  }

  function handleRemove(productId: string): void {
    remove(productId)
    products.value = products.value.filter((p) => p.id !== productId)
  }

  function handleClear(): void {
    clear()
    products.value = []
    categories.value = []
  }

  return {
    entries,
    count,
    loading,
    isMounted,
    products,
    categories,
    tableData,
    displayedRows,
    showOnlyDifferences,
    remove: handleRemove,
    clear: handleClear,
    refresh: loadData,
  }
}
