import type {
  AdminOrderDetail,
  BridalRepriceResult,
  OrderStatus,
  OrderStockShortage,
  WhatsAppTemplateKey,
} from '@serag/shared'
import { buildStatusWhatsappUrl } from '~/utils/admin-orders'
import { parseAdminApiError } from '~/utils/admin-api-errors'

export function useAdminOrder(orderId: string) {
  const notify = useNotify()
  const detail = ref<AdminOrderDetail | null>(null)
  const loading = ref(true)
  const actionPending = ref(false)
  const actionError = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    actionError.value = null
    try {
      detail.value = await adminFetch<AdminOrderDetail>(
        `/admin/orders/${encodeURIComponent(orderId)}`,
      )
    } catch (err) {
      actionError.value = parseAdminApiError(err).message
      notify.error(actionError.value)
    } finally {
      loading.value = false
    }
  }

  async function changeStatus(to: OrderStatus, reason?: string): Promise<boolean> {
    actionPending.value = true
    actionError.value = null
    try {
      const updated = await adminFetch<AdminOrderDetail>(
        `/admin/orders/${encodeURIComponent(orderId)}/status`,
        {
          method: 'PATCH',
          body: { to, reason },
        },
      )
      detail.value = updated
      return true
    } catch (err) {
      actionError.value = parseAdminApiError(err).message
      notify.error(actionError.value)
      return false
    } finally {
      actionPending.value = false
    }
  }

  async function confirmPayment(amount: number, note?: string): Promise<boolean> {
    actionPending.value = true
    actionError.value = null
    try {
      const updated = await adminFetch<AdminOrderDetail>(
        `/admin/orders/${encodeURIComponent(orderId)}/payments/confirm`,
        {
          method: 'POST',
          body: { amount, note },
        },
      )
      detail.value = updated
      return true
    } catch (err) {
      actionError.value = parseAdminApiError(err).message
      notify.error(actionError.value)
      return false
    } finally {
      actionPending.value = false
    }
  }

  async function rejectPayment(reason: string): Promise<boolean> {
    actionPending.value = true
    actionError.value = null
    try {
      const updated = await adminFetch<AdminOrderDetail>(
        `/admin/orders/${encodeURIComponent(orderId)}/payments/reject`,
        {
          method: 'POST',
          body: { reason },
        },
      )
      detail.value = updated
      return true
    } catch (err) {
      actionError.value = parseAdminApiError(err).message
      notify.error(actionError.value)
      return false
    } finally {
      actionPending.value = false
    }
  }

  async function saveNotes(internalNotes: string): Promise<boolean> {
    actionPending.value = true
    actionError.value = null
    try {
      const updated = await adminFetch<AdminOrderDetail>(
        `/admin/orders/${encodeURIComponent(orderId)}/notes`,
        {
          method: 'PATCH',
          body: { internalNotes },
        },
      )
      detail.value = updated
      return true
    } catch (err) {
      actionError.value = parseAdminApiError(err).message
      notify.error(actionError.value)
      return false
    } finally {
      actionPending.value = false
    }
  }

  async function logWhatsapp(
    templateKey: WhatsAppTemplateKey,
    variables: Record<string, string | number>,
  ): Promise<string | null> {
    if (!detail.value) return null
    try {
      const res = await adminFetch<{ id: string }>(
        `/admin/orders/${encodeURIComponent(orderId)}/whatsapp`,
        {
          method: 'POST',
          body: {
            templateKey,
            to: detail.value.customer.phone,
            variables,
          },
        },
      )
      // Reload order detail in background to update whatsappMessages list
      void load()
      return res.id
    } catch (err) {
      notify.error(parseAdminApiError(err).message)
      return null
    }
  }

  async function sendWhatsapp(opts?: { reason?: string }): Promise<void> {
    if (!detail.value) return
    const wa = buildStatusWhatsappUrl(detail.value, undefined, opts)
    if (!wa) return

    await logWhatsapp(wa.templateKey, wa.variables)
    if (typeof window !== 'undefined') {
      window.open(wa.url, '_blank', 'noopener')
    }
  }

  async function agreeDeliveryDate(
    date: string,
  ): Promise<{ shortages: OrderStockShortage[] } | null> {
    actionPending.value = true
    actionError.value = null
    try {
      const res = await adminFetch<{ shortages: OrderStockShortage[] }>(
        `/admin/orders/${encodeURIComponent(orderId)}/delivery-date`,
        {
          method: 'POST',
          body: { date },
        },
      )
      await load()
      return res
    } catch (err) {
      actionError.value = parseAdminApiError(err).message
      notify.error(actionError.value)
      return null
    } finally {
      actionPending.value = false
    }
  }

  async function extendLock(until: string): Promise<{ lockedUntil: Date } | null> {
    actionPending.value = true
    actionError.value = null
    try {
      const res = await adminFetch<{ lockedUntil: Date }>(
        `/admin/orders/${encodeURIComponent(orderId)}/lock-extend`,
        {
          method: 'POST',
          body: { until },
        },
      )
      await load()
      return res
    } catch (err) {
      actionError.value = parseAdminApiError(err).message
      notify.error(actionError.value)
      return null
    } finally {
      actionPending.value = false
    }
  }

  async function reprice(): Promise<BridalRepriceResult | null> {
    actionPending.value = true
    actionError.value = null
    try {
      const res = await adminFetch<BridalRepriceResult>(
        `/admin/orders/${encodeURIComponent(orderId)}/reprice`,
        {
          method: 'POST',
        },
      )
      await load()
      return res
    } catch (err) {
      actionError.value = parseAdminApiError(err).message
      notify.error(actionError.value)
      return null
    } finally {
      actionPending.value = false
    }
  }

  return {
    detail,
    loading,
    actionPending,
    actionError,
    load,
    changeStatus,
    confirmPayment,
    rejectPayment,
    saveNotes,
    logWhatsapp,
    sendWhatsapp,
    agreeDeliveryDate,
    extendLock,
    reprice,
  }
}
