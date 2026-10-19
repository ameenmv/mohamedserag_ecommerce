import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { AdminConfirmSummary, OrderStockShortage } from '@serag/shared'
import { adminFetch } from './useApiClient'
import { mapConfirmErrorKey } from '../utils/admin-confirm'

/**
 * Composable for managing order payment confirmation and rejection by admin confirm token.
 * Exposes order summary, request states, and confirm/reject mutations.
 */
export function useAdminConfirm(token: MaybeRefOrGetter<string>) {
  const tokenVal = computed(() => toValue(token))
  const keyPrefix = computed(() => `admin-confirm-${tokenVal.value}`)

  const summary = useState<AdminConfirmSummary | null>(`${keyPrefix.value}-summary`, () => null)
  const pending = useState<boolean>(`${keyPrefix.value}-pending`, () => false)
  const error = useState<string | null>(`${keyPrefix.value}-error`, () => null)
  const shortages = useState<OrderStockShortage[]>(`${keyPrefix.value}-shortages`, () => [])
  const rejectWhatsappUrl = useState<string | null>(`${keyPrefix.value}-reject-url`, () => null)
  const actionError = useState<string | null>(`${keyPrefix.value}-action-error`, () => null)

  async function load(): Promise<AdminConfirmSummary | null> {
    if (!tokenVal.value) return null
    pending.value = true
    error.value = null
    actionError.value = null
    try {
      const data = await adminFetch<AdminConfirmSummary>(`/admin/confirm/${encodeURIComponent(tokenVal.value)}`)
      summary.value = data
      shortages.value = data.shortages ?? []
      rejectWhatsappUrl.value = data.rejectWhatsappUrl ?? null
      return data
    } catch (err: unknown) {
      error.value = mapConfirmErrorKey(err)
      return null
    } finally {
      pending.value = false
    }
  }

  async function confirm(amount: number, note?: string): Promise<boolean> {
    if (pending.value || !tokenVal.value) return false
    pending.value = true
    actionError.value = null
    try {
      const res = await adminFetch<AdminConfirmSummary>(
        `/admin/confirm/${encodeURIComponent(tokenVal.value)}/confirm`,
        {
          method: 'POST',
          body: {
            amount,
            note: note?.trim() || undefined,
          },
        },
      )
      summary.value = res
      shortages.value = res.shortages ?? []
      return true
    } catch (err: unknown) {
      actionError.value = mapConfirmErrorKey(err)
      return false
    } finally {
      pending.value = false
    }
  }

  async function reject(reason: string): Promise<boolean> {
    if (pending.value || !tokenVal.value) return false
    pending.value = true
    actionError.value = null
    try {
      const res = await adminFetch<AdminConfirmSummary>(
        `/admin/confirm/${encodeURIComponent(tokenVal.value)}/reject`,
        {
          method: 'POST',
          body: {
            reason: reason.trim(),
          },
        },
      )
      summary.value = res
      rejectWhatsappUrl.value = res.rejectWhatsappUrl ?? null
      return true
    } catch (err: unknown) {
      actionError.value = mapConfirmErrorKey(err)
      return false
    } finally {
      pending.value = false
    }
  }

  return {
    summary,
    pending,
    error,
    shortages,
    rejectWhatsappUrl,
    actionError,
    load,
    confirm,
    reject,
  }
}
