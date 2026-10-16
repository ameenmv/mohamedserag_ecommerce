<script setup lang="ts">
import 'vue-sonner/style.css'

const Toaster = defineAsyncComponent(() => import('@/components/ui/sonner').then((m) => m.Toaster))

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
    <ClientOnly>
      <Toaster :dir="localeProperties.dir" rich-colors position="bottom-center" />
    </ClientOnly>
  </div>
</template>
