<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
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
    <div class="mx-auto max-w-7xl px-4 pt-16 pb-14 sm:px-6 lg:px-10 lg:pt-[88px] lg:pb-[72px]">
      <div class="mb-11 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="num text-[13px] font-bold tracking-[4px] text-serag-gold-ink uppercase">
            {{ t('store.home.categoriesEyebrow') }}
          </p>
          <h2
            :id="headingId"
            class="mt-2 font-display text-[clamp(36px,5vw,64px)] leading-none text-serag-green"
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

      <div class="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <NuxtLink
          v-for="(category, index) in categories"
          :key="category.slug"
          :to="localePath(`/c/${category.slug}`)"
          class="flex min-w-0 flex-col items-center gap-[18px] rounded-[var(--radius-card)] border-[1.5px] border-[#ECE6D3] bg-card px-3.5 py-5 text-center transition duration-200 hover:-translate-y-2 hover:border-serag-gold hover:shadow-[0_24px_40px_-18px_rgba(20,32,26,.35)] focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none sm:px-6 sm:py-[30px] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span
            :class="[
              'flex size-16 items-center justify-center rounded-full sm:size-24',
              index % 2 === 0 ? 'bg-[#E9F0E8] text-serag-green' : 'bg-[#F4EFD6] text-serag-gold-ink',
            ]"
            aria-hidden="true"
          >
            <StoreCategoryIcon :slug="category.slug" class="size-9 sm:size-[52px]" stroke-width="1.8" />
          </span>
          <span class="text-[15px] font-bold text-foreground sm:text-xl">{{ category.name }}</span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
