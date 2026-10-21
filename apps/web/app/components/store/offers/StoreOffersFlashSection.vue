<script setup lang="ts">
import { Zap } from '@lucide/vue'
import type { FlashSaleOffersGroup } from '@serag/shared'
import { formatDateTime } from '~/utils/date-format'

defineProps<{
  group: FlashSaleOffersGroup
}>()

const emit = defineEmits<{
  (e: 'ended'): void
}>()

const { t, locale } = useI18n()
</script>

<template>
  <section
    class="rounded-3xl border border-border bg-card p-4 sm:p-6 lg:p-8 shadow-xs"
    :aria-labelledby="`flash-sale-${group.id}`"
  >
    <!-- Header: Title, Badge, Countdown -->
    <div
      class="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4"
    >
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <span
          class="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:border-serag-gold/40 dark:bg-serag-gold/20 dark:text-serag-gold-hi"
        >
          <Zap
            class="size-3.5 fill-amber-500 text-amber-800 dark:fill-serag-gold dark:text-serag-gold"
            aria-hidden="true"
          />
          <span>{{ t('store.flash.badge') }}</span>
        </span>

        <h2
          :id="`flash-sale-${group.id}`"
          class="font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          {{ group.name }}
        </h2>
      </div>

      <!-- Live countdown -->
      <div class="flex items-center">
        <ClientOnly>
          <StoreProductCountdown
            :ends-at="group.endsAt"
            variant="detail"
            @ended="emit('ended')"
          />
          <template #fallback>
            <span class="sr-only">
              {{ t('store.flash.endsAtAria', { datetime: formatDateTime(group.endsAt, locale) }) }}
            </span>
          </template>
        </ClientOnly>
      </div>
    </div>

    <!-- Product Grid (same grid as listings) -->
    <div class="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      <StoreProductCard
        v-for="(product, idx) in group.products"
        :key="product.id"
        :product="product"
        :priority="idx < 4"
      />
    </div>
  </section>
</template>
