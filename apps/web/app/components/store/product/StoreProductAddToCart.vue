<script setup lang="ts">
import { Check, ShoppingCart } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'

const props = defineProps<{
  product: ProductCard
}>()

const { t } = useI18n()
const { add } = useCart()

const isOrderable = computed(() => props.product.availability.orderable)

// The icon turns into a tick for a moment, so the tap visibly landed
const justAdded = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

function onAddToCart(event: MouseEvent): void {
  if (isOrderable.value) {
    add(props.product, 1)
    // Loaded on the first add to cart: never part of the page's first load
    const button = event.currentTarget
    if (button instanceof HTMLElement) void import('~/utils/fly-to-cart').then(({ flyToCart }) => flyToCart(button))
    justAdded.value = true
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (justAdded.value = false), 1100)
  }
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<template>
  <button
    v-if="isOrderable"
    type="button"
    class="relative z-10 inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-serag-green px-2 sm:gap-2 sm:px-3 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-gold hover:text-serag-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-[52px] sm:rounded-2xl sm:text-base dark:bg-serag-green motion-reduce:transition-none"
    :data-cursor="t('store.cursor.add')"
    @click.stop.prevent="onAddToCart"
  >
    <Check v-if="justAdded" class="heart-pop size-4 shrink-0 sm:size-5" aria-hidden="true" />
    <ShoppingCart v-else class="size-4 shrink-0 sm:size-5" aria-hidden="true" />
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
