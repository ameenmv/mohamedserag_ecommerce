<script setup lang="ts">
import { AlertCircle, ArrowLeft } from '@lucide/vue'

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="mx-auto max-w-md py-16 text-center">
    <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
      <AlertCircle class="size-8" aria-hidden="true" />
    </div>

    <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
      {{ t('store.bridal.notFound.title') }}
    </h1>

    <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
      {{ t('store.bridal.notFound.description') }}
    </p>

    <div class="mt-6">
      <NuxtLink
        :to="localePath('/bridal')"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-serag-night px-6 text-sm font-bold text-serag-ivory shadow transition-colors hover:bg-serag-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-serag-gold dark:text-serag-night dark:hover:bg-serag-gold-hi"
      >
        <span>{{ t('store.bridal.notFound.backButton') }}</span>
        <ArrowLeft class="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden="true" />
      </NuxtLink>
    </div>
  </div>
</template>
