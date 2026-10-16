<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'

const head = useLocaleHead()

const { t, localeProperties } = useI18n()

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
    <Toaster :dir="localeProperties.dir" rich-colors position="bottom-center" />
  </div>
</template>
