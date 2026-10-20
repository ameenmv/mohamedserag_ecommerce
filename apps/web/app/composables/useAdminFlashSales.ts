import type {
  AdminFlashSaleDetail,
  AdminFlashSaleListQueryInput,
  AdminFlashSaleListResponse,
  FlashSaleInput,
} from '@serag/shared'

/**
 * Data composable for admin flash sales operations.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminFlashSales() {
  async function list(query?: AdminFlashSaleListQueryInput): Promise<AdminFlashSaleListResponse> {
    const cleanQuery: Record<string, string | number> = {}
    if (query) {
      if (typeof query.page === 'number') cleanQuery.page = query.page
      if (typeof query.pageSize === 'number') cleanQuery.pageSize = query.pageSize
      if (query.q) cleanQuery.q = query.q
    }
    return adminFetch<AdminFlashSaleListResponse>('/admin/flash-sales', {
      query: cleanQuery,
    })
  }

  async function getById(id: string): Promise<AdminFlashSaleDetail> {
    return adminFetch<AdminFlashSaleDetail>(`/admin/flash-sales/${encodeURIComponent(id)}`)
  }

  async function create(body: FlashSaleInput): Promise<AdminFlashSaleDetail> {
    return adminFetch<AdminFlashSaleDetail>('/admin/flash-sales', {
      method: 'POST',
      body,
    })
  }

  async function update(id: string, body: FlashSaleInput): Promise<AdminFlashSaleDetail> {
    return adminFetch<AdminFlashSaleDetail>(`/admin/flash-sales/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
    })
  }

  async function end(id: string): Promise<AdminFlashSaleDetail> {
    return adminFetch<AdminFlashSaleDetail>(`/admin/flash-sales/${encodeURIComponent(id)}/end`, {
      method: 'POST',
    })
  }

  async function remove(id: string): Promise<void> {
    await adminFetch(`/admin/flash-sales/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  return {
    list,
    getById,
    create,
    update,
    end,
    remove,
  }
}
