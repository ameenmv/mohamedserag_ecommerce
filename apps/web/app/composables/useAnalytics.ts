import type { FunnelEvent, FunnelEventData } from '@serag/shared'
import { globalAnalyticsQueue } from '../utils/analytics-queue'

export interface AnalyticsComposable {
  track: (event: FunnelEvent, data?: FunnelEventData) => void
}

/**
 * Funnel analytics composable for the Serag storefront.
 * Tracks canonical funnel events to Umami on the client side only.
 * Calls made before the tracker script finishes loading are queued (up to 20)
 * and flushed once the tracker becomes ready. Silently no-ops on the server
 * or if Umami is not configured / blocked.
 */
export function useAnalytics(): AnalyticsComposable {
  function track(event: FunnelEvent, data?: FunnelEventData): void {
    // 1. Silently no-op during SSR / on the server.
    if (import.meta.server || typeof window === 'undefined') {
      return
    }

    // 2. If Umami is already loaded on window, flush any pending queue and track immediately.
    if (window.umami && typeof window.umami.track === 'function') {
      if (globalAnalyticsQueue.length > 0) {
        globalAnalyticsQueue.flush(window.umami)
      }
      try {
        window.umami.track(event, data)
      } catch {
        // Silently no-op on tracking failure
      }
      return
    }

    // 3. Otherwise, queue up to 20 calls until the tracker script loads.
    globalAnalyticsQueue.enqueue(event, data)
  }

  return {
    track,
  }
}
