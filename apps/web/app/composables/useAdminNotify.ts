import type {
  AdminNotifyMarkSentResponse,
  AdminNotifyProductDetail,
  AdminNotifyProductRow,
} from '@serag/shared'

/**
 * Data composable for admin notify-me operations.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminNotify() {
  async function list(): Promise<AdminNotifyProductRow[]> {
    return adminFetch<AdminNotifyProductRow[]>('/admin/notify-me')
  }

  async function detail(productId: string): Promise<AdminNotifyProductDetail> {
    return adminFetch<AdminNotifyProductDetail>(`/admin/notify-me/${encodeURIComponent(productId)}`)
  }

  async function markSent(id: string): Promise<AdminNotifyMarkSentResponse> {
    return adminFetch<AdminNotifyMarkSentResponse>(`/admin/notify-me/${encodeURIComponent(id)}`, {
      method: 'PATCH',
    })
  }

  return {
    list,
    detail,
    markSent,
  }
}
