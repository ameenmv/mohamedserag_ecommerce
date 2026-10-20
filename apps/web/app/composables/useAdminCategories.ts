import type {
  AdminCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@serag/shared'

/**
 * Data composable for admin category operations.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminCategories() {
  async function list(): Promise<AdminCategory[]> {
    return adminFetch<AdminCategory[]>('/admin/categories')
  }

  async function getById(id: string): Promise<AdminCategory> {
    return adminFetch<AdminCategory>(`/admin/categories/${encodeURIComponent(id)}`)
  }

  async function create(body: CreateCategoryInput): Promise<AdminCategory> {
    return adminFetch<AdminCategory>('/admin/categories', {
      method: 'POST',
      body,
    })
  }

  async function update(id: string, body: UpdateCategoryInput): Promise<AdminCategory> {
    return adminFetch<AdminCategory>(`/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    })
  }

  async function remove(id: string): Promise<void> {
    await adminFetch(`/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  async function reorder(ids: string[]): Promise<{ success: boolean }> {
    return adminFetch<{ success: boolean }>('/admin/categories/order', {
      method: 'PUT',
      body: { ids },
    })
  }

  return {
    list,
    getById,
    create,
    update,
    remove,
    reorder,
  }
}
