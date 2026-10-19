import type {
  AdminSpecTemplate,
  CreateSpecTemplateInput,
  UpdateSpecTemplateInput,
} from '@serag/shared'

/**
 * Data composable for admin spec template operations.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminSpecTemplates() {
  async function list(): Promise<AdminSpecTemplate[]> {
    return adminFetch<AdminSpecTemplate[]>('/admin/spec-templates')
  }

  async function getById(id: string): Promise<AdminSpecTemplate> {
    return adminFetch<AdminSpecTemplate>(`/admin/spec-templates/${encodeURIComponent(id)}`)
  }

  async function create(body: CreateSpecTemplateInput): Promise<AdminSpecTemplate> {
    return adminFetch<AdminSpecTemplate>('/admin/spec-templates', {
      method: 'POST',
      body,
    })
  }

  async function update(id: string, body: UpdateSpecTemplateInput): Promise<AdminSpecTemplate> {
    return adminFetch<AdminSpecTemplate>(`/admin/spec-templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    })
  }

  async function remove(id: string): Promise<void> {
    await adminFetch(`/admin/spec-templates/${encodeURIComponent(id)}`, {
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
