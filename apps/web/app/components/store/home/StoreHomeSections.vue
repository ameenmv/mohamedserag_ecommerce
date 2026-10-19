<script setup lang="ts">
import type {
  BrandSummary,
  CategoryTreeNode,
  GuideCard,
  HomeContent,
  HomeSectionId,
  ProductCard,
} from '@serag/shared'
import type { Component } from 'vue'
import StoreHomeAnnounce from './StoreHomeAnnounce.vue'
import StoreHomeHero from './StoreHomeHero.vue'
import StoreHomeUspStrip from './StoreHomeUspStrip.vue'
import StoreHomeFeaturedCategories from './StoreHomeFeaturedCategories.vue'
import StoreHomeFlash from './StoreHomeFlash.vue'
import StoreHomeBridalTeaser from './StoreHomeBridalTeaser.vue'
import StoreHomeTradersTeaser from './StoreHomeTradersTeaser.vue'
import StoreHomeAboutTeaser from './StoreHomeAboutTeaser.vue'
import StoreHomePartners from './StoreHomePartners.vue'
import StoreHomeGuides from './StoreHomeGuides.vue'

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
  uspStrip: StoreHomeUspStrip,
  featuredCategories: StoreHomeFeaturedCategories,
  flash: StoreHomeFlash,
  bridalTeaser: StoreHomeBridalTeaser,
  tradersTeaser: StoreHomeTradersTeaser,
  aboutTeaser: StoreHomeAboutTeaser,
  partners: StoreHomePartners,
  guides: StoreHomeGuides,
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
