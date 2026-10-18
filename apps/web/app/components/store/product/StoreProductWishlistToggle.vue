<script setup lang="ts">
import { Heart } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'

const props = defineProps<{
  product: ProductCard
}>()

const { t } = useI18n()
const notify = useNotify()
const { has, toggle } = useWishlist()
const hydrated = useHydrated()

const isSaved = computed(() => hydrated.value && has(props.product.id))

function onToggle(): void {
  const added = toggle(props.product)
  if (added) {
    notify.success(t('store.wishlist.addedNotice'))
  } else {
    notify.info(t('store.wishlist.removedNotice'))
  }
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="isSaved"
    :aria-label="
      isSaved
        ? t('store.wishlist.removeAria', { name: product.name })
        : t('store.wishlist.addAria', { name: product.name })
    "
    class="relative z-10 inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-xs backdrop-blur-xs transition-colors hover:border-serag-gold hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-10 motion-reduce:transition-none"
    @click.stop.prevent="onToggle"
  >
    <Heart
      :class="[
        'size-4 sm:size-4.5 transition-transform duration-150 motion-reduce:transition-none',
        isSaved
          ? 'fill-red-500 text-red-500 scale-105'
          : 'fill-none text-muted-foreground hover:text-foreground',
      ]"
      aria-hidden="true"
    />
  </button>
</template>
