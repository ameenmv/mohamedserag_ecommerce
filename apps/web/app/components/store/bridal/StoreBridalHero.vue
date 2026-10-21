<script setup lang="ts">
import { Sparkles } from '@lucide/vue'

const { t } = useI18n()
</script>

<template>
  <section class="relative overflow-hidden rounded-3xl bg-gradient-to-b from-serag-night/5 via-serag-gold/5 to-transparent px-4 py-8 text-center sm:px-6 sm:py-12 lg:px-8">
    <div class="mx-auto max-w-3xl">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-serag-gold/30 bg-serag-gold/10 px-3.5 py-1 text-xs font-bold text-serag-night dark:text-serag-gold">
        <Sparkles class="size-3.5 text-serag-gold" aria-hidden="true" />
        <span>{{ t('store.header.bridal') }}</span>
      </div>

      <h1 class="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {{ t('store.bridal.hero.title') }}
      </h1>

      <p class="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        {{ t('store.bridal.hero.subtitle') }}
      </p>
    </div>
  </section>
</template>
