<script setup lang="ts">
import { ShoppingCart } from '@lucide/vue'

defineProps<{
  count: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath('/cart')"
    class="relative inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-3 font-bold text-accent-foreground transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4 motion-reduce:transition-none"
  >
    <ShoppingCart class="size-5" aria-hidden="true" />
    <span class="sr-only">{{ t('store.header.cartCount', { count }) }}</span>
    <span class="hidden text-sm sm:inline" aria-hidden="true">{{ t('store.header.cart') }}</span>
    <span
      aria-hidden="true"
      class="num inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-serag-ink px-1.5 text-xs font-extrabold text-serag-gold-hi"
    >
      {{ count }}
    </span>
  </NuxtLink>
</template>
