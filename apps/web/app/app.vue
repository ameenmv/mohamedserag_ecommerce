<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'

const STORE_NAME = 'معرض محمد سراج'

useHead({
  titleTemplate: (titleChunk) => {
    const trimmed = titleChunk?.trim()
    if (!trimmed || trimmed === STORE_NAME) {
      return STORE_NAME
    }
    return `${trimmed} · ${STORE_NAME}`
  },
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster dir="rtl" rich-colors position="bottom-center" />
  </div>
</template>
