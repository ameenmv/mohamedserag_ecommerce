import type {
  BrandDetail,
  BrandSummary,
  CategoryDetail,
  CategoryTreeNode,
  GuideCard,
  OffersResponse,
  ProductCard,
  ProductDetail,
  ProductListResponse,
  ProductQueryInput,
  PublicGuide,
  PublicHome,
  PublicPage,
  PublicPageLink,
  PublicQuiz,
  PublicStoreInfo,
  QuizAnswers,
  QuizResultsResponse,
  SearchResponse,
} from '@serag/shared'
import { apiFetch } from '../utils/api'

export interface GuidesPageResponse {
  items: GuideCard[]
  total: number
  page: number
  pageSize: number
}

/**
 * Public catalog API composable for the storefront.
 * Exposes plain, typed fetch helpers intended to be called inside `useAsyncData`.
 */
export function useStoreApi() {
  return {
    /**
     * GET /products
     * Fetches paginated, filtered, sorted product list with live facets.
     */
    products(query?: ProductQueryInput | Record<string, unknown>): Promise<ProductListResponse> {
      return apiFetch<ProductListResponse>('/products', {
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
      const response = await apiFetch<ProductListResponse>('/products', {
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
      return apiFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`, {
        method: 'GET',
      })
    },

    /**
     * GET /categories
     * Returns visible categories hierarchy tree.
     */
    categories(): Promise<CategoryTreeNode[]> {
      return apiFetch<CategoryTreeNode[]>('/categories', {
        method: 'GET',
      })
    },

    /**
     * GET /categories/:slug
     * Returns a single category with breadcrumbs, children, and spec template fields.
     */
    category(slug: string): Promise<CategoryDetail> {
      return apiFetch<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`, {
        method: 'GET',
      })
    },

    /**
     * GET /brands
     * Returns list of visible brands with non-zero product counts.
     */
    brands(): Promise<BrandSummary[]> {
      return apiFetch<BrandSummary[]>('/brands', {
        method: 'GET',
      })
    },

    /**
     * GET /brands/:slug
     * Returns brand details and SEO metadata.
     */
    brand(slug: string): Promise<BrandDetail> {
      return apiFetch<BrandDetail>(`/brands/${encodeURIComponent(slug)}`, {
        method: 'GET',
      })
    },

    /**
     * GET /search
     * Live search for products and category suggestions.
     */
    search(q: string, limit?: number): Promise<SearchResponse> {
      return apiFetch<SearchResponse>('/search', {
        method: 'GET',
        query: {
          q,
          ...(limit !== undefined ? { limit } : {}),
        },
      })
    },

    /**
     * GET /offers
     * Returns running flash sales and discounted items.
     */
    offers(): Promise<OffersResponse> {
      return apiFetch<OffersResponse>('/offers', {
        method: 'GET',
      })
    },

    /**
     * GET /content/home
     * Returns the published homepage layout and section content.
     */
    home(): Promise<PublicHome> {
      return apiFetch<PublicHome>('/content/home', {
        method: 'GET',
      })
    },

    /**
     * GET /pages
     * Returns the published content pages (slug + title) used by the footer.
     */
    pages(): Promise<{ items: PublicPageLink[] }> {
      return apiFetch<{ items: PublicPageLink[] }>('/pages', {
        method: 'GET',
      })
    },

    /**
     * GET /pages/:slug
     * Returns one published content page with its sanitized body and SEO fields.
     * Rejects with a 404 when the page is unpublished or unknown.
     */
    page(slug: string): Promise<PublicPage> {
      return apiFetch<PublicPage>(`/pages/${encodeURIComponent(slug)}`, {
        method: 'GET',
      })
    },

    /**
     * GET /settings/store
     * Returns the public store details (name, phones, WhatsApp numbers, address, hours).
     * Values may still hold `[…]` placeholders before launch; check with `hasPlaceholder`.
     */
    storeInfo(): Promise<PublicStoreInfo> {
      return apiFetch<PublicStoreInfo>('/settings/store', {
        method: 'GET',
      })
    },

    /**
     * GET /guides
     * Returns the newest published buying guides.
     */
    async latestGuides(limit = 3): Promise<GuideCard[]> {
      const response = await apiFetch<{ items: GuideCard[] }>('/guides', {
        method: 'GET',
        query: { pageSize: limit },
      })
      return response.items
    },

    /**
     * GET /guides
     * Returns a page of published buying guides (12 per page by default).
     */
    guides(page = 1, pageSize = 12): Promise<GuidesPageResponse> {
      return apiFetch<GuidesPageResponse>('/guides', {
        method: 'GET',
        query: { page, pageSize },
      })
    },

    /**
     * GET /guides/:slug
     * Returns one published guide with its body, categories and related product cards.
     * Rejects with a 404 when the guide is unpublished or unknown.
     */
    guide(slug: string): Promise<PublicGuide> {
      return apiFetch<PublicGuide>(`/guides/${encodeURIComponent(slug)}`, {
        method: 'GET',
      })
    },

    /**
     * GET /quiz/:categorySlug
     * Returns the «ساعدني أختار» quiz questions for a category (rules are never exposed).
     * Rejects with a 404 when the category has no quiz or is hidden.
     */
    quiz(categorySlug: string): Promise<PublicQuiz> {
      return apiFetch<PublicQuiz>(`/quiz/${encodeURIComponent(categorySlug)}`, {
        method: 'GET',
      })
    },

    /**
     * POST /quiz/:categorySlug/results
     * Scores the shopper's answers and returns up to three recommended product cards.
     */
    quizResults(categorySlug: string, answers: QuizAnswers): Promise<QuizResultsResponse> {
      return apiFetch<QuizResultsResponse>(`/quiz/${encodeURIComponent(categorySlug)}/results`, {
        method: 'POST',
        body: { answers },
      })
    },
  }
}
