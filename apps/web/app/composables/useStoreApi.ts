import type {
  BrandDetail,
  BrandSummary,
  CategoryDetail,
  CategoryTreeNode,
  ProductCard,
  ProductDetail,
  ProductListResponse,
  ProductQueryInput,
  SearchResponse,
} from '@serag/shared'

/**
 * Public catalog API composable for the storefront.
 * Exposes plain, typed $fetch helpers intended to be called inside `useAsyncData`.
 */
export function useStoreApi() {
  const baseURL = getApiBaseUrl()

  return {
    /**
     * GET /products
     * Fetches paginated, filtered, sorted product list with live facets.
     */
    products(query?: ProductQueryInput | Record<string, unknown>): Promise<ProductListResponse> {
      return $fetch<ProductListResponse>('/products', {
        baseURL,
        method: 'GET',
        query,
      })
    },

    /**
     * GET /products?ids=...
     * Loads exact product cards by their IDs (used by Wishlist and Compare).
     */
    async productsByIds(ids: readonly string[] | string[]): Promise<ProductCard[]> {
      const cleanIds = ids.map((id) => id.trim()).filter((id) => id.length > 0)
      if (cleanIds.length === 0) {
        return []
      }
      const response = await $fetch<ProductListResponse>('/products', {
        baseURL,
        method: 'GET',
        query: { ids: cleanIds.join(',') },
      })
      return response.items
    },

    /**
     * GET /products/:slug
     * Fetches detailed product data with merged specs, gallery, and related items.
     */
    product(slug: string): Promise<ProductDetail> {
      return $fetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`, {
        baseURL,
        method: 'GET',
      })
    },

    /**
     * GET /categories
     * Returns visible categories hierarchy tree.
     */
    categories(): Promise<CategoryTreeNode[]> {
      return $fetch<CategoryTreeNode[]>('/categories', {
        baseURL,
        method: 'GET',
      })
    },

    /**
     * GET /categories/:slug
     * Returns a single category with breadcrumbs, children, and spec template fields.
     */
    category(slug: string): Promise<CategoryDetail> {
      return $fetch<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`, {
        baseURL,
        method: 'GET',
      })
    },

    /**
     * GET /brands
     * Returns list of visible brands with non-zero product counts.
     */
    brands(): Promise<BrandSummary[]> {
      return $fetch<BrandSummary[]>('/brands', {
        baseURL,
        method: 'GET',
      })
    },

    /**
     * GET /brands/:slug
     * Returns brand details and SEO metadata.
     */
    brand(slug: string): Promise<BrandDetail> {
      return $fetch<BrandDetail>(`/brands/${encodeURIComponent(slug)}`, {
        baseURL,
        method: 'GET',
      })
    },

    /**
     * GET /search
     * Live search for products and category suggestions.
     */
    search(q: string, limit?: number): Promise<SearchResponse> {
      return $fetch<SearchResponse>('/search', {
        baseURL,
        method: 'GET',
        query: {
          q,
          ...(limit !== undefined ? { limit } : {}),
        },
      })
    },
  }
}
