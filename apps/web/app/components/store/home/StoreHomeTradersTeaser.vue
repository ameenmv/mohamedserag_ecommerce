<script setup lang="ts">
import { Check, FileText } from '@lucide/vue'
import type { HomeContent } from '@serag/shared'
import { waLink } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['tradersTeaser']
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const settings = useStoreSettings()

const cta = computed(() => {
  const href = props.content.cta.href
  return {
    to: isInternalHref(href) ? localePath(href) : href,
    external: isExternalHref(href),
    label: props.content.cta.label,
  }
})

// «أسعار الجملة» / «بتوصلك» + «من المصدر» in gold ink, as in the prototype
const title = computed(() => splitHighlight(props.content.title, 2))

const whatsappUrl = computed(() =>
  settings.whatsapp ? waLink(settings.whatsapp, t('store.home.traders.whatsappPrefill')) : '',
)

const tiers = [
  { key: 'small', width: 'w-[34%]', bar: 'bg-[#8AA78F]', strong: false },
  { key: 'medium', width: 'w-[66%]', bar: 'bg-[#5A8F6B]', strong: false },
  { key: 'large', width: 'w-full', bar: 'bg-serag-gold', strong: true },
] as const

const headingId = useId()
</script>

<template>
  <section class="bg-serag-ivory" :aria-labelledby="headingId">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-16 px-4 py-16 sm:px-6 lg:px-10 lg:py-[104px]">
      <div class="flex min-w-0 flex-[1_1_480px] flex-col gap-[26px]">
        <span class="self-start rounded-full bg-serag-green px-[18px] py-[7px] text-sm font-bold text-[#E8DFB0]">
          {{ content.badge }}
        </span>
        <h2 :id="headingId" class="font-display text-[clamp(42px,5.5vw,76px)] leading-none text-serag-green">
          {{ title.lead }}{{ title.highlight ? ' ' : '' }}<span v-if="title.highlight" class="text-serag-gold-ink">{{ title.highlight }}</span>
        </h2>
        <p class="max-w-[540px] text-lg leading-[1.9] text-[#3C4840] sm:text-[19px]">
          {{ content.subtitle }}
        </p>
        <ul class="flex flex-col gap-4 text-lg">
          <li v-for="point in content.points" :key="point" class="flex items-center gap-3.5">
            <span class="flex size-[34px] flex-none items-center justify-center rounded-full bg-serag-green text-serag-gold-hi" aria-hidden="true">
              <Check class="size-[18px]" :stroke-width="2.4" />
            </span>
            {{ point }}
          </li>
        </ul>
        <div class="mt-2 flex flex-wrap gap-3.5">
          <NuxtLink
            :to="cta.to"
            :target="cta.external ? '_blank' : undefined"
            :rel="cta.external ? 'noopener noreferrer' : undefined"
            class="inline-flex min-h-11 items-center gap-3 rounded-full bg-serag-green px-[34px] py-4 text-lg font-bold text-[#F1EBD0] transition hover:-translate-y-0.5 hover:bg-serag-deep focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none motion-reduce:transition-none"
          >
            {{ cta.label }}
          </NuxtLink>
          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center gap-3 rounded-full border-[1.5px] border-serag-green px-[34px] py-4 text-lg font-bold text-serag-green transition-colors hover:bg-serag-green hover:text-serag-ivory focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
          >
            {{ t('store.home.traders.talkToTeam') }}
          </a>
        </div>
      </div>

      <!-- Price-tier illustration -->
      <div class="relative min-h-[460px] w-full flex-[1_1_440px] sm:min-h-[520px]" aria-hidden="true">
        <div class="absolute inset-y-0 start-[6%] end-0 rounded-[40px] bg-serag-green" />
        <div class="relative ms-0 me-9 mt-9 flex flex-col gap-[22px] rounded-[var(--radius-card)] bg-card p-6 shadow-[0_40px_70px_-30px_rgba(20,32,26,.5)] sm:p-[30px]">
          <div class="flex items-center justify-between">
            <span class="text-xl font-bold">{{ t('store.home.traders.tiersTitle') }}</span>
            <span class="rounded-full bg-[#F4EFD6] px-3 py-1 text-[13px] font-bold text-serag-gold-ink">{{ t('store.home.traders.tradersAccount') }}</span>
          </div>
          <div v-for="tier in tiers" :key="tier.key" class="flex flex-col gap-2">
            <div :class="['flex justify-between text-[15px]', tier.strong ? 'font-bold' : 'font-medium']">
              <span>{{ t(`store.home.traders.tiers.${tier.key}.label`) }}</span>
              <span :class="tier.strong ? 'text-serag-gold-ink' : 'text-muted-foreground'">{{ t(`store.home.traders.tiers.${tier.key}.price`) }}</span>
            </div>
            <div class="h-3.5 overflow-hidden rounded-full bg-[#EDE8D5]">
              <div :class="['h-full rounded-full', tier.width, tier.bar]" />
            </div>
          </div>
          <div class="flex items-center gap-3.5 border-t border-dashed border-[#D8D0B4] pt-[18px]">
            <span class="flex size-[46px] flex-none items-center justify-center rounded-[14px] bg-[#E9F0E8] text-serag-green">
              <FileText class="size-[22px]" :stroke-width="1.8" />
            </span>
            <span class="text-[15px] leading-[1.6] text-[#3C4840]">{{ t('store.home.traders.invoiceNote') }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
