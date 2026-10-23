<script setup lang="ts">
import { ArrowLeft, ArrowRight, Play } from '@lucide/vue'
import { TRADER_REELS } from '~/constants/trader-reels'

const { t, localeProperties } = useI18n()
const localePath = useLocalePath()
const headingId = useId()
const track = ref<HTMLElement | null>(null)

/** Scrolls one card (260px + 20px gap) towards the reading direction's next/previous card. */
function scrollCards(direction: 1 | -1): void {
  const el = track.value
  if (!el) return
  const rtl = localeProperties.value.dir !== 'ltr'
  el.scrollBy({ left: direction * (rtl ? -280 : 280), behavior: 'smooth' })
}

const avatars = ['س', 'م', 'ك', 'ع']
</script>

<template>
  <section
    id="traders-reviews"
    class="relative scroll-mt-28 overflow-hidden bg-serag-deep text-serag-ivory"
    :aria-labelledby="headingId"
  >
    <div
      class="pointer-events-none absolute -top-48 -start-40 size-[44rem] rounded-full bg-[radial-gradient(circle,rgba(181,164,92,.22)_0%,rgba(181,164,92,0)_65%)]"
      aria-hidden="true"
    />
    <div
      class="text-outline pointer-events-none absolute -bottom-10 -end-5 font-display text-[clamp(160px,22vw,340px)] leading-[0.8] whitespace-nowrap [--outline-color:rgba(181,164,92,.12)]"
      aria-hidden="true"
    >
      {{ t('store.home.reels.watermark') }}
    </div>

    <div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-[104px]">
      <div class="mb-11 flex flex-wrap items-end justify-between gap-7">
        <div class="max-w-[720px]">
          <span class="inline-flex items-center gap-2.5 rounded-full border border-serag-gold/50 bg-serag-gold/10 px-[18px] py-2 text-sm font-semibold text-[#E8DFB0]">
            <span class="animate-pulse-soft size-2 rounded-full bg-serag-hot" aria-hidden="true" />
            {{ t('store.home.reels.badge') }}
          </span>
          <h2 :id="headingId" class="my-4 font-display text-[clamp(40px,5.5vw,76px)] leading-none">
            {{ t('store.home.reels.title') }}
            <span class="text-serag-gold-hi">{{ t('store.home.reels.titleHighlight') }}</span>
          </h2>
          <p class="text-lg leading-[1.9] text-[#C9D5C6] sm:text-[19px]">{{ t('store.home.reels.subtitle') }}</p>
        </div>
        <div class="flex gap-3">
          <button
            type="button"
            :aria-label="t('store.home.reels.previous')"
            class="flex size-[54px] items-center justify-center rounded-full border-[1.5px] border-serag-gold/50 text-serag-gold-hi transition-colors hover:bg-serag-gold-hi hover:text-serag-ink focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
            @click="scrollCards(-1)"
          >
            <ArrowLeft class="size-[22px] rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <button
            type="button"
            :aria-label="t('store.home.reels.next')"
            class="flex size-[54px] items-center justify-center rounded-full border-[1.5px] border-serag-gold/50 text-serag-gold-hi transition-colors hover:bg-serag-gold-hi hover:text-serag-ink focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
            @click="scrollCards(1)"
          >
            <ArrowRight class="size-[22px] rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul ref="track" tabindex="0" :aria-label="t('store.home.reels.title') + ' ' + t('store.home.reels.titleHighlight')" class="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pt-2.5 pb-7 scrollbar-none focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none">
        <li v-for="reel in TRADER_REELS" :key="reel.name" class="flex-none snap-start">
          <component
            :is="reel.url ? 'a' : 'div'"
            :href="reel.url ?? undefined"
            :target="reel.url ? '_blank' : undefined"
            :rel="reel.url ? 'noopener noreferrer' : undefined"
            :aria-label="reel.url ? t('store.home.reels.play', { name: reel.name }) : undefined"
            class="group relative block aspect-[9/16] w-[200px] overflow-hidden rounded-[var(--radius-card)] border border-serag-gold-hi/25 bg-[#1B3526] text-start transition duration-300 hover:-translate-y-2.5 hover:scale-[1.02] hover:border-serag-gold-hi hover:shadow-[0_40px_60px_-28px_rgba(0,0,0,.8)] focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none sm:w-[260px] motion-reduce:transition-none motion-reduce:hover:transform-none"
          >
            <div
              class="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
              :style="{ background: `radial-gradient(circle at 30% 20%, rgba(210,194,122,.35), transparent 55%), linear-gradient(160deg, ${reel.tint}, #14201A)` }"
              aria-hidden="true"
            />
            <div class="absolute inset-x-0 top-[18%] text-center font-display text-[120px] leading-none text-serag-gold-hi/12" aria-hidden="true">”</div>
            <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.25)_0%,rgba(0,0,0,0)_30%,rgba(8,16,11,.92)_100%)]" aria-hidden="true" />
            <span class="absolute end-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-bold backdrop-blur-sm" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="size-3 fill-serag-gold-hi"><path d="M14 9V7c0-1 .5-1.5 1.5-1.5H17V2h-3c-3 0-4 2-4 4.5V9H7.5v3.5H10V22h4v-9.5h2.6L17 9z" /></svg>
              Reel
            </span>
            <span
              class="absolute top-1/2 left-1/2 flex size-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-serag-ivory/60 bg-serag-ivory/15 backdrop-blur-md transition duration-300 group-hover:scale-110 group-hover:border-serag-gold-hi group-hover:bg-serag-gold-hi group-hover:text-serag-ink"
              aria-hidden="true"
            >
              <span class="animate-ping-soft absolute -inset-2.5 rounded-full border-[1.5px] border-serag-gold-hi/50" />
              <Play class="size-6 fill-current" />
            </span>
            <div class="absolute inset-x-0 bottom-0 p-5">
              <div class="text-sm tracking-[2px] text-serag-gold-hi" aria-hidden="true">★★★★★</div>
              <div class="mt-1.5 text-lg font-bold">{{ reel.name }}</div>
              <div class="mt-0.5 text-[13px] text-[#B9C7B6]">{{ reel.shop }}</div>
            </div>
          </component>
        </li>
      </ul>

      <div class="mt-7 flex flex-wrap items-center justify-between gap-6 border-t border-serag-ivory/15 pt-8">
        <div class="flex items-center gap-[18px]">
          <div class="flex ps-3" dir="ltr" aria-hidden="true">
            <span
              v-for="(letter, i) in avatars"
              :key="letter"
              :class="[
                '-ms-3 flex size-[46px] items-center justify-center rounded-full border-[3px] border-serag-deep font-bold text-serag-ink',
                ['bg-serag-gold-hi', 'bg-serag-gold', 'bg-[#E8DFB0]', 'bg-[#8B7D3C]'][i],
              ]"
            >{{ letter }}</span>
          </div>
          <div>
            <div class="num text-[28px] leading-none font-extrabold text-serag-gold-hi">{{ t('store.home.reels.tradersCount') }}</div>
            <div class="mt-1 text-sm text-[#B9C7B6]">{{ t('store.home.reels.tradersNote') }}</div>
          </div>
        </div>
        <NuxtLink
          :to="localePath('/traders')"
          class="inline-flex min-h-11 items-center gap-3 rounded-full bg-serag-gold px-[30px] py-4 text-[17px] font-bold text-serag-ink transition hover:-translate-y-0.5 hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none motion-reduce:transition-none"
        >
          {{ t('store.home.reels.join') }}
          <ArrowRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
