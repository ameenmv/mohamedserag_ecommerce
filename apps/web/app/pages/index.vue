<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('brand.storeName'),
  description: () => t('store.home.metaDescription'),
  ogDescription: () => t('store.home.metaDescription'),
})

const { sections, visibleSections, flashProducts, featuredCategories, partners, guides } =
  await useHomeContent()
</script>

<template>
  <main class="w-full min-w-0">
    <StoreHomeSections
      :visible-sections="visibleSections"
      :sections="sections"
      :flash-products="flashProducts"
      :featured-categories="featuredCategories"
      :partners="partners"
      :guides="guides"
    />
  </main>
</template>
