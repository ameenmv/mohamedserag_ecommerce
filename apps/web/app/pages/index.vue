<script setup lang="ts">
const { t } = useI18n()

useSeoPage({
  title: () => t('brand.storeName'),
  description: () => t('store.home.metaDescription'),
})

const { sections, visibleSections, flashProducts, flashEndsAt, featuredCategories, partners, guides } =
  await useHomeContent()
</script>

<template>
  <main class="w-full min-w-0">
    <StoreHomeSections
      :visible-sections="visibleSections"
      :sections="sections"
      :flash-products="flashProducts"
      :flash-ends-at="flashEndsAt"
      :featured-categories="featuredCategories"
      :partners="partners"
      :guides="guides"
    />
  </main>
</template>
