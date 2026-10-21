import type { MaybeRefOrGetter } from 'vue'
import type {
  PublicReview,
  PublicReviewListResponse,
  ReviewRatingSummary,
} from '@serag/shared'
import { apiFetch } from '../utils/api'

/**
 * Pure fetcher loading a page of approved product reviews.
 * Adheres to GET /api/products/:slug/reviews contract.
 */
export async function loadProductReviews(
  slug: string,
  page = 1,
  pageSize = 10,
): Promise<PublicReviewListResponse> {
  return await apiFetch<PublicReviewListResponse>(`/products/${encodeURIComponent(slug)}/reviews`, {
    method: 'GET',
    query: { page, pageSize },
  })
}

/**
 * Composable managing product reviews page-level state:
 * - First page SSR-rendered via useAsyncData (key includes slug).
 * - Client-side pagination appending next pages via loadMore().
 * - Exposes summary, reviews, total, hasMore, loadingMore, error, and retry methods.
 */
export function useProductReviews(slugInput: MaybeRefOrGetter<string>) {
  const slug = computed(() => toValue(slugInput))
  const page = ref(1)
  const pageSize = 10
  const loadingMore = ref(false)
  const loadMoreError = ref<unknown | null>(null)
  const additionalReviews = ref<PublicReview[]>([])

  const { data, error: asyncError, refresh: baseRefresh } = useAsyncData(
    () => `product-reviews:${slug.value}`,
    () => loadProductReviews(slug.value, 1, pageSize),
    {
      watch: [slug],
    },
  )

  watch(slug, () => {
    page.value = 1
    additionalReviews.value = []
    loadMoreError.value = null
  })

  async function refresh(): Promise<void> {
    page.value = 1
    additionalReviews.value = []
    loadMoreError.value = null
    await baseRefresh()
  }

  const summary = computed<ReviewRatingSummary | null>(() => data.value?.summary ?? null)
  const total = computed(() => data.value?.total ?? 0)

  const reviews = computed<PublicReview[]>(() => {
    const initial = data.value?.items ?? []
    return [...initial, ...additionalReviews.value]
  })

  const hasMore = computed(() => reviews.value.length < total.value)

  async function loadMore(): Promise<void> {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    loadMoreError.value = null
    try {
      const nextPage = page.value + 1
      const res = await loadProductReviews(slug.value, nextPage, pageSize)
      additionalReviews.value.push(...res.items)
      page.value = nextPage
    } catch (err: unknown) {
      loadMoreError.value = err
    } finally {
      loadingMore.value = false
    }
  }

  return {
    load: loadProductReviews,
    summary,
    reviews,
    total,
    hasMore,
    loadingMore,
    error: computed(() => asyncError.value || loadMoreError.value),
    loadMore,
    refresh,
  }
}
