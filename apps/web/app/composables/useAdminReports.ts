import type {
  BestSellerRow,
  BridalFunnelReport,
  CouponReportRow,
  FlashSaleReportRow,
  ReportGrouping,
  ReportKind,
  ReportPreset,
  RepeatCustomersReport,
  RevenueReport,
  SplitsReport,
} from '@serag/shared'
import { parseAdminApiError } from '~/utils/admin-api-errors'
import {
  deserializeReportQuery,
  serializeReportQuery,
  toAdminReportApiQuery,
  validateReportQuery,
  type AdminReportPayload,
  type AdminReportQueryState,
} from '~/utils/admin-reports'

/**
 * Loads admin reports (`GET /admin/reports/:kind`) with the period state kept in the
 * route query as the single source of truth. Results are cached per
 * `kind|from|to|groupBy` so switching tabs back and forth does not refetch.
 */
export function useAdminReports() {
  const route = useRoute()
  const router = useRouter()
  const config = useRuntimeConfig()
  const { t } = useI18n()

  const state = ref<AdminReportQueryState>(deserializeReportQuery(route.query))

  const payload = ref<AdminReportPayload | null>(null)
  const loading = ref(true)
  const fetchError = ref<string | null>(null)
  const queryError = ref<string | null>(null)
  const applyError = ref<string | null>(null)

  const periodError = computed(() => queryError.value ?? applyError.value)

  // Draft values the toolbar edits before "apply" for custom ranges.
  const draftFrom = ref(state.value.from ?? '')
  const draftTo = ref(state.value.to ?? '')

  let requestToken = 0
  const cache = new Map<string, AdminReportPayload>()

  const fetchKey = computed(() => {
    if (queryError.value !== null) return null
    const { from, to } = resolvedRange()
    return `${state.value.tab}|${from}|${to}|${state.value.groupBy}`
  })

  function resolvedRange(): { from: string; to: string } {
    const query = toAdminReportApiQuery(state.value, new Date())
    return { from: query.from, to: query.to }
  }

  function rebuildDerived(): void {
    queryError.value = validateReportQuery(state.value)
    draftFrom.value = state.value.from ?? ''
    draftTo.value = state.value.to ?? ''
  }

  async function fetchReport(): Promise<void> {
    const key = fetchKey.value
    if (key === null) {
      payload.value = null
      loading.value = false
      return
    }

    const cached = cache.get(key)
    if (cached) {
      payload.value = cached
      loading.value = false
      fetchError.value = null
      return
    }

    const token = ++requestToken
    loading.value = true
    fetchError.value = null
    try {
      const query = toAdminReportApiQuery(state.value, new Date())
      const kind = state.value.tab
      let next: AdminReportPayload
      switch (kind) {
        case 'revenue':
          next = { kind, data: await adminFetch<RevenueReport>(`/admin/reports/${kind}`, { query }) }
          break
        case 'splits':
          next = { kind, data: await adminFetch<SplitsReport>(`/admin/reports/${kind}`, { query }) }
          break
        case 'best-sellers':
          next = { kind, data: await adminFetch<{ items: BestSellerRow[] }>(`/admin/reports/${kind}`, { query }) }
          break
        case 'coupons':
          next = { kind, data: await adminFetch<{ items: CouponReportRow[] }>(`/admin/reports/${kind}`, { query }) }
          break
        case 'flash-sales':
          next = { kind, data: await adminFetch<{ items: FlashSaleReportRow[] }>(`/admin/reports/${kind}`, { query }) }
          break
        case 'bridal-funnel':
          next = { kind, data: await adminFetch<BridalFunnelReport>(`/admin/reports/${kind}`, { query }) }
          break
        case 'repeat-customers':
          next = { kind, data: await adminFetch<RepeatCustomersReport>(`/admin/reports/${kind}`, { query }) }
          break
      }
      if (token !== requestToken) return
      cache.set(key, next)
      payload.value = next
    } catch (err: unknown) {
      if (token !== requestToken) return
      fetchError.value = parseAdminApiError(err, t).message
      payload.value = null
    } finally {
      if (token === requestToken) loading.value = false
    }
  }

  async function syncUrlAndFetch(): Promise<void> {
    const query = serializeReportQuery(state.value)
    await router.replace({ query })
    await fetchReport()
  }

  async function load(): Promise<void> {
    rebuildDerived()
    await fetchReport()
  }

  async function setTab(tab: ReportKind): Promise<void> {
    if (state.value.tab === tab) return
    state.value.tab = tab
    await syncUrlAndFetch()
  }

  async function setPreset(preset: ReportPreset | 'custom'): Promise<void> {
    if (preset === 'custom') {
      // Resolve the current range into explicit dates (while the old preset is still
      // active) so the URL never falls back to the default preset in custom mode.
      const { from, to } = resolvedRange()
      state.value.preset = 'custom'
      state.value.from = from
      state.value.to = to
      draftFrom.value = from
      draftTo.value = to
    } else {
      state.value.preset = preset
      state.value.from = undefined
      state.value.to = undefined
    }
    applyError.value = null
    await syncUrlAndFetch()
  }

  async function applyCustom(): Promise<void> {
    const error = validateReportQuery({
      ...state.value,
      preset: 'custom',
      from: draftFrom.value,
      to: draftTo.value,
    })
    if (error !== null) {
      applyError.value = error
      return
    }
    applyError.value = null
    state.value.preset = 'custom'
    state.value.from = draftFrom.value
    state.value.to = draftTo.value
    await syncUrlAndFetch()
  }

  async function setGroupBy(groupBy: ReportGrouping): Promise<void> {
    if (state.value.groupBy === groupBy) return
    state.value.groupBy = groupBy
    await syncUrlAndFetch()
  }

  async function retry(): Promise<void> {
    await fetchReport()
  }

  /** Absolute CSV export URL for the active report (or `kind` override); `null` when invalid. */
  function exportHref(kind?: ReportKind): string | null {
    if (queryError.value !== null) return null
    const base = config.public.apiBase || '/api'
    const target = kind ?? state.value.tab
    const query = toAdminReportApiQuery(state.value, new Date())
    const params = new URLSearchParams(query)
    return `${base}/admin/reports/${target}/export?${params.toString()}`
  }

  // The URL is the source of truth: every state change goes through router.replace,
  // and this watcher (plus back/forward navigation) triggers the actual fetch for
  // externally-driven URL changes; internal changes are fetched by syncUrlAndFetch.
  watch(
    () => route.query,
    () => {
      const next = deserializeReportQuery(route.query)
      const changed =
        next.tab !== state.value.tab ||
        next.preset !== state.value.preset ||
        next.from !== state.value.from ||
        next.to !== state.value.to ||
        next.groupBy !== state.value.groupBy
      if (!changed) return
      state.value = next
      rebuildDerived()
      if (import.meta.server) return
      void fetchReport()
    },
  )

  return {
    state,
    payload,
    loading,
    fetchError,
    queryError,
    applyError,
    periodError,
    draftFrom,
    draftTo,
    load,
    retry,
    setTab,
    setPreset,
    applyCustom,
    setGroupBy,
    exportHref,
  }
}
