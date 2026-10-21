<script setup lang="ts">
import { ArrowRight, LayoutGrid } from '@lucide/vue'
import type { CategoryTreeNode, HomeContent } from '@serag/shared'

defineProps<{
  content: HomeContent['featuredCategories']
  categories: CategoryTreeNode[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const headingId = useId()
</script>

<template>
  <section
    class="bg-serag-ivory"
    :aria-labelledby="headingId"
  >
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div class="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold tracking-[0.25em] text-serag-gold-ink uppercase">
            {{ t('store.home.categoriesEyebrow') }}
          </p>
          <h2
            :id="headingId"
            class="mt-2 font-display text-4xl leading-none text-serag-green sm:text-5xl"
          >
            {{ content.title }}
          </h2>
        </div>
        <NuxtLink
          :to="localePath('/shop')"
          class="inline-flex min-h-11 items-center gap-2.5 border-b-2 border-serag-gold pb-1 font-bold text-serag-green transition-colors hover:text-serag-gold-ink focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        >
          {{ t('store.home.allCategories') }}
          <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <NuxtLink
          v-for="category in categories"
          :key="category.slug"
          :to="localePath(`/c/${category.slug}`)"
          class="flex min-w-0 flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-card px-5 py-8 text-center transition-colors hover:border-serag-gold/60 focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        >
          <span
            class="flex size-20 items-center justify-center rounded-full bg-serag-green/10 text-serag-green"
            aria-hidden="true"
          >
            <LayoutGrid class="size-9" />
          </span>
          <span class="font-bold text-foreground">{{ category.name }}</span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
