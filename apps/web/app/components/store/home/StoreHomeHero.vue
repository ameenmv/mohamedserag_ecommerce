<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { HomeContent } from '@serag/shared'
import { FEATURES } from '~/constants/features'

const props = defineProps<{
  content: HomeContent['hero']
}>()

const { t, tm, rt } = useI18n()
const localePath = useLocalePath()

// A list in the locale files: a «|» in a message is vue-i18n's plural separator, so t() returned one word
const marqueeWords = computed(() => (tm('store.home.marquee') as unknown[]).map((word) => rt(word as Parameters<typeof rt>[0])))

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
  let cta = props.content.secondaryCta
  if (!cta) return null
  // Older published content still points at the switched-off bridal builder
  if (!FEATURES.bridal && cta.href.startsWith('/bridal')) {
    cta = { label: t('store.home.heroTradersCta'), href: '/traders' }
  }
  return {
    to: resolveLink(cta.href),
    external: isExternalHref(cta.href),
    label: cta.label,
  }
})

// Fixed id: one hero per page, and useId() came out different on server and client here
const headingId = 'home-hero-title'

// «ثقة لها» / «تاريخ»: the last word goes on its own line in gold, as in the prototype
const title = computed(() => splitHighlight(props.content.title))
</script>

<template>
  <section
    class="relative overflow-hidden bg-serag-deep text-serag-ivory"
    :aria-labelledby="headingId"
  >
    <!-- Decorative brand glows and the outlined «1972» -->
    <div
      class="pointer-events-none absolute -top-44 -end-40 size-[45rem] rounded-full bg-[radial-gradient(circle,rgba(181,164,92,.28)_0%,rgba(181,164,92,0)_65%)]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -bottom-64 -start-32 size-[40rem] rounded-full bg-[radial-gradient(circle,rgba(90,143,107,.35)_0%,rgba(90,143,107,0)_65%)]"
      aria-hidden="true"
    />
    <div
      class="num text-outline pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 text-[clamp(200px,34vw,520px)] leading-[0.8] font-extrabold tracking-[-8px] whitespace-nowrap [--outline-color:rgba(181,164,92,.16)]"
      aria-hidden="true"
    >
      1972
    </div>

    <div class="relative mx-auto flex max-w-7xl flex-wrap items-center gap-14 px-4 pt-10 pb-14 sm:px-6 lg:px-10 lg:pt-10 lg:pb-20">
      <div class="flex min-w-0 flex-[1_1_600px] flex-col gap-7 lg:gap-5">
        <span
          class="inline-flex items-center gap-2.5 self-start rounded-full border border-serag-gold/50 bg-serag-gold/10 px-[18px] py-2 text-[15px] font-medium text-[#E8DFB0]"
        >
          <span class="animate-pulse-soft size-2 rounded-full bg-serag-gold-hi" aria-hidden="true" />
          {{ content.eyebrow }}
        </span>

        <h1
          :id="headingId"
          class="font-display text-[clamp(52px,min(7vw,11.5svh),112px)] leading-[0.95] [&:lang(en)]:text-[clamp(48px,min(6vw,9.5svh),92px)] tracking-[-1px] text-serag-ivory"
        >
          {{ title.lead }}<template v-if="title.highlight"><br><span class="text-serag-gold-hi">{{ title.highlight }}</span></template>
        </h1>

        <p class="max-w-[560px] text-lg leading-[1.8] text-[#D9E2D6] sm:text-[clamp(18px,2vw,22px)]">
          {{ content.subtitle }}
        </p>

        <div class="flex flex-wrap gap-3.5">
          <NuxtLink
            :to="primary.to"
            :target="primary.external ? '_blank' : undefined"
            :rel="primary.external ? 'noopener noreferrer' : undefined"
            class="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full bg-serag-gold px-8 py-4 text-base font-bold text-serag-ink transition hover:-translate-y-0.5 hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none sm:w-auto sm:text-lg motion-reduce:transition-none"
          >
            {{ primary.label }}
            <ArrowRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink
            v-if="secondary"
            :to="secondary.to"
            :target="secondary.external ? '_blank' : undefined"
            :rel="secondary.external ? 'noopener noreferrer' : undefined"
            class="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full border-[1.5px] border-serag-ivory/55 px-8 py-4 text-base font-bold text-serag-ivory transition-colors hover:bg-serag-ivory hover:text-serag-deep focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none sm:w-auto sm:text-lg"
          >
            {{ secondary.label }}
          </NuxtLink>
        </div>

        <dl class="mt-3 flex flex-wrap gap-5 border-t border-serag-ivory/15 pt-7 sm:gap-9 lg:mt-1 lg:pt-5">
          <div v-for="stat in content.stats" :key="stat.label" class="flex flex-col-reverse gap-1.5">
            <dt class="text-sm text-[#B9C7B6]">{{ stat.label }}</dt>
            <dd class="num text-[28px] leading-none font-extrabold text-serag-gold-hi sm:text-[40px]">
              {{ stat.value }}
            </dd>
          </div>
        </dl>
      </div>

      <LazyStoreHomeHeroArt hydrate-never :image="content.image" class="flex-[1_1_440px]" />
    </div>
  </section>

  <!-- Gold marquee strip under the hero -->
  <div class="overflow-hidden border-y border-[#8B7D3C] bg-serag-gold text-serag-ink" dir="ltr" aria-hidden="true">
    <div class="animate-marquee flex w-max py-3.5 font-display text-[22px] sm:text-[26px]">
      <div v-for="copy in 2" :key="copy" class="flex shrink-0 gap-11 px-[22px] whitespace-nowrap">
        <template v-for="n in 2" :key="n">
          <template v-for="word in marqueeWords" :key="`${n}-${word}`">
            <span>{{ word }}</span><span>✦</span>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
