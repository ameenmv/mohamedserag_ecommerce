import type {
  AdminBrand,
  AdminCategory,
  AdminProductListItem,
  AdminProductSort,
  AdminProductStatus,
} from '@serag/shared'
import type { AdminProductListQuery } from '~/composables/useAdminProducts'
import { parseAdminApiError } from '~/utils/admin-api-errors'

export function useAdminProductsList() {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const productsApi = useAdminProducts()
  const categoriesApi = useAdminCategories()
  const brandsApi = useAdminBrands()
  const notify = useNotify()
  const undoToast = useUndoToast()

  // Categories & Brands for filters
  const categories = ref<AdminCategory[]>([])
  const brands = ref<AdminBrand[]>([])

  // State from URL
  const searchQuery = ref(String(route.query.q ?? ''))
  const selectedCategory = ref(String(route.query.categoryId ?? ''))
  const selectedBrand = ref(String(route.query.brandId ?? ''))
  const selectedStatus = ref<AdminProductStatus>(
    (route.query.status as AdminProductStatus) ?? 'all',
  )
  const selectedStock = ref<'low' | 'out' | ''>(
    (route.query.stock as 'low' | 'out' | '') ?? '',
  )
  const selectedSort = ref<AdminProductSort>(
    (route.query.sort as AdminProductSort) ?? 'updated',
  )
  const currentPage = ref(Number(route.query.page ?? 1) || 1)
  const pageSize = ref(20)

  // Products response state
  const items = ref<AdminProductListItem[]>([])
  const total = ref(0)
  const loading = ref(true)

  // Action Dialogs
  const confirmDeleteProduct = ref<AdminProductListItem | null>(null)
  const inOrdersProduct = ref<AdminProductListItem | null>(null)
  const actionLoading = ref(false)

  // Debounced search sync to URL
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  function onSearchInput(val: string) {
    searchQuery.value = val
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      currentPage.value = 1
      void syncToUrlAndFetch()
    }, 300)
  }

  function onFilterChange() {
    currentPage.value = 1
    void syncToUrlAndFetch()
  }

  function onPageChange(page: number) {
    currentPage.value = page
    void syncToUrlAndFetch()
  }

  function clearFilters() {
    searchQuery.value = ''
    selectedCategory.value = ''
    selectedBrand.value = ''
    selectedStatus.value = 'all'
    selectedStock.value = ''
    selectedSort.value = 'updated'
    currentPage.value = 1
    void syncToUrlAndFetch()
  }

  async function syncToUrlAndFetch() {
    const q: Record<string, string | number> = {}
    if (searchQuery.value.trim()) q.q = searchQuery.value.trim()
    if (selectedCategory.value) q.categoryId = selectedCategory.value
    if (selectedBrand.value) q.brandId = selectedBrand.value
    if (selectedStatus.value && selectedStatus.value !== 'all') q.status = selectedStatus.value
    if (selectedStock.value) q.stock = selectedStock.value
    if (selectedSort.value && selectedSort.value !== 'updated') q.sort = selectedSort.value
    if (currentPage.value > 1) q.page = currentPage.value

    await router.replace({ query: q })
    await fetchProducts()
  }

  async function fetchProducts() {
    loading.value = true
    try {
      const queryPayload: AdminProductListQuery = {
        page: currentPage.value,
        pageSize: pageSize.value,
        sort: selectedSort.value,
      }
      if (searchQuery.value.trim()) queryPayload.q = searchQuery.value.trim()
      if (selectedCategory.value) queryPayload.categoryId = selectedCategory.value
      if (selectedBrand.value) queryPayload.brandId = selectedBrand.value
      if (selectedStatus.value) queryPayload.status = selectedStatus.value
      if (selectedStock.value) queryPayload.stock = selectedStock.value

      const res = await productsApi.list(queryPayload)
      items.value = res.items
      total.value = res.total
    } catch (err) {
      notify.error(parseAdminApiError(err).message)
    } finally {
      loading.value = false
    }
  }

  async function loadInitialData() {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        categoriesApi.list(),
        brandsApi.list(),
      ])
      categories.value = catsRes
      brands.value = brandsRes
    } catch {
      // Non-critical if filter options fail
    }
    await fetchProducts()
  }

  // Row actions with undo
  async function toggleVisibility(product: AdminProductListItem) {
    const nextVal = !product.visible
    try {
      await productsApi.update(product.id, { visible: nextVal })
      product.visible = nextVal
      const msg = nextVal
        ? t('admin.products.toasts.shown', { name: product.name })
        : t('admin.products.toasts.hidden', { name: product.name })

      undoToast(msg, {
        onUndo: async () => {
          await productsApi.update(product.id, { visible: !nextVal })
          product.visible = !nextVal
        },
      })
    } catch (err) {
      notify.error(parseAdminApiError(err, t).message)
    }
  }

  async function toggleArchive(product: AdminProductListItem) {
    const wasArchived = product.archived
    try {
      if (wasArchived) {
        await productsApi.unarchive(product.id)
        product.archived = false
        product.archivedAt = null
        undoToast(t('admin.products.toasts.unarchived', { name: product.name }), {
          onUndo: async () => {
            await productsApi.archive(product.id)
            product.archived = true
          },
        })
      } else {
        await productsApi.archive(product.id)
        product.archived = true
        undoToast(t('admin.products.toasts.archived', { name: product.name }), {
          onUndo: async () => {
            await productsApi.unarchive(product.id)
            product.archived = false
            product.archivedAt = null
          },
        })
      }
    } catch (err) {
      notify.error(parseAdminApiError(err, t).message)
    }
  }

  function promptDelete(product: AdminProductListItem) {
    confirmDeleteProduct.value = product
  }

  async function executeDelete() {
    const target = confirmDeleteProduct.value
    if (!target) return

    actionLoading.value = true
    try {
      await productsApi.remove(target.id)
      confirmDeleteProduct.value = null
      notify.success(t('admin.products.toasts.deleted', { name: target.name }))
      await fetchProducts()
    } catch (err: unknown) {
      const parsed = parseAdminApiError(err, t)
      if (parsed.isInOrders) {
        confirmDeleteProduct.value = null
        inOrdersProduct.value = target
      } else {
        notify.error(parsed.message)
      }
    } finally {
      actionLoading.value = false
    }
  }

  async function archiveInsteadOfDelete() {
    const target = inOrdersProduct.value
    if (!target) return

    actionLoading.value = true
    try {
      await productsApi.archive(target.id)
      inOrdersProduct.value = null
      notify.success(t('admin.products.toasts.archived', { name: target.name }))
      await fetchProducts()
    } catch (err) {
      notify.error(parseAdminApiError(err, t).message)
    } finally {
      actionLoading.value = false
    }
  }

  onMounted(() => {
    void loadInitialData()
  })

  // Watch URL back/forward navigation
  watch(
    () => route.query,
    () => {
      searchQuery.value = String(route.query.q ?? '')
      selectedCategory.value = String(route.query.categoryId ?? '')
      selectedBrand.value = String(route.query.brandId ?? '')
      selectedStatus.value = (route.query.status as AdminProductStatus) ?? 'all'
      selectedStock.value = (route.query.stock as 'low' | 'out' | '') ?? ''
      selectedSort.value = (route.query.sort as AdminProductSort) ?? 'updated'
      currentPage.value = Number(route.query.page ?? 1) || 1
      void fetchProducts()
    },
  )

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

  return {
    items,
    total,
    totalPages,
    loading,
    categories,
    brands,
    searchQuery,
    selectedCategory,
    selectedBrand,
    selectedStatus,
    selectedStock,
    selectedSort,
    currentPage,
    confirmDeleteProduct,
    inOrdersProduct,
    actionLoading,
    onSearchInput,
    onFilterChange,
    onPageChange,
    clearFilters,
    toggleVisibility,
    toggleArchive,
    promptDelete,
    executeDelete,
    archiveInsteadOfDelete,
  }
}
