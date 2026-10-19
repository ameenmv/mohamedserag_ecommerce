import type {
  AdminBrand,
  CreateBrandInput,
  UpdateBrandInput,
} from '@serag/shared'

/**
 * Data composable for admin brand operations.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminBrands() {
  async function list(): Promise<AdminBrand[]> {
    return adminFetch<AdminBrand[]>('/admin/brands')
  }

  async function getById(id: string): Promise<AdminBrand> {
    return adminFetch<AdminBrand>(`/admin/brands/${encodeURIComponent(id)}`)
  }

  async function create(body: CreateBrandInput): Promise<AdminBrand> {
    return adminFetch<AdminBrand>('/admin/brands', {
      method: 'POST',
      body,
    })
  }

  async function update(id: string, body: UpdateBrandInput): Promise<AdminBrand> {
    return adminFetch<AdminBrand>(`/admin/brands/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    })
  }

  async function remove(id: string): Promise<void> {
    await adminFetch(`/admin/brands/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  async function uploadLogo(brandId: string, file: File): Promise<AdminBrand> {
    const formData = new FormData()
    formData.append('file', file)
    return adminFetch<AdminBrand>(`/admin/brands/${encodeURIComponent(brandId)}/logo`, {
      method: 'POST',
      body: formData,
    })
  }

  return {
    list,
    getById,
    create,
    update,
    remove,
    uploadLogo,
  }
}
