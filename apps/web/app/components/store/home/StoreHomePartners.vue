<script setup lang="ts">
import { BadgeCheck } from '@lucide/vue'
import type { BrandSummary, HomeContent } from '@serag/shared'

defineProps<{
  content: HomeContent['partners']
  brands: BrandSummary[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const headingId = useId()
</script>

<template>
  <section class="bg-serag-ivory" :aria-labelledby="headingId">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div class="mb-12 flex flex-wrap items-center justify-between gap-8">
        <div class="max-w-2xl">
          <p class="text-xs font-bold tracking-[0.25em] text-serag-gold-ink uppercase">
            {{ t('store.home.partnersEyebrow') }}
          </p>
          <h2
            :id="headingId"
            class="mt-3 font-display text-4xl leading-none text-serag-green sm:text-5xl"
          >
            {{ content.title }}
          </h2>
        </div>
        <div
          class="hidden size-40 flex-none items-center justify-center rounded-full bg-serag-green text-serag-gold-hi sm:flex"
          aria-hidden="true"
        >
          <div class="flex flex-col items-center gap-1">
            <BadgeCheck class="size-9" />
            <span class="font-display text-xl">{{ t('store.home.authorizedDealer') }}</span>
          </div>
        </div>
      </div>

      <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <li v-for="brand in brands" :key="brand.slug">
          <NuxtLink
            :to="localePath(`/b/${brand.slug}`)"
            class="flex min-w-0 items-center justify-center rounded-[var(--radius-card)] border border-border bg-card px-4 py-7 transition-colors hover:border-serag-gold/60 focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
          >
            <NuxtImg
              v-if="brand.logoUrl"
              :src="brand.logoUrl"
              :alt="brand.name"
              width="160"
              height="80"
              loading="lazy"
              class="h-16 w-full object-contain"
            />
          </NuxtLink>
        </li>
      </ul>
    </div>
  </section>
</template>
