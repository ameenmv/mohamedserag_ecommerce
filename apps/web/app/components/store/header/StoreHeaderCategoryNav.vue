<script setup lang="ts">
import { Menu } from '@lucide/vue'
import type { CategoryTreeNode } from '@serag/shared'

defineProps<{
  categories: CategoryTreeNode[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

// Tight enough that every link fits on one row at 1440 px in both languages.
const linkClass =
  'flex min-h-12 items-center whitespace-nowrap px-2.5 text-[15px] transition-colors hover:text-serag-gold focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none focus-visible:ring-inset xl:px-3'
</script>

<template>
  <nav :aria-label="t('store.header.categoriesNav')" class="hidden bg-serag-green text-[#F1EBD0] md:block">
    <div class="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 scrollbar-none sm:px-6 lg:px-10">
      <NuxtLink
        :to="localePath('/shop')"
        class="flex min-h-12 items-center gap-2.5 bg-serag-deep px-5 font-bold whitespace-nowrap focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none focus-visible:ring-inset"
      >
        <Menu class="size-[18px] text-serag-gold-hi" aria-hidden="true" />
        {{ t('store.header.allCategories') }}
      </NuxtLink>
      <NuxtLink
        v-for="category in categories"
        :key="category.slug"
        :to="localePath(`/c/${category.slug}`)"
        :class="[linkClass, 'font-medium']"
      >
        {{ category.name }}
      </NuxtLink>
      <NuxtLink :to="localePath('/offers')" :class="[linkClass, 'font-bold text-[#FFB59C]']">
        {{ t('store.header.flashDeals') }}
      </NuxtLink>
      <NuxtLink :to="localePath('/traders')" :class="[linkClass, 'font-bold text-serag-gold-hi']">
        {{ t('store.header.tradersWholesale') }}
      </NuxtLink>
      <NuxtLink :to="localePath({ path: '/', hash: '#traders-reviews' })" :class="[linkClass, 'font-medium']">
        {{ t('store.header.tradersReviews') }}
      </NuxtLink>
      <NuxtLink :to="localePath('/pages/about')" :class="[linkClass, 'font-medium']">
        {{ t('store.header.aboutUs') }}
      </NuxtLink>
    </div>
  </nav>
</template>
