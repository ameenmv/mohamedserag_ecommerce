<script setup lang="ts">
import { Phone, ShieldCheck, Truck } from '@lucide/vue'

defineProps<{
  phone: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="bg-serag-night text-serag-ivory text-xs sm:text-sm">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
      <div class="flex flex-wrap items-center gap-4 sm:gap-6">
        <span class="inline-flex items-center gap-1.5">
          <ShieldCheck class="size-4 text-serag-gold" aria-hidden="true" />
          <span>{{ t('store.header.announcementAuthentic') }}</span>
        </span>
        <span class="hidden items-center gap-1.5 md:inline-flex">
          <Truck class="size-4 text-serag-gold" aria-hidden="true" />
          <span>{{ t('store.header.announcementDelivery') }}</span>
        </span>
      </div>
      <div class="flex items-center gap-3">
        <a
          v-if="phone"
          :href="`tel:${phone}`"
          class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        >
          <Phone class="size-3.5 text-serag-gold" aria-hidden="true" />
          <span class="num font-medium">{{ phone }}</span>
        </a>
      </div>
    </div>
  </div>
</template>
