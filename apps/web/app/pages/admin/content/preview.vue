<script setup lang="ts">
import type {
  BrandSummary,
  CategoryTreeNode,
  GuideCard,
  HomeContent,
  HomeLayout,
  ProductCard,
} from '@serag/shared'
import { DEFAULT_HOME_CONTENT, DEFAULT_HOME_LAYOUT, PERMISSIONS } from '@serag/shared'
import { useAdminCms } from '~/composables/useAdminCms'

definePageMeta({
  layout: false,
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.content.manage)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

useSeoMeta({ title: 'preview', robots: 'noindex, nofollow' })

const storeApi = useStoreApi()
const cms = useAdminCms()

const draftSections = ref<HomeContent>(DEFAULT_HOME_CONTENT)
const draftLayout = ref<HomeLayout>(DEFAULT_HOME_LAYOUT)
const flashProducts = ref<ProductCard[]>([])
const flashEndsAt = ref<string | null>(null)
const categories = ref<CategoryTreeNode[]>([])
const brands = ref<BrandSummary[]>([])
const guides = ref<GuideCard[]>([])

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

const featuredCategories = computed<CategoryTreeNode[]>(() => {
  const index = indexCategories(categories.value)
  const result: CategoryTreeNode[] = []
  for (const slug of draftSections.value.featuredCategories.categorySlugs) {
    const node = index.get(slug)
    if (node) result.push(node)
  }
  return result
})

const partners = computed(() => brands.value.filter((brand) => brand.logoUrl !== null))

const visibleSections = computed(() =>
  visibleHomeSections(draftLayout.value, draftSections.value, {
    flashCount: flashProducts.value.length,
    partnerCount: partners.value.length,
    guideCount: guides.value.length,
    featuredCategoryCount: featuredCategories.value.length,
  }),
)

// The admin session cookie is not forwarded during SSR, so the draft loads in the browser
async function loadPreview(): Promise<void> {
  try {
    const [home, offers, cats, brandList, guideList] = await Promise.all([
      cms.getHome(),
      storeApi.offers().catch(() => ({ flash: [], discounted: [] })),
      storeApi.categories().catch(() => [] as CategoryTreeNode[]),
      storeApi.brands().catch(() => [] as BrandSummary[]),
      storeApi.latestGuides(3).catch(() => [] as GuideCard[]),
    ])
    draftSections.value = home.draft.sections
    draftLayout.value = home.draft.layout
    flashProducts.value = offers.flash.flatMap((group) => group.products)
    flashEndsAt.value =
      offers.flash.map((group) => group.endsAt).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null
    categories.value = cats
    brands.value = brandList
    guides.value = guideList
  } catch {
    // Any failure renders the built-in defaults.
  }
}

const loaded = ref(false)
onMounted(async () => {
  await loadPreview()
  loaded.value = true
})
</script>

<template>
  <div class="min-h-screen bg-serag-ivory">
    <StoreHomeSections
      v-if="loaded"
      :visible-sections="visibleSections"
      :sections="draftSections"
      :flash-products="flashProducts"
      :flash-ends-at="flashEndsAt"
      :featured-categories="featuredCategories"
      :partners="partners"
      :guides="guides"
    />
  </div>
</template>
