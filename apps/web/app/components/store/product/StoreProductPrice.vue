<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    price: number
    oldPrice?: number | null
    discountPercent?: number | null
  }>(),
  {
    oldPrice: null,
    discountPercent: null,
  },
)

const { t } = useI18n()
const { format } = usePrice()

const currentPrice = computed(() => format(props.price))
const previousPrice = computed(() =>
  props.oldPrice !== null && props.oldPrice !== undefined ? format(props.oldPrice) : null,
)
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <div class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span class="num text-base font-extrabold tracking-tight text-serag-night sm:text-xl dark:text-serag-ivory">
        {{ currentPrice.digits }}
      </span>
      <span class="text-xs font-semibold text-muted-foreground">
        {{ currentPrice.unit }}
      </span>

      <span
        v-if="previousPrice"
        class="num text-[11px] font-medium text-muted-foreground/75 line-through decoration-muted-foreground/60 ms-1 sm:text-xs"
        :aria-label="t('store.product.oldPriceAria', { price: previousPrice.formatted })"
      >
        {{ previousPrice.digits }}
      </span>
    </div>

    <div v-if="discountPercent && discountPercent > 0" class="flex items-center">
      <span
        class="num inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400 sm:text-[11px]"
      >
        {{ t('store.product.discountBadge', { percent: discountPercent }) }}
      </span>
    </div>
  </div>
</template>
