<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { HomeContent } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['bridalTeaser']
}>()

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
  <section
    class="relative overflow-hidden bg-serag-deep text-serag-ivory"
    :aria-labelledby="headingId"
  >
    <div
      class="pointer-events-none absolute -top-40 -end-40 size-[34rem] rounded-full bg-serag-gold/20 blur-3xl"
      aria-hidden="true"
    />
    <div class="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div class="max-w-2xl">
          <p class="text-xs font-bold tracking-[0.25em] text-serag-gold-hi uppercase">
            {{ content.eyebrow }}
          </p>
          <h2
            :id="headingId"
            class="mt-3 font-display text-5xl leading-none sm:text-6xl"
          >
            {{ content.title }}
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-serag-ivory/80">
            {{ content.subtitle }}
          </p>
        </div>
        <NuxtLink
          :to="cta.to"
          :target="cta.external ? '_blank' : undefined"
          :rel="cta.external ? 'noopener noreferrer' : undefined"
          class="inline-flex min-h-11 items-center gap-3 rounded-full bg-serag-gold px-7 py-3 text-base font-bold text-serag-ink transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
        >
          {{ cta.label }}
          <ArrowRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
