import type { AdminPage, AdminPageRow, PageTranslationsInput } from '@serag/shared'

export interface AdminPageUpdateInput {
  title: string
  body: string
  seoTitle: string
  seoDescription: string
  published: boolean
  translations?: PageTranslationsInput | null
}

/**
 * Data composable for the admin pages editor.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminPages() {
  function list(): Promise<{ items: AdminPageRow[] }> {
    return adminFetch<{ items: AdminPageRow[] }>('/admin/pages')
  }

  function get(id: string): Promise<AdminPage> {
    return adminFetch<AdminPage>(`/admin/pages/${encodeURIComponent(id)}`)
  }

  function update(id: string, input: AdminPageUpdateInput): Promise<AdminPage> {
    return adminFetch<AdminPage>(`/admin/pages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    })
  }

  return {
    list,
    get,
    update,
  }
}
