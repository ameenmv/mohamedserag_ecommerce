import type { AdminGuide, AdminGuideRow, GuidePatch } from '@serag/shared'

export interface AdminGuidesListQuery {
  q?: string
  status?: 'all' | 'published' | 'draft'
  page?: number
  pageSize?: number
}

function buildListQuery(query: AdminGuidesListQuery): Record<string, unknown> {
  return {
    ...(query.q && query.q.trim().length > 0 ? { q: query.q.trim() } : {}),
    ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
    ...(query.page ? { page: query.page } : {}),
    ...(query.pageSize ? { pageSize: query.pageSize } : {}),
  }
}

/**
 * Data composable for the admin guides list and editor.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminGuides() {
  function list(
    query: AdminGuidesListQuery = {},
  ): Promise<{ items: AdminGuideRow[]; total: number; page: number; pageSize: number }> {
    return adminFetch<{ items: AdminGuideRow[]; total: number; page: number; pageSize: number }>(
      '/admin/guides',
      { query: buildListQuery(query) },
    )
  }

  function get(id: string): Promise<AdminGuide> {
    return adminFetch<AdminGuide>(`/admin/guides/${encodeURIComponent(id)}`)
  }

  function create(input: GuidePatch): Promise<AdminGuide> {
    return adminFetch<AdminGuide>('/admin/guides', {
      method: 'POST',
      body: input,
    })
  }

  function update(id: string, input: GuidePatch): Promise<AdminGuide> {
    return adminFetch<AdminGuide>(`/admin/guides/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    })
  }

  async function remove(id: string): Promise<void> {
    await adminFetch(`/admin/guides/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  return {
    list,
    get,
    create,
    update,
    remove,
  }
}
