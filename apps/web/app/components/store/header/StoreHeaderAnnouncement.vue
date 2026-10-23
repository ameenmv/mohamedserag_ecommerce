<script setup lang="ts">
import { Phone, ShieldCheck, Truck } from '@lucide/vue'

defineProps<{
  phone: string
}>()

const { t, locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const otherLocale = computed(() => locales.value.find((l) => l.code !== locale.value)!)
</script>

<template>
  <div class="bg-serag-night text-xs text-[#E8DFB0] sm:text-sm">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-7 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-1.5">
        <span class="inline-flex items-center gap-2">
          <ShieldCheck class="size-4 text-serag-gold" aria-hidden="true" />
          <span>{{ t('store.header.announcementAuthentic') }}</span>
        </span>
        <span class="hidden items-center gap-2 md:inline-flex">
          <Truck class="size-4 text-serag-gold" aria-hidden="true" />
          <span>{{ t('store.header.announcementDelivery') }}</span>
        </span>
      </div>
      <div class="flex items-center gap-5">
        <a
          v-if="phone"
          :href="`tel:${phone}`"
          class="inline-flex min-h-8 items-center gap-2 rounded-full transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Phone class="size-4 text-serag-gold" aria-hidden="true" />
          <span class="num font-medium">{{ phone }}</span>
        </a>
        <NuxtLink
          :to="switchLocalePath(otherLocale.code)"
          :lang="otherLocale.code"
          :hreflang="otherLocale.language"
          :aria-label="otherLocale.name"
          class="num inline-flex min-h-8 items-center rounded-full border border-serag-gold/50 px-3 text-[13px] font-bold uppercase transition-colors hover:bg-serag-gold/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {{ otherLocale.code === 'en' ? 'EN' : 'ع' }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
