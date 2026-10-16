import type { FunnelEvent, FunnelEventData } from '@serag/shared'

export interface UmamiTracker {
  track: {
    (event: FunnelEvent | string, data?: FunnelEventData): Promise<unknown> | undefined
    (customPayload?: (props: Record<string, unknown>) => Record<string, unknown>): Promise<unknown> | undefined
  }
  identify?: (sessionData?: Record<string, unknown>) => Promise<unknown> | undefined
}

declare global {
  interface Window {
    umami?: UmamiTracker
  }
}

export {}
