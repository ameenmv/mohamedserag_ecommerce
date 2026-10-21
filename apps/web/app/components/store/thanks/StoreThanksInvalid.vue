<script setup lang="ts">
import { AlertCircle, Home, LayoutGrid } from '@lucide/vue'

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
    <div class="flex size-18 items-center justify-center rounded-3xl bg-muted mx-auto text-muted-foreground mb-6">
      <AlertCircle class="size-10 text-muted-foreground" aria-hidden="true" />
    </div>

    <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-3">
      {{ t('store.thanks.invalidLinkTitle') }}
    </h1>

    <p class="text-sm text-muted-foreground mb-8">
      {{ t('store.thanks.invalidLinkDescription') }}
    </p>

    <div class="flex flex-wrap items-center justify-center gap-3">
      <NuxtLink
        :to="localePath('/')"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-serag-night px-5 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Home class="size-4" aria-hidden="true" />
        <span>{{ t('store.thanks.backToHome') }}</span>
      </NuxtLink>

      <NuxtLink
        :to="localePath('/shop')"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input bg-background px-5 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <LayoutGrid class="size-4" aria-hidden="true" />
        <span>{{ t('store.thanks.browseShop') }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
