<script setup lang="ts">
import { ArrowRight, House } from '@lucide/vue'
import type { GuideCard } from '@serag/shared'

const props = defineProps<{
  guide: GuideCard
  headingLevel?: 2 | 3
  /** Position in a row: cycles the cover color green → gold → dark, as in the prototype. */
  tone?: number
  /** Home page card: cover, tag and title only. */
  compact?: boolean
}>()

const TONES = [
  { cover: 'bg-serag-green text-serag-gold-hi', tag: 'bg-[#E9F0E8] text-serag-green' },
  { cover: 'bg-serag-gold text-serag-ink', tag: 'bg-[#F4EFD6] text-serag-gold-ink' },
  { cover: 'bg-serag-deep text-serag-gold-hi', tag: 'bg-[#E9F0E8] text-serag-green' },
] as const
const tone = computed(() => TONES[(props.tone ?? 0) % TONES.length] ?? TONES[0])
const categorySlug = computed(() => props.guide.categories[0]?.slug ?? null)

const { t } = useI18n()
const localePath = useLocalePath()

const guideUrl = computed(() => localePath(`/guides/${props.guide.slug}`))
const headingTag = computed(() => `h${props.headingLevel ?? 3}`)
</script>

<template>
  <NuxtLink
    :to="guideUrl"
    class="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card transition duration-200 hover:-translate-y-1.5 hover:shadow-[0_28px_48px_-22px_rgba(20,32,26,.4)] focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
  >
    <div :class="['flex h-[190px] items-center justify-center overflow-hidden', tone.cover]">
      <NuxtImg
        v-if="guide.cover"
        :src="guide.cover"
        :alt="guide.title"
        width="400"
        height="225"
        loading="lazy"
        class="size-full object-cover"
      />
      <StoreCategoryIcon v-else-if="categorySlug" :slug="categorySlug" class="size-[90px]" stroke-width="1.6" />
      <House v-else class="size-[90px]" :stroke-width="1.1" aria-hidden="true" />
    </div>
    <div class="flex flex-1 flex-col gap-3 p-[26px]">
      <span
        v-if="guide.categories[0]"
        :class="['self-start rounded-full px-3.5 py-1 text-[13px] font-bold', tone.tag]"
      >
        {{ guide.categories[0]?.name }}
      </span>
      <component
        :is="headingTag"
        class="text-[22px] leading-normal font-bold text-foreground transition-colors group-hover:text-serag-green"
      >
        {{ guide.title }}
      </component>
      <p v-if="guide.summary && !compact" class="line-clamp-2 text-sm text-muted-foreground">
        {{ guide.summary }}
      </p>
      <span v-if="!compact" class="mt-auto inline-flex items-center gap-2 text-sm font-bold text-serag-green">
        {{ t('store.guides.readGuide') }}
        <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </span>
    </div>
  </NuxtLink>
</template>
