<script setup lang="ts">
import { ArrowRight, BookOpen } from '@lucide/vue'
import type { GuideCard } from '@serag/shared'

const props = defineProps<{
  guide: GuideCard
  headingLevel?: 2 | 3
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const guideUrl = computed(() => localePath(`/guides/${props.guide.slug}`))
const headingTag = computed(() => `h${props.headingLevel ?? 3}`)
</script>

<template>
  <NuxtLink
    :to="guideUrl"
    class="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card transition-colors hover:border-serag-gold/60 focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
  >
    <div class="flex h-44 items-center justify-center overflow-hidden bg-serag-green text-serag-gold-hi">
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
      <component
        :is="headingTag"
        class="text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-serag-green"
      >
        {{ guide.title }}
      </component>
      <p v-if="guide.summary" class="line-clamp-2 text-sm text-muted-foreground">
        {{ guide.summary }}
      </p>
      <span class="mt-auto inline-flex items-center gap-2 text-sm font-bold text-serag-green">
        {{ t('store.guides.readGuide') }}
        <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </span>
    </div>
  </NuxtLink>
</template>
