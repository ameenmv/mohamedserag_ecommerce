import type {
  AdminFaqEntry,
  CreateFaqEntryInput,
  UpdateFaqEntryInput,
} from '@serag/shared'

/**
 * Data composable for the admin FAQ manager.
 * Wraps authenticated `adminFetch` calls with strict typing.
 */
export function useAdminFaq() {
  function list(topic?: string): Promise<{ items: AdminFaqEntry[] }> {
    return adminFetch<{ items: AdminFaqEntry[] }>('/admin/faq', {
      query: topic ? { topic } : undefined,
    })
  }

  function get(id: string): Promise<AdminFaqEntry> {
    return adminFetch<AdminFaqEntry>(`/admin/faq/${encodeURIComponent(id)}`)
  }

  function create(input: CreateFaqEntryInput): Promise<AdminFaqEntry> {
    return adminFetch<AdminFaqEntry>('/admin/faq', {
      method: 'POST',
      body: input,
    })
  }

  function update(id: string, input: UpdateFaqEntryInput): Promise<AdminFaqEntry> {
    return adminFetch<AdminFaqEntry>(`/admin/faq/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    })
  }

  function remove(id: string): Promise<unknown> {
    return adminFetch<unknown>(`/admin/faq/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  function reorder(ids: string[]): Promise<{ success: boolean }> {
    return adminFetch<{ success: boolean }>('/admin/faq/reorder', {
      method: 'POST',
      body: { ids },
    })
  }

  return {
    list,
    get,
    create,
    update,
    remove,
    reorder,
  }
}
