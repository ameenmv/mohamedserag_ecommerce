<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { HomeContent } from '@serag/shared'
import { loadGsap } from '~/composables/useGsap'

const props = defineProps<{
  content: HomeContent['hero']
}>()

const { tm, rt } = useI18n()
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

// Fixed id: one hero per page, and useId() came out different on server and client here
const headingId = 'home-hero-title'

// «ثقة لها» / «تاريخ»: the last word goes on its own line in gold, as in the prototype
const title = computed(() => splitHighlight(props.content.title))

const heroRef = ref<HTMLElement | null>(null)
const marqueeRef = ref<HTMLElement | null>(null)

// The hero's motion and GSAP download on the visitor's first interaction (utils/hero-motion.ts)
let stopMotion: (() => void) | undefined
let unmounted = false
onMounted(async () => {
  const kit = await loadGsap()
  if (!kit || unmounted || !heroRef.value) return
  const { startHeroMotion } = await import('~/utils/hero-motion')
  if (unmounted) return
  stopMotion = startHeroMotion(kit, heroRef.value, marqueeRef.value)
})
onBeforeUnmount(() => {
  unmounted = true
  stopMotion?.()
})
</script>

<template>
  <section
    ref="heroRef"
    class="hero-bg relative z-10 overflow-hidden rounded-b-[clamp(36px,7vw,96px)] text-serag-ivory"
    :aria-labelledby="headingId"
  >
    <!-- Background, all decorative: drifting brand-colour light, faint shutter slats, film grain,
         a spotlight that follows the pointer, and the outlined «1972» that fills as you scroll.
         The costly layers (blend modes, masks, perspective) are wide-screen only: phones are
         where the page-speed budget is measured. -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div data-hero-blob class="hero-blob -top-48 -end-40 size-[46rem] bg-[radial-gradient(circle,rgba(201,177,137,.30)_0%,rgba(201,177,137,0)_62%)]" />
      <div data-hero-blob class="hero-blob -bottom-72 -start-40 size-[44rem] bg-[radial-gradient(circle,rgba(85,120,64,.50)_0%,rgba(85,120,64,0)_62%)]" />
      <div data-hero-blob class="hero-blob top-1/3 start-1/3 size-[30rem] bg-[radial-gradient(circle,rgba(166,138,100,.16)_0%,rgba(166,138,100,0)_65%)]" />
      <div class="hero-slats absolute inset-0 hidden lg:block" />
      <!-- The showroom floor the appliances stand on, with a pool of light under them -->
      <div class="hero-floor absolute inset-x-0 bottom-0 hidden h-[42%] lg:block" />
      <div class="hero-pool absolute hidden lg:block bottom-[4%] end-[8%] h-40 w-[46rem] max-w-full rounded-[50%]" />
      <div class="hero-spot absolute inset-0 hidden lg:block" />
      <div data-hero-year class="num absolute -bottom-16 left-1/2 -translate-x-1/2 text-[clamp(200px,34vw,520px)] leading-[0.8] font-extrabold tracking-[-8px] whitespace-nowrap" dir="ltr">
        <span class="text-outline block [--outline-color:rgba(201,177,137,.18)]">1972</span>
        <span data-hero-year-fill class="hero-year-fill absolute inset-0 block text-[rgba(201,177,137,.10)]">1972</span>
      </div>
      <div class="hero-grain absolute inset-0 hidden lg:block" />
    </div>

    <div class="relative mx-auto flex max-w-7xl flex-wrap items-center gap-14 px-4 pt-10 pb-14 sm:px-6 lg:px-10 lg:pt-10 lg:pb-20">
      <div class="flex min-w-0 flex-[1_1_600px] flex-col gap-7 lg:gap-5">
        <span
          data-hero-intro
          class="[--d:0s] inline-flex items-center gap-2.5 self-start rounded-full border border-serag-gold/50 bg-serag-gold/10 px-[18px] py-2 text-[15px] font-medium text-[#E8DFB0]"
        >
          <span class="animate-pulse-soft size-2 rounded-full bg-serag-gold-hi" aria-hidden="true" />
          {{ content.eyebrow }}
        </span>

        <h1
          :id="headingId"
          data-hero-title
          class="font-display text-[clamp(52px,min(7vw,11.5svh),112px)] leading-[0.95] [&:lang(en)]:text-[clamp(48px,min(6vw,9.5svh),92px)] tracking-[-1px] text-serag-ivory"
        >
          <CommonMadText :text="title.lead" size="xl" /><template v-if="title.highlight"><br><span class="text-serag-gold-hi"><CommonMadText :text="title.highlight" size="xl" /></span></template>
        </h1>

        <p data-hero-intro class="[--d:.12s] max-w-[560px] text-lg leading-[1.8] text-[#D8D3C7] sm:text-[clamp(18px,2vw,22px)]">
          {{ content.subtitle }}
        </p>

        <div data-hero-intro class="[--d:.22s] flex flex-wrap gap-3.5">
          <NuxtLink
            data-magnetic
            :to="primary.to"
            :target="primary.external ? '_blank' : undefined"
            :rel="primary.external ? 'noopener noreferrer' : undefined"
            class="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full bg-serag-gold px-8 py-4 text-base font-bold text-serag-ink transition hover:-translate-y-0.5 hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none sm:w-auto sm:text-lg motion-reduce:transition-none"
          >
            {{ primary.label }}
            <ArrowRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </NuxtLink>
        </div>

        <dl data-hero-intro class="[--d:.32s] mt-3 flex flex-wrap gap-5 border-t border-serag-ivory/15 pt-7 sm:gap-9 lg:mt-1 lg:pt-5">
          <div v-for="stat in content.stats" :key="stat.label" class="flex flex-col-reverse gap-1.5">
            <dt class="text-sm text-[#C4BEB0]">{{ stat.label }}</dt>
            <dd data-hero-stat class="num text-[28px] leading-none font-extrabold text-serag-gold-hi sm:text-[40px]">
              {{ stat.value }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="hero-art-in flex-[1_1_440px]">
        <div data-hero-art>
          <LazyStoreHomeHeroArt hydrate-never :image="content.image" />
        </div>
      </div>
    </div>
  </section>

  <!-- Gold marquee strip under the hero -->
  <div ref="marqueeRef" class="relative z-0 -mt-[clamp(36px,7vw,96px)] overflow-hidden border-b border-[#7C6A4B] bg-serag-gold pt-[clamp(36px,7vw,96px)] text-serag-ink" dir="ltr" aria-hidden="true">
    <div data-marquee-track class="animate-marquee flex w-max py-3.5 font-display text-[22px] sm:text-[26px]">
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
