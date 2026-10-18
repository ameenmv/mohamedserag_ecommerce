<script setup lang="ts">
import { ShoppingCart, Trash2, TrendingDown } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'
import { formatEgpWithUnit } from '@serag/shared'
import type { WishlistItem } from '~/composables/useWishlist'

const props = defineProps<{
  item: WishlistItem
}>()

const emit = defineEmits<{
  moveToCart: [card: ProductCard]
  remove: [id: string]
}>()

const { t } = useI18n()

const isOrderable = computed(() => props.item.card?.availability.orderable ?? false)

function handleMoveToCart(): void {
  if (props.item.card && isOrderable.value) {
    emit('moveToCart', props.item.card)
  }
}

function handleRemove(): void {
  if (props.item.card) {
    emit('remove', props.item.card.id)
  }
}
</script>

<template>
  <div
    v-if="item.card"
    class="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-2.5 transition-all duration-200 hover:border-serag-gold/50 hover:shadow-md sm:p-4"
  >
    <!-- Price Dropped Badge overlaid across the top -->
    <div
      v-if="item.priceDropped"
      class="mb-2 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400"
    >
      <span class="inline-flex items-center gap-1">
        <TrendingDown class="size-3.5 shrink-0" aria-hidden="true" />
        <span>{{ t('store.wishlist.priceDropped') }}</span>
      </span>
      <span
        class="num text-[11px] font-medium line-through opacity-80"
        :aria-label="t('store.product.oldPriceAria', { price: formatEgpWithUnit(item.entry.priceAtAdd) })"
      >
        {{ formatEgpWithUnit(item.entry.priceAtAdd) }}
      </span>
    </div>

    <!-- Product Card Inner Content -->
    <StoreProductCard :product="item.card" :show-add-to-cart="false" />

    <!-- Wishlist Item Footer Actions -->
    <div class="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
      <!-- Move to Cart Button -->
      <button
        v-if="isOrderable"
        type="button"
        class="relative z-10 inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-serag-night px-3 text-xs font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night sm:text-sm motion-reduce:transition-none"
        :aria-label="t('store.wishlist.moveToCartAria', { name: item.card.name })"
        @click="handleMoveToCart"
      >
        <ShoppingCart class="size-4 shrink-0 text-serag-gold-hi" aria-hidden="true" />
        <span>{{ t('store.wishlist.moveToCart') }}</span>
      </button>

      <button
        v-else
        type="button"
        disabled
        aria-disabled="true"
        class="relative z-10 inline-flex min-h-11 flex-1 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-muted/70 px-3 text-xs font-bold text-muted-foreground sm:text-sm"
      >
        <span>{{ t('store.product.outOfStock') }}</span>
      </button>

      <!-- Remove Button («شيل») -->
      <button
        type="button"
        class="relative z-10 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        :aria-label="t('store.wishlist.removeAria', { name: item.card.name })"
        @click="handleRemove"
      >
        <Trash2 class="size-4 shrink-0" aria-hidden="true" />
        <span>{{ t('store.wishlist.remove') }}</span>
      </button>
    </div>
  </div>
</template>
