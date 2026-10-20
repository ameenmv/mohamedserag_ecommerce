<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { GuideCard, HomeContent } from '@serag/shared'

defineProps<{
  content: HomeContent['guides']
  guides: GuideCard[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const headingId = useId()
</script>

<template>
  <section class="bg-serag-ivory" :aria-labelledby="headingId">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div class="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold tracking-[0.25em] text-serag-gold-ink uppercase">
            {{ t('store.home.guidesEyebrow') }}
          </p>
          <h2
            :id="headingId"
            class="mt-2 font-display text-4xl leading-none text-serag-green sm:text-5xl"
          >
            {{ content.title }}
          </h2>
        </div>
        <NuxtLink
          :to="localePath('/guides')"
          class="inline-flex min-h-11 items-center gap-2.5 border-b-2 border-serag-gold pb-1 font-bold text-serag-green transition-colors hover:text-serag-gold-ink focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        >
          {{ t('store.home.allGuides') }}
          <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>

      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StoreGuidesCard
          v-for="guide in guides"
          :key="guide.slug"
          :guide="guide"
        />
      </div>
    </div>
  </section>
</template>
