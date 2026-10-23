<script setup lang="ts">
import type { ProductFlash } from '@serag/shared'
import { formatDateTime } from '~/utils/date-format'

const props = withDefaults(
  defineProps<{
    price: number
    oldPrice?: number | null
    discountPercent?: number | null
    flash?: ProductFlash | null
    countdownVariant?: 'compact' | 'detail' | 'none'
  }>(),
  {
    oldPrice: null,
    discountPercent: null,
    flash: null,
    countdownVariant: 'none',
  },
)

const emit = defineEmits<{
  (e: 'flashEnded'): void
}>()

const { t, locale } = useI18n()
const { format } = usePrice()

const currentPrice = computed(() => format(props.price))
const previousPrice = computed(() =>
  props.oldPrice !== null && props.oldPrice !== undefined ? format(props.oldPrice) : null,
)
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- Flash badge when flash is set -->
    <div v-if="flash" class="flex items-center">
      <StoreProductFlashBadge :flash="flash" />
    </div>

    <div class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span data-price class="num text-lg font-extrabold tracking-tight text-serag-green sm:text-2xl dark:text-serag-ivory whitespace-nowrap">
        {{ currentPrice.digits }}
      </span>
      <span class="text-xs font-semibold text-foreground whitespace-nowrap sm:text-sm">
        {{ currentPrice.unit }}
      </span>

      <span
        v-if="previousPrice"
        class="num text-[11px] font-medium text-muted-foreground line-through decoration-muted-foreground/60 ms-1 sm:text-xs whitespace-nowrap"
        :aria-label="t('store.product.oldPriceAria', { price: previousPrice.formatted })"
      >
        {{ previousPrice.digits }}
      </span>
    </div>

    <!-- Regular discount percent badge -->
    <div v-if="discountPercent && discountPercent > 0" class="flex items-center">
      <span
        class="num inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400 sm:text-[11px] whitespace-nowrap"
      >
        {{ t('store.product.discountBadge', { percent: discountPercent }) }}
      </span>
    </div>

    <!-- Countdown under the price (where there is room) -->
    <div v-if="flash && countdownVariant !== 'none'" class="mt-0.5">
      <ClientOnly>
        <StoreProductCountdown
          :ends-at="flash.endsAt"
          :variant="countdownVariant"
          @ended="emit('flashEnded')"
        />
        <template #fallback>
          <span class="sr-only">
            {{ t('store.flash.endsAtAria', { datetime: formatDateTime(flash.endsAt, locale) }) }}
          </span>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
