<script setup lang="ts">
import type {
  BrandSummary,
  CategoryTreeNode,
  GuideCard,
  HomeContent,
  HomeSectionId,
  ProductCard,
} from '@serag/shared'
import { type Component, defineAsyncComponent, hydrateOnVisible } from 'vue'
import StoreHomeAnnounce from './StoreHomeAnnounce.vue'
import StoreHomeHero from './StoreHomeHero.vue'

/**
 * Every section except the announcement bar and the hero is server-rendered as usual but only
 * hydrated (and its code only downloaded) once it scrolls into view. That keeps the first-load
 * JS and main-thread work small on phones; a section the owner moves to the top still hydrates
 * right away because it is already visible.
 */
function onVisible(loader: () => Promise<Component>): Component {
  return defineAsyncComponent({ loader, hydrate: hydrateOnVisible() })
}

const props = defineProps<{
  visibleSections: HomeSectionId[]
  sections: HomeContent
  flashProducts: ProductCard[]
  featuredCategories: CategoryTreeNode[]
  partners: BrandSummary[]
  guides: GuideCard[]
}>()

/** Static id → section component. */
const COMPONENT_BY_SECTION: Record<HomeSectionId, Component> = {
  announce: StoreHomeAnnounce,
  hero: StoreHomeHero,
  uspStrip: onVisible(() => import('./StoreHomeUspStrip.vue')),
  featuredCategories: onVisible(() => import('./StoreHomeFeaturedCategories.vue')),
  flash: onVisible(() => import('./StoreHomeFlash.vue')),
  bridalTeaser: onVisible(() => import('./StoreHomeBridalTeaser.vue')),
  tradersTeaser: onVisible(() => import('./StoreHomeTradersTeaser.vue')),
  aboutTeaser: onVisible(() => import('./StoreHomeAboutTeaser.vue')),
  partners: onVisible(() => import('./StoreHomePartners.vue')),
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
    case 'guides':
      return {
        content: props.sections.guides,
        guides: props.guides,
      }
  }
}

const renderedSections = computed(() =>
  props.visibleSections.map((id) => ({
    id,
    component: COMPONENT_BY_SECTION[id],
    props: sectionProps(id),
  })),
)
</script>

<template>
  <component
    :is="section.component"
    v-for="section in renderedSections"
    :key="section.id"
    v-bind="section.props"
  />
</template>
