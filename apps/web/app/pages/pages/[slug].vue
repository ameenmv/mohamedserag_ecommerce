<script setup lang="ts">
const { t } = useI18n()

const { page, title, seoTitle, seoDescription, updatedLabel } = await useContentPage()

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
})
</script>

<template>
  <main class="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <StoreListingBreadcrumb :items="[{ label: title }]" />

    <article class="mt-4">
      <h1 class="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
        {{ title }}
      </h1>
      <p v-if="page" class="num mt-2 text-xs text-muted-foreground sm:text-sm">
        {{ t('store.pages.updatedAt', { date: updatedLabel }) }}
      </p>

      <div v-if="page" class="mt-6">
        <StoreContentProse :html="page.body" />
      </div>
    </article>
  </main>
</template>
