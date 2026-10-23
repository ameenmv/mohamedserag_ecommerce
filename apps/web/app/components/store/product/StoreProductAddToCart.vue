<script setup lang="ts">
import { ShoppingCart } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'

const props = defineProps<{
  product: ProductCard
}>()

const { t } = useI18n()
const { add } = useCart()

const isOrderable = computed(() => props.product.availability.orderable)

function onAddToCart(): void {
  if (isOrderable.value) {
    add(props.product, 1)
  }
}
</script>

<template>
  <button
    v-if="isOrderable"
    type="button"
    class="relative z-10 inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-serag-green px-2 sm:gap-2 sm:px-3 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-gold hover:text-serag-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-[52px] sm:rounded-2xl sm:text-base dark:bg-serag-green motion-reduce:transition-none"
    @click.stop.prevent="onAddToCart"
  >
    <ShoppingCart class="size-4 shrink-0 sm:size-5" aria-hidden="true" />
    <span class="truncate">{{ t('store.product.addToCart') }}</span>
  </button>

  <button
    v-else
    type="button"
    disabled
    aria-disabled="true"
    class="relative z-10 inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-border bg-muted/70 px-3 text-sm font-bold text-muted-foreground sm:h-[52px] sm:rounded-2xl sm:text-base"
  >
    <span>{{ t('store.product.outOfStock') }}</span>
  </button>
</template>
