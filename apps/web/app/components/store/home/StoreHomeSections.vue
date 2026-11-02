<script setup lang="ts">
import type {
  BrandSummary,
  CategoryTreeNode,
  GuideCard,
  HomeContent,
  HomeSectionId,
  ProductCard,
  StoreReviewsResponse,
} from '@serag/shared'
import { type Component, defineAsyncComponent, hydrateOnVisible } from 'vue'
import { firstInput } from '~/composables/useGsap'
import StoreHomeAnnounce from './StoreHomeAnnounce.vue'
import StoreHomeHero from './StoreHomeHero.vue'

/**
 * Every section except the announcement bar and the hero is server-rendered as usual but only
 * hydrated once it scrolls into view. That keeps main-thread work small on phones; a section the
 * owner moves to the top still hydrates right away because it is already visible.
 */
function onVisible(loader: () => Promise<Component>): Component {
  return defineAsyncComponent({ loader, hydrate: hydrateOnVisible() })
}

/**
 * Like onVisible, but the section's code is not even downloaded before the visitor's first
 * scroll, touch, key or pointer move (Vue downloads a lazily hydrated component up front and only
 * delays the hydration). A visitor always does one of those before reaching a section further
 * down, while Lighthouse never interacts: without this, every section's code counts into the
 * home's 200 KB script budget, because its full-page screenshot brings them all into view.
 */
function afterInput(loader: () => Promise<Component>): Component {
  return onVisible(() => (import.meta.server ? loader() : firstInput().then(loader)))
}

const props = defineProps<{
  visibleSections: HomeSectionId[]
  sections: HomeContent
  flashProducts: ProductCard[]
  flashEndsAt: string | null
  featuredCategories: CategoryTreeNode[]
  partners: BrandSummary[]
  guides: GuideCard[]
  /** Not passed by the admin's home preview, which then skips reviews */
  reviews?: StoreReviewsResponse | null
  storyProduct?: ProductCard | null
}>()

/** Static id → section component. */
const COMPONENT_BY_SECTION: Record<HomeSectionId, Component> = {
  announce: StoreHomeAnnounce,
  hero: StoreHomeHero,
  uspStrip: onVisible(() => import('./StoreHomeUspStrip.vue')),
  featuredCategories: onVisible(() => import('./StoreHomeFeaturedCategories.vue')),
  flash: afterInput(() => import('./StoreHomeFlash.vue')),
  productStory: afterInput(() => import('./StoreHomeProductStory.vue')),
  bridalTeaser: afterInput(() => import('./StoreHomeBridalTeaser.vue')),
  tradersTeaser: afterInput(() => import('./StoreHomeTradersTeaser.vue')),
  aboutTeaser: afterInput(() => import('./StoreHomeAboutTeaser.vue')),
  partners: afterInput(() => import('./StoreHomePartners.vue')),
  traderReels: afterInput(() => import('./StoreHomeTraderReels.vue')),
  reviews: afterInput(() => import('./StoreHomeReviews.vue')),
  guides: afterInput(() => import('./StoreHomeGuides.vue')),
}

function sectionProps(id: HomeSectionId) {
  switch (id) {
    case 'announce':
      return { content: props.sections.announce }
    case 'hero':
      return { content: props.sections.hero }
    case 'uspStrip':
      return { content: props.sections.uspStrip }
    case 'featuredCategories':
      return {
        content: props.sections.featuredCategories,
        categories: props.featuredCategories,
      }
    case 'flash':
      return {
        content: props.sections.flash,
        products: props.flashProducts,
        endsAt: props.flashEndsAt,
      }
    case 'productStory':
      return {
        content: props.sections.productStory,
        product: props.storyProduct ?? null,
      }
    case 'bridalTeaser':
      return { content: props.sections.bridalTeaser }
    case 'tradersTeaser':
      return { content: props.sections.tradersTeaser }
    case 'aboutTeaser':
      return { content: props.sections.aboutTeaser }
    case 'partners':
      return {
        content: props.sections.partners,
        brands: props.partners,
      }
    case 'traderReels':
      return { content: props.sections.traderReels }
    case 'reviews':
      return {
        content: props.sections.reviews,
        reviews: props.reviews ?? null,
      }
    case 'guides':
      return {
        content: props.sections.guides,
        guides: props.guides,
      }
  }
}

/**
 * Prototype sections that are not owner-editable yet. Each follows the first of its anchors
 * that is on the page (so hiding or reordering a CMS section never drops it); without any,
 * it goes last.
 */
type ExtraSectionId = 'howItWorks' | 'sourcing' | 'contactCta'

const EXTRA_SECTIONS: { id: ExtraSectionId; anchors: string[]; component: Component }[] = [
  {
    id: 'howItWorks',
    anchors: ['flash', 'featuredCategories', 'uspStrip', 'hero'],
    component: afterInput(() => import('./StoreHomeHowItWorks.vue')),
  },
  {
    id: 'sourcing',
    anchors: ['traderReels', 'partners', 'aboutTeaser', 'tradersTeaser'],
    component: afterInput(() => import('./StoreHomeSourcing.vue')),
  },
  {
    id: 'contactCta',
    anchors: ['guides', 'partners', 'aboutTeaser'],
    component: afterInput(() => import('./StoreHomeContactCta.vue')),
  },
]

function extraProps(id: ExtraSectionId) {
  if (id === 'sourcing') return { brands: props.partners }
  return {}
}

// The scroll reveal leaves a transform on the section, and a transformed ancestor breaks the
// product story's pinned (position: fixed) scene.
const NO_REVEAL = new Set<string>(['announce', 'hero', 'productStory'])

const renderedSections = computed(() => {
  const list: { id: string; component: Component; props: Record<string, unknown> }[] =
    props.visibleSections.map((id) => ({
      id,
      component: COMPONENT_BY_SECTION[id],
      props: sectionProps(id),
    }))
  for (const extra of EXTRA_SECTIONS) {
    const entry = { id: extra.id, component: extra.component, props: extraProps(extra.id) }
    const anchor = extra.anchors.find((a) => list.some((item) => item.id === a))
    const at = anchor ? list.findIndex((item) => item.id === anchor) + 1 : list.length
    list.splice(at, 0, entry)
  }
  return list
})
</script>

<template>
  <component
    :is="section.component"
    v-for="section in renderedSections"
    :key="section.id"
    :class="NO_REVEAL.has(section.id) ? undefined : 'scroll-reveal'"
    v-bind="section.props"
  />
</template>
