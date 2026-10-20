import type { Ref } from 'vue'
import type { SearchResponse } from '@serag/shared'

export interface LiveSearchReturn {
  results: Ref<SearchResponse | null>
  pending: Ref<boolean>
  error: Ref<unknown>
}

/**
 * Client-only debounced live search composable.
 * - Debounces by ~250ms when trimmed query has 2+ characters
 * - Ignores stale responses so only the latest query settles
 * - Dispatches 'search' analytics event once per settled query
 */
export function useLiveSearch(query: Ref<string>): LiveSearchReturn {
  const results = ref<SearchResponse | null>(null)
  const pending = ref(false)
  const error = ref<unknown>(null)

  if (import.meta.server) {
    return { results, pending, error }
  }

  const storeApi = useStoreApi()
  const analytics = useAnalytics()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let latestSeq = 0

  watch(query, (newVal) => {
    const trimmed = newVal.trim()

    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    if (trimmed.length < 2) {
      results.value = null
      pending.value = false
      error.value = null
      return
    }

    pending.value = true
    const currentSeq = ++latestSeq

    debounceTimer = setTimeout(async () => {
      try {
        const data = await storeApi.search(trimmed, 6)
        if (currentSeq === latestSeq) {
          results.value = data
          pending.value = false
          error.value = null
          analytics.track('search', { query: trimmed })
        }
      } catch (err) {
        if (currentSeq === latestSeq) {
          error.value = err
          results.value = null
          pending.value = false
        }
      }
    }, 250)
  })

  onScopeDispose(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  return {
    results,
    pending,
    error,
  }
}
