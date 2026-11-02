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
import { type Component, defineAsyncComponent, defineComponent, h, hydrateOnVisible } from 'vue'
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
 * The product story is rendered in the browser only, once the visitor first scrolls, touches,
 * types or moves the pointer: its code (five illustrated appliances) then never counts into the
 * home's 200 KB first-load script budget. It sits far below the fold, so it is in place long
 * before anyone reaches it. (A lazily hydrated section would not help: Vue downloads its code up
 * front and only delays the hydration.)
 */
function afterFirstInput(loader: () => Promise<Component>): Component {
  const inner = defineAsyncComponent({ loader, suspensible: false })
  return defineComponent({
    inheritAttrs: false,
    setup(_, { attrs }) {
      const ready = ref(false)
      onMounted(() => {
        void firstInput().then(() => {
          ready.value = true
        })
      })
      return () => (ready.value ? h(inner, attrs) : null)
    },
  })
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
  flash: onVisible(() => import('./StoreHomeFlash.vue')),
  productStory: afterFirstInput(() => import('./StoreHomeProductStory.vue')),
  bridalTeaser: onVisible(() => import('./StoreHomeBridalTeaser.vue')),
  tradersTeaser: onVisible(() => import('./StoreHomeTradersTeaser.vue')),
  aboutTeaser: onVisible(() => import('./StoreHomeAboutTeaser.vue')),
  partners: onVisible(() => import('./StoreHomePartners.vue')),
  traderReels: onVisible(() => import('./StoreHomeTraderReels.vue')),
  reviews: onVisible(() => import('./StoreHomeReviews.vue')),
  guides: onVisible(() => import('./StoreHomeGuides.vue')),
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
    component: onVisible(() => import('./StoreHomeHowItWorks.vue')),
  },
  {
    id: 'sourcing',
    anchors: ['traderReels', 'partners', 'aboutTeaser', 'tradersTeaser'],
    component: onVisible(() => import('./StoreHomeSourcing.vue')),
  },
  {
    id: 'contactCta',
    anchors: ['guides', 'partners', 'aboutTeaser'],
    component: onVisible(() => import('./StoreHomeContactCta.vue')),
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
