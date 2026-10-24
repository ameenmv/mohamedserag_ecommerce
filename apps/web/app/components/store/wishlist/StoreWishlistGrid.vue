<script setup lang="ts">
import { AlertCircle, Heart, Trash2 } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'
import type { WishlistItem } from '~/composables/useWishlist'

const props = defineProps<{
  items: readonly WishlistItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  moveToCart: [card: ProductCard]
  remove: [id: string]
}>()

const { t } = useI18n()

const availableItems = computed(() =>
  props.items.filter((i) => i.card !== null),
)

const unavailableItems = computed(() =>
  props.items.filter((i) => i.card === null),
)
</script>

<template>
  <div>
    <!-- Skeletons Loading State -->
    <div
      v-if="loading && items.length === 0"
      class="space-y-6"
      aria-busy="true"
    >
      <div class="space-y-2">
        <Skeleton class="h-10 w-44 rounded-xl" />
        <Skeleton class="h-4 w-72 rounded-md" />
      </div>
      <div class="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StoreProductCardSkeleton v-for="i in 4" :key="i" />
      </div>
    </div>

    <!-- Empty State -->
    <StoreEmptyState
      v-else-if="items.length === 0"
      :icon="Heart"
      heading-tag="h1"
      :title="t('store.wishlist.emptyTitle')"
      :description="t('store.wishlist.emptyDescription')"
      :cta-label="t('store.wishlist.browseProducts')"
    />

    <!-- Loaded Content: Grid + Unavailable List -->
    <div v-else class="space-y-6">
      <div>
        <h1 class="font-display text-3xl sm:text-4xl text-foreground">
          {{ t('store.wishlist.title') }}
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          {{ t('store.wishlist.subtitle') }}
        </p>
      </div>

      <!-- Available Products Grid -->
      <div
        v-if="availableItems.length > 0"
        class="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
      >
        <StoreWishlistItem
          v-for="item in availableItems"
          :key="item.entry.productId"
          :item="item"
          @move-to-cart="emit('moveToCart', $event)"
          @remove="emit('remove', $event)"
        />
      </div>

      <!-- Unavailable Products Section -->
      <div v-if="unavailableItems.length > 0" class="mt-8 space-y-3">
        <div
          v-for="item in unavailableItems"
          :key="item.entry.productId"
          class="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4"
        >
          <div class="flex items-center gap-2.5 text-xs sm:text-sm text-muted-foreground">
            <AlertCircle class="size-5 shrink-0 text-amber-500" aria-hidden="true" />
            <span class="font-semibold">{{ t('store.wishlist.unavailableProduct') }}</span>
          </div>
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :aria-label="t('store.wishlist.removeUnavailable')"
            @click="emit('remove', item.entry.productId)"
          >
            <Trash2 class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ t('store.wishlist.remove') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
