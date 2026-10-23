<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { HomeContent } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['aboutTeaser']
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const cta = computed(() => {
  const link = props.content.cta
  if (!link) return null
  return {
    to: isInternalHref(link.href) ? localePath(link.href) : link.href,
    external: isExternalHref(link.href),
    label: link.label,
  }
})

const values = ['trust', 'specialty', 'local'] as const
const milestones = [
  { year: '1972', key: 'start', accent: 'green' },
  { year: '1995', key: 'wholesale', accent: 'gold' },
  { year: '2012', key: 'agents', accent: 'gold' },
  { year: '2026', key: 'online', accent: 'dark' },
] as const

const headingId = useId()
</script>

<template>
  <section class="relative overflow-hidden bg-secondary" :aria-labelledby="headingId">
    <div
      class="num text-outline pointer-events-none absolute top-8 -end-8 text-[clamp(180px,26vw,380px)] leading-[0.8] font-extrabold tracking-[-6px] [--outline-color:rgba(42,77,56,.12)]"
      aria-hidden="true"
    >
      1972
    </div>

    <div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-[104px]">
      <div class="flex flex-wrap items-center gap-16">
        <!-- Showroom arch -->
        <div class="relative min-h-[400px] w-full flex-[1_1_440px] sm:min-h-[460px]" aria-hidden="true">
          <div
            class="absolute inset-y-0 start-0 end-[12%] flex flex-col items-center justify-center gap-3.5 rounded-[200px_200px_40px_40px] border-2 border-serag-gold bg-[radial-gradient(circle_at_50%_25%,rgba(210,194,122,.28),transparent_60%),linear-gradient(160deg,#16291E_0%,#2A4D38_100%)] p-8 text-center text-serag-ivory shadow-[0_36px_64px_-28px_rgba(20,32,26,.55)]"
          >
            <svg viewBox="0 0 64 64" class="size-[76px] text-serag-gold-hi" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 26L32 10l24 16v28H8z M4 26h56M24 54V36h16v18M16 34h4M44 34h4" />
            </svg>
            <div class="font-display text-[34px] leading-none text-serag-gold-hi">{{ t('store.home.about.showroom') }}</div>
            <div class="max-w-[260px] text-[15px] leading-[1.7] text-[#C9D5C6]">{{ t('store.home.about.showroomNote') }}</div>
          </div>
          <div class="absolute start-0 -bottom-5 rounded-[var(--radius-card)] border-[1.5px] border-serag-gold-hi/40 bg-serag-green px-7 py-[22px] text-serag-ivory shadow-[0_30px_50px_-22px_rgba(20,32,26,.55)]">
            <div class="num text-[54px] leading-none font-extrabold text-serag-gold-hi">+50</div>
            <div class="mt-1.5 text-[15px]">{{ t('store.home.about.yearsBadge') }}</div>
          </div>
        </div>

        <div class="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
          <p class="num text-[13px] font-bold tracking-[4px] text-serag-gold-ink">{{ content.eyebrow }}</p>
          <h2 :id="headingId" class="font-display text-[clamp(42px,5.5vw,76px)] leading-none text-serag-green">
            {{ content.title }}
          </h2>
          <p class="text-lg leading-[1.9] text-[#2F3B34] sm:text-xl">{{ content.subtitle }}</p>
          <p class="text-lg leading-[1.9] text-[#4B574F]">{{ t('store.home.about.today') }}</p>
          <ul class="mt-1.5 grid gap-3.5 sm:grid-cols-2">
            <li
              v-for="(value, index) in values"
              :key="value"
              :class="['rounded-[22px] border border-[#E4DDC6] bg-card p-5', index === values.length - 1 ? 'sm:col-span-2' : '']"
            >
              <div class="text-lg font-bold text-serag-green">{{ t(`store.home.about.values.${value}.title`) }}</div>
              <div class="mt-1.5 text-[15px] leading-[1.7] text-[#4B574F]">{{ t(`store.home.about.values.${value}.body`) }}</div>
            </li>
          </ul>
          <NuxtLink
            v-if="cta"
            :to="cta.to"
            :target="cta.external ? '_blank' : undefined"
            :rel="cta.external ? 'noopener noreferrer' : undefined"
            class="inline-flex min-h-11 items-center gap-2.5 self-start border-b-2 border-serag-gold pb-1 font-bold text-serag-green transition-colors hover:text-serag-gold-ink focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
          >
            {{ cta.label }}
            <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <!-- Milestones -->
      <ol class="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <li
          v-for="m in milestones"
          :key="m.year"
          :class="[
            'rounded-[26px] border-t-[6px] p-7',
            m.accent === 'dark' ? 'border-serag-gold-hi bg-serag-green text-serag-ivory' : 'bg-card',
            m.accent === 'green' ? 'border-serag-green' : '',
            m.accent === 'gold' ? 'border-serag-gold' : '',
          ]"
        >
          <div
            :class="[
              'num text-[44px] leading-none font-extrabold',
              m.accent === 'dark' ? 'text-serag-gold-hi' : m.accent === 'green' ? 'text-serag-green' : 'text-serag-gold-ink',
            ]"
          >
            {{ m.year }}
          </div>
          <div class="mt-3 text-lg font-bold">{{ t(`store.home.about.milestones.${m.key}.title`) }}</div>
          <div :class="['mt-1.5 text-[15px] leading-[1.7]', m.accent === 'dark' ? 'text-[#D9E2D6]' : 'text-[#4B574F]']">
            {{ t(`store.home.about.milestones.${m.key}.body`) }}
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
