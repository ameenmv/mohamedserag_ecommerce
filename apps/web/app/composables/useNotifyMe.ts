import type { NotifyMeInput } from '@serag/shared'
import { getApiBaseUrl, getErrorStatus } from '../utils/api'

export type NotifyMeResult =
  | { ok: true }
  | {
      ok: false
      reason: 'in_stock' | 'not_found' | 'throttled' | 'invalid' | 'unknown'
      message?: string
    }

/**
 * Composable for public back-in-stock notification requests.
 * Calls POST /api/notify-me and tracks funnel analytics on success.
 */
export function useNotifyMe() {
  const analytics = useAnalytics()

  async function submit(input: NotifyMeInput): Promise<NotifyMeResult> {
    const baseURL = getApiBaseUrl()
    try {
      await $fetch<{ ok: true }>('/notify-me', {
        baseURL,
        method: 'POST',
        body: {
          productId: input.productId,
          name: input.name,
          phone: input.phone,
          website: input.website,
        },
      })

      // Track funnel event ONLY on success, with productId only (no PII)
      analytics.track('notify_me_requested', { productId: input.productId })

      return { ok: true }
    } catch (err: unknown) {
      const status = getErrorStatus(err)

      let message: string | undefined
      if (err && typeof err === 'object') {
        const candidate = err as {
          data?: { message?: string | string[] }
          response?: { _data?: { message?: string | string[] } }
          message?: string
        }
        const payload = candidate.data ?? candidate.response?._data
        if (typeof payload?.message === 'string') {
          message = payload.message
        } else if (Array.isArray(payload?.message) && payload.message.length > 0) {
          message = String(payload.message[0])
        } else if (typeof candidate.message === 'string') {
          message = candidate.message
        }
      }

      if (status === 409) {
        return { ok: false, reason: 'in_stock', message }
      }
      if (status === 404) {
        return { ok: false, reason: 'not_found', message }
      }
      if (status === 429) {
        return { ok: false, reason: 'throttled', message }
      }
      if (status === 400) {
        return { ok: false, reason: 'invalid', message }
      }

      return { ok: false, reason: 'unknown', message }
    }
  }

  return {
    submit,
  }
}
