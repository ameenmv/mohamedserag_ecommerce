<script setup lang="ts">
import { ClipboardList, CreditCard, House, MessageCircle, ShoppingCart } from '@lucide/vue'
import { waLink } from '@serag/shared'
import type { Component } from 'vue'

const { t } = useI18n()
const localePath = useLocalePath()
const settings = useStoreSettings()
const headingId = useId()

const steps: { key: string; icon: Component; featured?: boolean }[] = [
  { key: 'choose', icon: ClipboardList },
  { key: 'confirm', icon: ShoppingCart },
  { key: 'transfer', icon: CreditCard, featured: true },
  { key: 'receive', icon: House },
]

const whatsappUrl = computed(() =>
  settings.whatsapp ? waLink(settings.whatsapp, t('store.footer.whatsappPrefill')) : '',
)
</script>

<template>
  <section class="bg-serag-ivory" :aria-labelledby="headingId">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div class="mx-auto mb-[52px] max-w-[720px] text-center">
        <p class="eyebrow text-serag-gold-ink">{{ t('store.home.howItWorksEyebrow') }}</p>
        <h2 :id="headingId" class="mt-2.5 mb-3.5 font-display text-[clamp(40px,5.5vw,72px)] leading-none text-serag-green">
          {{ t('store.home.how.title') }}
          <span class="text-[#8B7D3C]">{{ t('store.home.how.titleHighlight') }}</span>
        </h2>
        <p class="text-lg leading-[1.9] text-[#4B574F] sm:text-[19px]">{{ t('store.home.how.subtitle') }}</p>
      </div>

      <ol class="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
        <li
          v-for="(step, index) in steps"
          :key="step.key"
          :class="[
            'group relative flex flex-col gap-4 rounded-[var(--radius-card)] border-[1.5px] px-[26px] py-[30px] transition duration-300 hover:-translate-y-2 hover:border-serag-gold hover:shadow-[0_30px_50px_-28px_rgba(20,32,26,.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
            step.featured
              ? 'border-serag-green bg-serag-green text-serag-ivory'
              : 'border-[#ECE6D3] bg-card text-serag-ink',
          ]"
        >
          <div class="flex items-start justify-between">
            <span
              :class="[
                'flex size-16 items-center justify-center rounded-[20px] transition duration-300 group-hover:-rotate-8 group-hover:scale-105 group-hover:bg-serag-green group-hover:text-serag-gold-hi motion-reduce:transition-none',
                step.featured ? 'bg-serag-gold text-serag-ink' : 'bg-[#F4EFD6] text-serag-gold-ink',
              ]"
              aria-hidden="true"
            >
              <component :is="step.icon" class="size-[30px]" :stroke-width="1.8" />
            </span>
            <!-- Decorative outlined number drawn by CSS (not text, so it is not read or contrast-checked) -->
            <span
              :data-num="String(index + 1).padStart(2, '0')"
              :class="[
                'num text-outline text-[44px] leading-none font-extrabold before:content-[attr(data-num)]',
                step.featured ? '[--outline-color:rgba(210,194,122,.7)]' : '[--outline-color:rgba(42,77,56,.25)]',
              ]"
              aria-hidden="true"
            />
          </div>
          <h3 class="text-[21px] font-bold">{{ t(`store.home.how.steps.${step.key}.title`) }}</h3>
          <p :class="['text-[15px] leading-[1.8]', step.featured ? 'text-[#C9D5C6]' : 'text-[#4B574F]']">
            {{ t(`store.home.how.steps.${step.key}.body`) }}
          </p>
          <span
            v-if="step.featured"
            class="absolute -top-3 start-6 rounded-full bg-serag-gold-hi px-3 py-1 text-xs font-bold text-serag-ink"
          >
            {{ t('store.home.how.onlyUpfront') }}
          </span>
        </li>
      </ol>

      <div class="mt-9 flex flex-wrap items-center justify-center gap-3.5">
        <NuxtLink
          :to="localePath('/shop')"
          class="inline-flex min-h-11 items-center gap-3 rounded-full bg-serag-gold px-[30px] py-4 text-[17px] font-bold text-serag-ink transition hover:-translate-y-0.5 hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none motion-reduce:transition-none"
        >
          {{ t('store.home.how.startShopping') }}
        </NuxtLink>
        <a
          v-if="whatsappUrl"
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center gap-2.5 rounded-full border-[1.5px] border-[#CFE7D6] bg-[#F1FAF3] px-6 py-4 text-[17px] font-bold text-[#15803D] transition-colors hover:border-[#16A34A] hover:bg-[#16A34A] hover:text-white focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:outline-none"
        >
          <MessageCircle class="size-5" aria-hidden="true" />
          {{ t('store.home.how.askWhatsapp') }}
        </a>
      </div>
    </div>
  </section>
</template>
