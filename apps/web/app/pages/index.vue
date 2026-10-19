<script setup lang="ts">
// Placeholder home until T007 (store shell) and Slice 6 (CMS home) land.
const { t } = useI18n()
useSeoMeta({
  title: () => t('brand.storeName'),
  description: () => t('store.home.metaDescription'),
  ogDescription: () => t('store.home.metaDescription'),
})
</script>

<template>
  <main class="mx-auto grid min-h-dvh max-w-3xl place-content-center gap-6 p-6 text-center">
    <h1 class="font-display text-5xl text-primary">{{ t('brand.storeName') }}</h1>
    <p class="text-muted-foreground">{{ t('store.home.subtitle') }}</p>
    <div class="flex justify-center gap-3">
      <Button>{{ t('store.home.shopNow') }}</Button>
      <Button variant="outline">{{ t('store.home.bridalPackages') }}</Button>
    </div>
    <p class="num text-sm text-foreground/80">{{ t('store.home.samplePrice') }}</p>
  </main>
</template>
