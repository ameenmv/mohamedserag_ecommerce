<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { HomeContent } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['hero']
}>()

const localePath = useLocalePath()

function resolveLink(href: string): string {
  return isInternalHref(href) ? localePath(href) : href
}

const primary = computed(() => {
  const href = props.content.cta.href
  return {
    to: resolveLink(href),
    external: isExternalHref(href),
    label: props.content.cta.label,
  }
})

const secondary = computed(() => {
  const cta = props.content.secondaryCta
  if (!cta) return null
  return {
    to: resolveLink(cta.href),
    external: isExternalHref(cta.href),
    label: cta.label,
  }
})

const headingId = useId()
</script>

<template>
  <section
    class="relative overflow-hidden bg-serag-deep text-serag-ivory"
    :aria-labelledby="headingId"
  >
    <!-- Decorative brand glows -->
    <div
      class="pointer-events-none absolute -top-40 -start-40 size-[36rem] rounded-full bg-serag-gold/20 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -bottom-52 -end-32 size-[32rem] rounded-full bg-serag-green/40 blur-3xl"
      aria-hidden="true"
    />

    <div class="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:gap-14 lg:px-8 lg:py-24">
      <div class="flex w-full min-w-0 flex-col gap-7 lg:flex-1">
        <span
          class="inline-flex items-center gap-2.5 self-start rounded-full border border-serag-gold/50 bg-serag-gold/10 px-4 py-2 text-sm font-medium text-serag-gold-hi"
        >
          <span class="size-2 rounded-full bg-serag-gold-hi" aria-hidden="true" />
          {{ content.eyebrow }}
        </span>

        <h1
          :id="headingId"
          class="font-display text-5xl leading-[0.95] text-serag-ivory sm:text-6xl lg:text-7xl"
        >
          {{ content.title }}
        </h1>

        <p class="max-w-xl text-lg leading-relaxed text-serag-ivory/80">
          {{ content.subtitle }}
        </p>

        <div class="flex flex-wrap gap-3.5">
          <NuxtLink
            :to="primary.to"
            :target="primary.external ? '_blank' : undefined"
            :rel="primary.external ? 'noopener noreferrer' : undefined"
            class="inline-flex min-h-11 items-center gap-3 rounded-full bg-serag-gold px-7 py-3 text-base font-bold text-serag-ink transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
          >
            {{ primary.label }}
            <ArrowRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink
            v-if="secondary"
            :to="secondary.to"
            :target="secondary.external ? '_blank' : undefined"
            :rel="secondary.external ? 'noopener noreferrer' : undefined"
            class="inline-flex min-h-11 items-center gap-3 rounded-full border border-serag-ivory/55 px-7 py-3 text-base font-bold text-serag-ivory transition-colors hover:bg-serag-ivory/10 focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
          >
            {{ secondary.label }}
          </NuxtLink>
        </div>

        <dl
          class="mt-2 flex flex-wrap gap-9 border-t border-serag-ivory/15 pt-7"
        >
          <div v-for="stat in content.stats" :key="stat.label" class="flex flex-col-reverse gap-1.5">
            <dt class="text-sm text-serag-ivory/70">{{ stat.label }}</dt>
            <dd class="num text-4xl font-extrabold leading-none text-serag-gold-hi">
              {{ stat.value }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="relative w-full max-w-lg lg:flex-1">
        <div
          class="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] border border-serag-gold/40"
        >
          <NuxtImg
            v-if="content.image"
            :src="content.image"
            :alt="content.title"
            width="640"
            height="800"
            fetchpriority="high"
            loading="eager"
            class="size-full object-cover"
          />
          <div
            v-else
            class="flex size-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-serag-green to-serag-deep text-serag-gold-hi"
            aria-hidden="true"
          >
            <span class="font-display text-7xl">1972</span>
            <span class="text-sm font-medium text-serag-ivory/70">
              {{ content.title }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
