import type { ReviewInput } from '@serag/shared'
import { apiFetch, getErrorStatus } from '../utils/api'

export type ReviewSubmitResult =
  | { ok: true }
  | {
      ok: false
      reason: 'duplicate' | 'not_found' | 'throttled' | 'invalid' | 'unknown'
      message?: string
    }

/**
 * Composable for public product review submissions.
 * Calls POST /api/reviews and tracks funnel analytics on success.
 */
export function useReviewSubmit() {
  const analytics = useAnalytics()

  async function submit(input: ReviewInput): Promise<ReviewSubmitResult> {
    try {
      await apiFetch<{ ok: true }>('/reviews', {
        method: 'POST',
        body: {
          productId: input.productId,
          stars: input.stars,
          text: input.text,
          name: input.name,
          phone: input.phone,
          website: input.website,
        },
      })

      // Track funnel event ONLY on success, with productId and stars ONLY (no PII)
      analytics.track('review_submitted', {
        productId: input.productId,
        stars: input.stars,
      })

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
        return { ok: false, reason: 'duplicate', message }
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
