<script setup lang="ts">
const head = useLocaleHead()

const { t } = useI18n()

useHead({
  htmlAttrs: {
    lang: () => head.value.htmlAttrs?.lang,
    dir: () => head.value.htmlAttrs?.dir,
  },
  titleTemplate: (titleChunk) => {
    const storeName = t('brand.storeName')
    const trimmed = titleChunk?.trim()
    if (!trimmed || trimmed === storeName) {
      return storeName
    }
    return `${trimmed} · ${storeName}`
  },
  link: () => head.value.link || [],
  meta: () => head.value.meta || [],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <LazyCommonAppToaster />
  </div>
</template>
