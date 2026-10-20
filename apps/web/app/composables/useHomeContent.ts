import type {
  BrandSummary,
  CategoryTreeNode,
  GuideCard,
  HomeSectionId,
  ProductCard,
  PublicHome,
} from '@serag/shared'
import { DEFAULT_HOME_CONTENT, DEFAULT_HOME_LAYOUT } from '@serag/shared'

interface HomeBundle {
  home: PublicHome
  flashProducts: ProductCard[]
  categories: CategoryTreeNode[]
  brands: BrandSummary[]
  guides: GuideCard[]
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

  const asyncData = await useAsyncData<HomeBundle>('store:home', async () => {
    const [home, offers, categories, brands, guides] = await Promise.all([
      storeApi.home().catch(() => EMPTY_HOME),
      storeApi.offers().catch(() => ({ flash: [], discounted: [] })),
      storeApi.categories().catch(() => [] as CategoryTreeNode[]),
      storeApi.brands().catch(() => [] as BrandSummary[]),
      storeApi.latestGuides(3).catch(() => [] as GuideCard[]),
    ])

    const flashProducts = offers.flash.flatMap((group) => group.products)

    return { home, flashProducts, categories, brands, guides }
  })

  const home = computed(() => asyncData.data.value?.home ?? EMPTY_HOME)
  const sections = computed(() => home.value.sections)
  const flashProducts = computed(() => asyncData.data.value?.flashProducts ?? [])
  const brands = computed(() => asyncData.data.value?.brands ?? [])
  const guides = computed(() => asyncData.data.value?.guides ?? [])

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
    }),
  )

  return {
    ...asyncData,
    home,
    sections,
    visibleSections,
    flashProducts,
    featuredCategories,
    partners,
    guides,
  }
}
