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
    class="relative z-10 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-serag-night px-3 text-xs font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-11 sm:text-sm dark:bg-serag-green dark:hover:bg-serag-night motion-reduce:transition-none"
    @click.stop.prevent="onAddToCart"
  >
    <ShoppingCart class="size-4 shrink-0 text-serag-gold-hi" aria-hidden="true" />
    <span>{{ t('store.product.addToCart') }}</span>
  </button>

  <button
    v-else
    type="button"
    disabled
    aria-disabled="true"
    class="relative z-10 inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-border bg-muted/70 px-3 text-xs font-bold text-muted-foreground sm:h-11 sm:text-sm"
  >
    <span>{{ t('store.product.outOfStock') }}</span>
  </button>
</template>
