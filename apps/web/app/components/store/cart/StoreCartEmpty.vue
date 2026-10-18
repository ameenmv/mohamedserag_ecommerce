<script setup lang="ts">
import { ShoppingBag } from '@lucide/vue'

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/80 bg-card/60 px-4 py-16 text-center sm:py-20">
    <div class="flex size-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
      <ShoppingBag class="size-10" aria-hidden="true" />
    </div>
    <div class="max-w-md space-y-2">
      <h2 class="text-xl font-bold text-foreground sm:text-2xl">
        {{ t('store.cart.emptyTitle') }}
      </h2>
      <p class="text-sm text-muted-foreground">
        {{ t('store.cart.emptyDescription') }}
      </p>
    </div>
    <NuxtLink
      :to="localePath('/shop')"
      class="inline-flex min-h-11 items-center justify-center rounded-xl bg-serag-night px-6 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {{ t('store.cart.browseProducts') }}
    </NuxtLink>
  </div>
</template>
