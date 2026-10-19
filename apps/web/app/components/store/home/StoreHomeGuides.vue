<script setup lang="ts">
import { ArrowRight, BookOpen } from '@lucide/vue'
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
        <NuxtLink
          v-for="guide in guides"
          :key="guide.slug"
          :to="localePath(`/guides/${guide.slug}`)"
          class="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card transition-colors hover:border-serag-gold/60 focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        >
          <div
            class="flex h-44 items-center justify-center overflow-hidden bg-serag-green text-serag-gold-hi"
          >
            <NuxtImg
              v-if="guide.cover"
              :src="guide.cover"
              :alt="guide.title"
              width="400"
              height="225"
              loading="lazy"
              class="size-full object-cover"
            />
            <BookOpen v-else class="size-16" aria-hidden="true" />
          </div>
          <div class="flex flex-1 flex-col gap-3 p-6">
            <span
              v-if="guide.categories[0]"
              class="self-start rounded-full bg-serag-green/10 px-3.5 py-1 text-xs font-bold text-serag-green"
            >
              {{ guide.categories[0]?.name }}
            </span>
            <h3 class="text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-serag-green">
              {{ guide.title }}
            </h3>
            <p v-if="guide.summary" class="line-clamp-2 text-sm text-muted-foreground">
              {{ guide.summary }}
            </p>
            <span class="mt-auto inline-flex items-center gap-2 text-sm font-bold text-serag-green">
              {{ t('store.home.readGuide') }}
              <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
