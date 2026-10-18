import type {
  AdminOrderListResponse,
  AdminOrderRow,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from '@serag/shared'
import {
  buildStatusTabs,
  deserializeOrdersQuery,
  serializeOrdersQuery,
  type StatusTabItem,
} from '~/utils/admin-orders'
import { parseAdminApiError } from '~/utils/admin-api-errors'

export function useAdminOrdersList() {
  const route = useRoute()
  const router = useRouter()
  const notify = useNotify()
  const config = useRuntimeConfig()

  const initial = deserializeOrdersQuery(route.query)

  const searchQuery = ref(initial.q ?? '')
  const selectedType = ref<OrderType | 'all'>(initial.type ?? 'all')
  const selectedStatus = ref<OrderStatus | 'all'>(initial.status ?? 'all')
  const selectedMethod = ref<PaymentMethod | 'all'>(initial.paymentMethod ?? 'all')
  const dateFrom = ref(initial.from ?? '')
  const dateTo = ref(initial.to ?? '')
  const currentPage = ref(initial.page ?? 1)
  const pageSize = ref(initial.pageSize ?? 20)

  const items = ref<AdminOrderRow[]>([])
  const total = ref(0)
  const loading = ref(true)
  const counts = ref<Record<OrderStatus, number>>({
    new: 0,
    awaiting_payment: 0,
    awaiting_deposit: 0,
    payment_rejected: 0,
    confirmed: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  })

  const tabs = computed<StatusTabItem[]>(() =>
    buildStatusTabs(counts.value, selectedStatus.value),
  )

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

  const exportHref = computed(() => {
    const base = config.public.apiBase || '/api'
    const params = new URLSearchParams()
    if (selectedType.value !== 'all') params.set('type', selectedType.value)
    if (selectedStatus.value !== 'all') params.set('status', selectedStatus.value)
    if (selectedMethod.value !== 'all') params.set('paymentMethod', selectedMethod.value)
    if (dateFrom.value) params.set('from', dateFrom.value)
    if (dateTo.value) params.set('to', dateTo.value)
    if (searchQuery.value.trim()) params.set('q', searchQuery.value.trim())
    const qs = params.toString()
    return `${base}/admin/orders/export.csv${qs ? `?${qs}` : ''}`
  })

  let searchTimer: ReturnType<typeof setTimeout> | null = null
  function onSearchInput(val: string) {
    searchQuery.value = val
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      currentPage.value = 1
      void syncToUrlAndFetch()
    }, 300)
  }

  function onStatusSelect(status: OrderStatus | 'all') {
    selectedStatus.value = status
    currentPage.value = 1
    void syncToUrlAndFetch()
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
    selectedType.value = 'all'
    selectedStatus.value = 'all'
    selectedMethod.value = 'all'
    dateFrom.value = ''
    dateTo.value = ''
    currentPage.value = 1
    void syncToUrlAndFetch()
  }

  async function syncToUrlAndFetch() {
    const q = serializeOrdersQuery({
      type: selectedType.value === 'all' ? undefined : selectedType.value,
      q: searchQuery.value,
      status: selectedStatus.value === 'all' ? undefined : selectedStatus.value,
      paymentMethod: selectedMethod.value === 'all' ? undefined : selectedMethod.value,
      from: dateFrom.value || undefined,
      to: dateTo.value || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    })

    await router.replace({ query: q })
    await fetchOrders()
  }

  async function fetchOrders() {
    loading.value = true
    try {
      const cleanQuery = serializeOrdersQuery({
        type: selectedType.value === 'all' ? undefined : selectedType.value,
        q: searchQuery.value,
        status: selectedStatus.value === 'all' ? undefined : selectedStatus.value,
        paymentMethod: selectedMethod.value === 'all' ? undefined : selectedMethod.value,
        from: dateFrom.value || undefined,
        to: dateTo.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      })

      const res = await adminFetch<AdminOrderListResponse>('/admin/orders', {
        query: cleanQuery,
      })

      items.value = res.items
      total.value = res.total
      counts.value = res.counts
    } catch (err) {
      notify.error(parseAdminApiError(err).message)
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    total,
    totalPages,
    counts,
    tabs,
    loading,
    searchQuery,
    selectedType,
    selectedStatus,
    selectedMethod,
    dateFrom,
    dateTo,
    currentPage,
    pageSize,
    exportHref,
    onSearchInput,
    onStatusSelect,
    onFilterChange,
    onPageChange,
    clearFilters,
    fetchOrders,
  }
}
