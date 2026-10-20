<script setup lang="ts">
import type { ProductCard } from '@serag/shared'

const { t } = useI18n()
const wishlist = useWishlist()
const { add: addToCart } = useCart()
const notify = useNotify()

useSeoMeta({
  title: () => t('store.wishlist.pageTitle'),
  robots: 'noindex, follow',
})

const isMounted = ref(false)

if (import.meta.client) {
  onMounted(async () => {
    isMounted.value = true
    await wishlist.refresh()
  })
}

function handleMoveToCart(card: ProductCard): void {
  addToCart(card, 1)
  wishlist.remove(card.id)
  notify.success(t('store.wishlist.movedToCartNotice'))
}

function handleRemove(productId: string): void {
  wishlist.remove(productId)
  notify.info(t('store.wishlist.removedNotice'))
}
</script>

<template>
  <main class="w-full min-w-0">
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <StoreListingBreadcrumb :items="[{ label: t('store.wishlist.title') }]" />
      </div>
    </div>

    <!-- Page Content Composition -->
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
      <StoreWishlistGrid
        :items="wishlist.items.value"
        :loading="!isMounted || (wishlist.loading.value && wishlist.isEmpty.value)"
        @move-to-cart="handleMoveToCart"
        @remove="handleRemove"
      />
    </div>
  </main>
</template>
