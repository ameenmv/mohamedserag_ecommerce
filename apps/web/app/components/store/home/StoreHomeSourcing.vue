<script setup lang="ts">
import { BadgeCheck, Factory, Globe } from '@lucide/vue'
import type { BrandSummary } from '@serag/shared'
import type { Component } from 'vue'

const props = defineProps<{
  brands: BrandSummary[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const headingId = useId()

const pillars: { key: string; icon: Component }[] = [
  { key: 'factories', icon: Factory },
  { key: 'agents', icon: BadgeCheck },
  { key: 'inspection', icon: Globe },
]
const steps = ['supplier', 'quality', 'storage', 'delivery'] as const

/** Appliance brands with an authorized-agent warranty (logo brands first, at most six). */
const warrantyBrands = computed(() => props.brands.slice(0, 6))
</script>

<template>
  <section class="relative overflow-hidden bg-serag-night text-serag-ivory" :aria-labelledby="headingId">
    <div
      class="pointer-events-none absolute -bottom-60 -end-40 size-[42rem] rounded-full bg-[radial-gradient(circle,rgba(90,143,107,.3)_0%,rgba(90,143,107,0)_65%)]"
      aria-hidden="true"
    />
    <div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-[104px]">
      <div class="mb-14 max-w-[760px]">
        <p class="eyebrow text-serag-gold-hi">{{ t('store.home.sourcingEyebrow') }}</p>
        <h2 :id="headingId" class="mt-2.5 mb-4 font-display text-[clamp(44px,6vw,84px)] leading-none">
          {{ t('store.home.sourcing.title') }}
          <span class="text-serag-gold-hi">{{ t('store.home.sourcing.titleHighlight') }}</span>
        </h2>
        <p class="text-lg leading-[1.9] text-[#C9D5C6] sm:text-[19px]">{{ t('store.home.sourcing.subtitle') }}</p>
      </div>

      <div class="grid gap-[22px] md:grid-cols-3">
        <article
          v-for="pillar in pillars"
          :key="pillar.key"
          class="flex flex-col gap-4 rounded-[var(--radius-card)] border border-serag-ivory/15 bg-serag-ivory/5 p-8"
        >
          <span class="flex size-16 items-center justify-center rounded-[20px] bg-serag-gold/15 text-serag-gold-hi" aria-hidden="true">
            <component :is="pillar.icon" class="size-[30px]" :stroke-width="1.6" />
          </span>
          <h3 class="text-[22px] font-bold">{{ t(`store.home.sourcing.pillars.${pillar.key}.title`) }}</h3>
          <p class="text-base leading-[1.8] text-[#C9D5C6]">{{ t(`store.home.sourcing.pillars.${pillar.key}.body`) }}</p>
        </article>
      </div>

      <ol class="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        <li v-for="(step, index) in steps" :key="step" class="lg:pe-5">
          <div class="flex items-center gap-3.5">
            <span
              :class="[
                'num flex size-[52px] flex-none items-center justify-center rounded-full text-xl font-extrabold text-serag-ink',
                index === steps.length - 1 ? 'bg-serag-ivory' : 'bg-serag-gold',
              ]"
              aria-hidden="true"
            >
              {{ index + 1 }}
            </span>
            <span
              v-if="index < steps.length - 1"
              class="hidden h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,rgba(210,194,122,.7)_0_8px,transparent_8px_16px)] lg:block"
              aria-hidden="true"
            />
          </div>
          <h3 class="mt-4 text-[19px] font-bold">{{ t(`store.home.sourcing.steps.${step}.title`) }}</h3>
          <p class="mt-1.5 text-[15px] leading-[1.7] text-[#C9D5C6]">{{ t(`store.home.sourcing.steps.${step}.body`) }}</p>
        </li>
      </ol>

      <div v-if="warrantyBrands.length" class="mt-16 border-t border-serag-ivory/15 pt-10">
        <h3 class="mb-[22px] text-lg font-bold text-serag-gold-hi">{{ t('store.home.sourcing.warrantyTitle') }}</h3>
        <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <li v-for="brand in warrantyBrands" :key="brand.slug">
            <NuxtLink
              :to="localePath(`/b/${brand.slug}`)"
              class="flex h-[92px] flex-col items-center justify-center rounded-[20px] border-[1.5px] border-serag-gold-hi/35 bg-serag-ivory/5 transition-colors hover:border-serag-gold-hi hover:bg-serag-ivory/10 focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
            >
              <span class="num text-[22px] font-extrabold tracking-[1px] uppercase">{{ brand.slug }}</span>
              <span class="text-xs font-semibold text-serag-gold-hi">{{ brand.name }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
