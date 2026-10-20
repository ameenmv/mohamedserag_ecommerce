import type { DashboardRange, DashboardSummary } from '@serag/shared'
import { useEventListener } from '@vueuse/core'
import { parseAdminApiError } from '~/utils/admin-api-errors'

/** Minimum interval between automatic refetches triggered by window focus. */
const FOCUS_REFRESH_MS = 60_000

/**
 * Loads the admin overview summary (`GET /admin/dashboard/summary`) with a selected
 * 7/30/90-day range, and refreshes (throttled to once a minute) when the tab regains focus.
 */
export function useAdminDashboard() {
  const { t } = useI18n()

  const range = ref<DashboardRange>(7)
  const summary = ref<DashboardSummary | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  let lastFetchAt = 0

  async function load(force = false): Promise<void> {
    const now = Date.now()
    if (!force && summary.value && now - lastFetchAt < FOCUS_REFRESH_MS) return
    loading.value = true
    error.value = null
    try {
      summary.value = await adminFetch<DashboardSummary>('/admin/dashboard/summary', {
        query: { range: range.value },
      })
      lastFetchAt = Date.now()
    } catch (err: unknown) {
      error.value = parseAdminApiError(err, t).message
    } finally {
      loading.value = false
    }
  }

  function setRange(next: DashboardRange): void {
    if (range.value === next) return
    range.value = next
    void load(true)
  }

  useEventListener('focus', () => {
    void load()
  })

  return {
    range,
    summary,
    loading,
    error,
    load,
    setRange,
  }
}
