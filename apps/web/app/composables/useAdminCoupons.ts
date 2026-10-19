import type {
  AdminCouponDeleteResponse,
  AdminCouponListQueryInput,
  AdminCouponListResponse,
  AdminCouponRow,
  CouponInput,
} from '@serag/shared'

/**
 * Data composable for admin coupons operations.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminCoupons() {
  async function list(query?: AdminCouponListQueryInput): Promise<AdminCouponListResponse> {
    const cleanQuery: Record<string, string | number> = {}
    if (query) {
      if (typeof query.page === 'number') cleanQuery.page = query.page
      if (typeof query.pageSize === 'number') cleanQuery.pageSize = query.pageSize
      if (query.q) cleanQuery.q = query.q
    }
    return adminFetch<AdminCouponListResponse>('/admin/coupons', {
      query: cleanQuery,
    })
  }

  async function getById(id: string): Promise<AdminCouponRow> {
    return adminFetch<AdminCouponRow>(`/admin/coupons/${encodeURIComponent(id)}`)
  }

  async function create(body: CouponInput): Promise<AdminCouponRow> {
    return adminFetch<AdminCouponRow>('/admin/coupons', {
      method: 'POST',
      body,
    })
  }

  async function update(id: string, body: CouponInput): Promise<AdminCouponRow> {
    return adminFetch<AdminCouponRow>(`/admin/coupons/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
    })
  }

  async function remove(id: string): Promise<AdminCouponDeleteResponse> {
    return adminFetch<AdminCouponDeleteResponse>(`/admin/coupons/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  return {
    list,
    getById,
    create,
    update,
    remove,
  }
}
