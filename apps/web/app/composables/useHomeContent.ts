import type {
  BrandSummary,
  CategoryTreeNode,
  GuideCard,
  HomeSectionId,
  ProductCard,
  PublicHome,
  StoreReviewsResponse,
} from '@serag/shared'
import { DEFAULT_HOME_CONTENT, DEFAULT_HOME_LAYOUT } from '@serag/shared'

interface HomeBundle {
  home: PublicHome
  flashProducts: ProductCard[]
  /** When the soonest-ending running flash sale ends (ISO), or null without one. */
  flashEndsAt: string | null
  categories: CategoryTreeNode[]
  brands: BrandSummary[]
  guides: GuideCard[]
  reviews: StoreReviewsResponse
  storyProduct: ProductCard | null
}

const EMPTY_HOME: PublicHome = {
  layout: DEFAULT_HOME_LAYOUT,
  sections: DEFAULT_HOME_CONTENT,
  publishedAt: null,
}

/** Flattens a category tree into a slug → node map (any depth). */
function indexCategories(nodes: CategoryTreeNode[]): Map<string, CategoryTreeNode> {
  const map = new Map<string, CategoryTreeNode>()
  const walk = (list: CategoryTreeNode[]): void => {
    for (const node of list) {
      map.set(node.slug, node)
      walk(node.children)
    }
  }
  walk(nodes)
  return map
}

/**
 * Loads everything the CMS-driven home page needs in parallel.
 * Auxiliary data (offers, categories, brands, guides) fails soft to empty
 * so a single unavailable endpoint never breaks the whole page.
 */
export async function useHomeContent() {
  const storeApi = useStoreApi()
  const nuxtApp = useNuxtApp()

  const asyncData = await useAsyncData<HomeBundle>('store:home', async () => {
    const [home, offers, categories, brands, guides, reviews] = await Promise.all([
      storeApi.home().catch(() => EMPTY_HOME),
      storeApi.offers().catch(() => ({ flash: [], discounted: [] })),
      storeApi.categories().catch(() => [] as CategoryTreeNode[]),
      storeApi.brands().catch(() => [] as BrandSummary[]),
      storeApi.latestGuides(3).catch(() => [] as GuideCard[]),
      storeApi.latestReviews().catch((): StoreReviewsResponse => ({ items: [], summary: { average: 0, count: 0 } })),
    ])

    const flashProducts = offers.flash.flatMap((group) => group.products)
    const flashEndsAt =
      offers.flash.map((group) => group.endsAt).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null

    // After the `await` above the Nuxt context is gone on the server, and the API helper reads the
    // runtime config synchronously: without runWithContext it throws (not rejects), failing the
    // whole bundle so the home falls back to the built-in defaults.
    const productSlug = home.sections.productStory?.productSlug
    const storyProduct = productSlug
      ? await nuxtApp
          .runWithContext(() => storeApi.product(productSlug))
          // Imported here, not at the top: on first load the card arrives in the page data, so
          // the mapper stays out of the home's first-load scripts (Lighthouse budget)
          .then(async (detail) => (await import('~/utils/product-card-mapper')).toProductCard(detail), () => null)
      : null

    return { home, flashProducts, flashEndsAt, categories, brands, guides, reviews, storyProduct }
  })

  const home = computed(() => asyncData.data.value?.home ?? EMPTY_HOME)
  const sections = computed(() => home.value.sections)
  const flashProducts = computed(() => asyncData.data.value?.flashProducts ?? [])
  const flashEndsAt = computed(() => asyncData.data.value?.flashEndsAt ?? null)
  const brands = computed(() => asyncData.data.value?.brands ?? [])
  const guides = computed(() => asyncData.data.value?.guides ?? [])
  const reviews = computed(() => asyncData.data.value?.reviews ?? null)
  const storyProduct = computed(() => asyncData.data.value?.storyProduct ?? null)

  const featuredCategories = computed<CategoryTreeNode[]>(() => {
    const index = indexCategories(asyncData.data.value?.categories ?? [])
    const result: CategoryTreeNode[] = []
    for (const slug of sections.value.featuredCategories.categorySlugs) {
      const node = index.get(slug)
      if (node) result.push(node)
    }
    return result
  })

  const partners = computed(() =>
    brands.value.filter((brand) => brand.logoUrl !== null),
  )

  const visibleSections = computed<HomeSectionId[]>(() =>
    visibleHomeSections(home.value.layout, sections.value, {
      flashCount: flashProducts.value.length,
      partnerCount: partners.value.length,
      guideCount: guides.value.length,
      featuredCategoryCount: featuredCategories.value.length,
      storyProduct: storyProduct.value !== null,
      reviewCount: reviews.value?.items.length ?? 0,
    }),
  )

  return {
    ...asyncData,
    home,
    sections,
    visibleSections,
    flashProducts,
    flashEndsAt,
    featuredCategories,
    partners,
    guides,
    reviews,
    storyProduct,
  }
}
