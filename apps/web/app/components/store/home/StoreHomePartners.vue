<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue'
import type { BrandSummary, HomeContent } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['partners']
  brands: BrandSummary[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

// «أكبر المصانع» + «بتثق فينا» in gold
const title = computed(() => splitHighlight(props.content.title, 2))

/** Two marquee rows (alternate brands), the second scrolling the other way. */
const rows = computed(() => {
  const first: BrandSummary[] = []
  const second: BrandSummary[] = []
  props.brands.forEach((brand, i) => (i % 2 === 0 ? first : second).push(brand))
  return [first, second].filter((row) => row.length > 0)
})

const stats = ['brands', 'years', 'warranty', 'models'] as const

const headingId = useId()
</script>

<template>
  <section class="relative overflow-hidden bg-serag-ivory" :aria-labelledby="headingId">
    <div class="relative mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-10 lg:pt-[104px]">
      <div class="mb-14 flex flex-wrap items-center justify-between gap-10">
        <div class="max-w-[720px] flex-[1_1_520px]">
          <p class="eyebrow text-serag-gold-ink">{{ t('store.home.trustedPartnersEyebrow') }}</p>
          <h2 :id="headingId" class="mt-2.5 mb-[18px] font-display text-[clamp(42px,5.5vw,76px)] leading-none text-serag-green">
            {{ title.lead }}{{ title.highlight ? ' ' : '' }}<span v-if="title.highlight" class="text-[#7C6A4B]">{{ title.highlight }}</span>
          </h2>
          <p class="text-lg leading-[1.9] text-[#66625B] sm:text-[19px]">{{ t('store.home.partners.subtitle') }}</p>
        </div>
        <div class="relative mx-auto size-[180px] flex-none" aria-hidden="true">
          <svg viewBox="0 0 180 180" class="size-full">
            <circle cx="90" cy="90" r="86" fill="#5E8A38" stroke="#A68A64" stroke-width="2" />
            <circle cx="90" cy="90" r="70" fill="none" stroke="rgba(210,194,122,.5)" stroke-width="1.5" stroke-dasharray="4 6" class="animate-spin-slow origin-center" />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center text-serag-gold-hi">
            <ShieldCheck class="size-9" :stroke-width="1.8" />
            <span class="mt-0.5 font-display text-xl">{{ t('store.home.authorizedDealer') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Logo marquee: pauses on hover; the duplicate half is hidden from assistive tech -->
    <div class="flex flex-col gap-5 pt-2.5 pb-5">
      <div
        v-for="(row, rowIndex) in rows"
        :key="rowIndex"
        class="group overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]"
        dir="ltr"
      >
        <div
          :class="[
            'flex w-max group-hover:[animation-play-state:paused]',
            rowIndex === 0 ? 'animate-marquee-fast' : 'animate-marquee-fast [animation-direction:reverse] [animation-duration:44s]',
          ]"
        >
          <ul v-for="copy in 2" :key="copy" class="flex" :aria-hidden="copy === 2 ? 'true' : undefined">
            <!-- Short rows repeat so each half is wider than the screen -->
            <template v-for="n in (row.length < 6 ? 3 : 2)" :key="n">
              <li v-for="brand in row" :key="`${n}-${brand.slug}`">
                <NuxtLink
                  :to="localePath(`/b/${brand.slug}`)"
                  :tabindex="copy === 2 || n > 1 ? -1 : undefined"
                  class="mx-2.5 flex h-[92px] w-[170px] flex-none flex-col items-center justify-center gap-1.5 rounded-3xl border-[1.5px] border-[#ECE6D3] bg-card px-[18px] py-2.5 opacity-90 grayscale-[.3] transition duration-300 hover:-translate-y-1.5 hover:border-serag-gold hover:opacity-100 hover:shadow-[0_24px_40px_-20px_rgba(20,32,26,.35)] hover:grayscale-0 focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none sm:h-[116px] sm:w-[220px] motion-reduce:transition-none"
                >
                  <NuxtImg
                    v-if="brand.logoUrl"
                    :src="brand.logoUrl"
                    :alt="brand.name"
                    width="145"
                    height="46"
                    loading="lazy"
                    class="h-[46px] w-auto max-w-[145px] object-contain"
                  />
                  <small class="text-[11.5px] font-bold tracking-[.5px] text-serag-gold-ink">{{ brand.name }}</small>
                </NuxtLink>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 lg:px-10 lg:pb-[104px]">
      <dl class="grid grid-cols-2 gap-7 rounded-[32px] border-[1.5px] border-[#ECE6D3] bg-card px-7 py-9 lg:grid-cols-4">
        <div v-for="stat in stats" :key="stat" class="flex flex-col-reverse text-center">
          <dt class="mt-2 text-[15px] text-muted-foreground">{{ t(`store.home.partners.stats.${stat}.label`) }}</dt>
          <dd class="num text-[36px] leading-none font-extrabold text-serag-green sm:text-[46px]">{{ t(`store.home.partners.stats.${stat}.value`) }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
