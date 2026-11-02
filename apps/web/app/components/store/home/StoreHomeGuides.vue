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
    <div class="mx-auto max-w-7xl px-4 pt-16 pb-14 sm:px-6 lg:px-10 lg:pt-24 lg:pb-[88px]">
      <div class="mb-11 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow text-serag-gold-ink">
            {{ t('store.home.guidesEyebrow') }}
          </p>
          <h2
            :id="headingId"
            class="mt-2 font-display text-[clamp(40px,5vw,64px)] leading-none text-serag-green"
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
          v-for="(guide, index) in guides"
          :key="guide.slug"
          :guide="guide"
          :tone="index"
          compact
        />
      </div>
    </div>
  </section>
</template>
