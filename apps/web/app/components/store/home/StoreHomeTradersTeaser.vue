<script setup lang="ts">
import { ArrowRight, Check } from '@lucide/vue'
import type { HomeContent } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['tradersTeaser']
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const cta = computed(() => {
  const href = props.content.cta.href
  return {
    to: isInternalHref(href) ? localePath(href) : href,
    external: isExternalHref(href),
    label: props.content.cta.label,
  }
})

const headingId = useId()
</script>

<template>
  <section class="bg-serag-ivory" :aria-labelledby="headingId">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-16 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div class="flex min-w-0 flex-1 basis-96 flex-col gap-6">
        <span
          class="inline-flex self-start rounded-full bg-serag-green px-4 py-1.5 text-sm font-bold text-serag-gold-hi"
        >
          {{ content.badge }}
        </span>
        <h2
          :id="headingId"
          class="font-display text-4xl leading-none text-serag-green sm:text-5xl"
        >
          {{ content.title }}
        </h2>
        <p class="max-w-xl text-lg leading-relaxed text-serag-ink/80">
          {{ content.subtitle }}
        </p>
        <ul class="flex flex-col gap-4">
          <li
            v-for="point in content.points"
            :key="point"
            class="flex items-center gap-3.5 text-base text-foreground"
          >
            <span
              class="flex size-8 flex-none items-center justify-center rounded-full bg-serag-green text-serag-gold-hi"
              aria-hidden="true"
            >
              <Check class="size-4" />
            </span>
            {{ point }}
          </li>
        </ul>
        <NuxtLink
          :to="cta.to"
          :target="cta.external ? '_blank' : undefined"
          :rel="cta.external ? 'noopener noreferrer' : undefined"
          class="inline-flex min-h-11 items-center gap-3 self-start rounded-full bg-serag-green px-7 py-3 text-base font-bold text-serag-ivory transition-colors hover:bg-serag-deep focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        >
          {{ cta.label }}
          <ArrowRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>

      <div
        class="min-w-0 flex-1 basis-96 rounded-[var(--radius-card)] bg-serag-green p-6 sm:p-8"
        aria-hidden="true"
      >
        <div class="flex flex-col gap-6 rounded-2xl bg-card p-6 sm:p-7">
          <div class="flex items-center justify-between">
            <p class="font-bold text-foreground">{{ t('store.home.tradersTiers') }}</p>
            <span class="rounded-full bg-serag-cream px-3 py-1 text-xs font-bold text-serag-gold-ink">
              {{ t('store.home.tradersAccount') }}
            </span>
          </div>
          <div class="flex flex-col gap-5">
            <div class="h-3.5 w-full overflow-hidden rounded-full bg-serag-cream">
              <div class="h-full w-1/3 rounded-full bg-serag-green/40" />
            </div>
            <div class="h-3.5 w-full overflow-hidden rounded-full bg-serag-cream">
              <div class="h-full w-2/3 rounded-full bg-serag-green/70" />
            </div>
            <div class="h-3.5 w-full overflow-hidden rounded-full bg-serag-cream">
              <div class="h-full w-full rounded-full bg-serag-gold" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
