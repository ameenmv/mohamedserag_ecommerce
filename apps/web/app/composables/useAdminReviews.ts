import type {
  AdminReviewListQueryInput,
  AdminReviewListResponse,
  AdminReviewRow,
} from '@serag/shared'

/**
 * Data composable for admin review moderation operations.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminReviews() {
  async function list(query?: AdminReviewListQueryInput): Promise<AdminReviewListResponse> {
    const cleanQuery: Record<string, string | number> = {}
    if (query) {
      if (query.status) cleanQuery.status = query.status
      if (query.q) cleanQuery.q = query.q.trim()
      if (typeof query.stars === 'number') cleanQuery.stars = query.stars
      if (typeof query.page === 'number') cleanQuery.page = query.page
      if (typeof query.pageSize === 'number') cleanQuery.pageSize = query.pageSize
    }
    return adminFetch<AdminReviewListResponse>('/admin/reviews', {
      query: cleanQuery,
    })
  }

  async function pendingCount(): Promise<{ count: number }> {
    return adminFetch<{ count: number }>('/admin/reviews/pending-count')
  }

  async function approve(id: string): Promise<AdminReviewRow> {
    return adminFetch<AdminReviewRow>(`/admin/reviews/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
    })
  }

  async function reject(id: string): Promise<AdminReviewRow> {
    return adminFetch<AdminReviewRow>(`/admin/reviews/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
    })
  }

  async function reply(id: string, replyText: string | null): Promise<AdminReviewRow> {
    return adminFetch<AdminReviewRow>(`/admin/reviews/${encodeURIComponent(id)}/reply`, {
      method: 'PATCH',
      body: { reply: replyText },
    })
  }

  async function remove(id: string): Promise<void> {
    await adminFetch(`/admin/reviews/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  return {
    list,
    pendingCount,
    approve,
    reject,
    reply,
    remove,
  }
}

/**
 * Pending review count shared by the sidebar badge and the moderation page,
 * so the badge follows approvals and rejections without a reload.
 */
export function useAdminPendingReviewsCount() {
  return useState<number>('admin-pending-reviews-count', () => 0)
}
