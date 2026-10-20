import type {
  AdminProductDetail,
  AdminProductImage,
  AdminProductListResponse,
  AdminProductSort,
  AdminProductStatus,
  CreateProductInput,
  PatchProductImageInput,
  UpdateProductInput,
} from '@serag/shared'

export interface AdminProductListQuery {
  q?: string
  categoryId?: string
  brandId?: string
  status?: AdminProductStatus
  stock?: 'low' | 'out'
  sort?: AdminProductSort
  page?: number
  pageSize?: number
}

/**
 * Data composable for admin product operations.
 * Wraps authenticated `adminFetch` calls with strict types.
 */
export function useAdminProducts() {
  async function list(query?: AdminProductListQuery): Promise<AdminProductListResponse> {
    const cleanQuery: Record<string, string | number> = {}
    if (query) {
      if (query.q) cleanQuery.q = query.q
      if (query.categoryId) cleanQuery.categoryId = query.categoryId
      if (query.brandId) cleanQuery.brandId = query.brandId
      if (query.status) cleanQuery.status = query.status
      if (query.stock) cleanQuery.stock = query.stock
      if (query.sort) cleanQuery.sort = query.sort
      if (typeof query.page === 'number') cleanQuery.page = query.page
      if (typeof query.pageSize === 'number') cleanQuery.pageSize = query.pageSize
    }
    return adminFetch<AdminProductListResponse>('/admin/products', {
      query: cleanQuery,
    })
  }

  async function getById(id: string): Promise<AdminProductDetail> {
    return adminFetch<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}`)
  }

  async function create(body: CreateProductInput): Promise<AdminProductDetail> {
    return adminFetch<AdminProductDetail>('/admin/products', {
      method: 'POST',
      body,
    })
  }

  async function update(id: string, body: UpdateProductInput): Promise<AdminProductDetail> {
    return adminFetch<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    })
  }

  async function archive(id: string): Promise<AdminProductDetail> {
    return adminFetch<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
    })
  }

  async function unarchive(id: string): Promise<AdminProductDetail> {
    return adminFetch<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}/unarchive`, {
      method: 'POST',
    })
  }

  async function remove(id: string): Promise<void> {
    await adminFetch(`/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  async function uploadImage(id: string, file: File): Promise<AdminProductImage> {
    const formData = new FormData()
    formData.append('file', file)
    return adminFetch<AdminProductImage>(`/admin/products/${encodeURIComponent(id)}/images`, {
      method: 'POST',
      body: formData,
    })
  }

  async function patchImage(
    id: string,
    imageId: string,
    body: PatchProductImageInput,
  ): Promise<AdminProductImage> {
    return adminFetch<AdminProductImage>(
      `/admin/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
      {
        method: 'PATCH',
        body,
      },
    )
  }

  async function reorderImages(id: string, ids: string[]): Promise<{ success: boolean }> {
    return adminFetch<{ success: boolean }>(`/admin/products/${encodeURIComponent(id)}/images/order`, {
      method: 'PUT',
      body: { ids },
    })
  }

  async function deleteImage(id: string, imageId: string): Promise<void> {
    await adminFetch(
      `/admin/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
      {
        method: 'DELETE',
      },
    )
  }

  return {
    list,
    getById,
    create,
    update,
    archive,
    unarchive,
    remove,
    uploadImage,
    patchImage,
    reorderImages,
    deleteImage,
  }
}
