<script setup lang="ts">
import { Tag } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'

defineProps<{
  products: ProductCard[]
}>()

const { t } = useI18n()
</script>

<template>
  <section
    v-if="products.length > 0"
    class="rounded-3xl border border-border bg-card p-4 sm:p-6 lg:p-8 shadow-xs"
    aria-labelledby="discounted-section-heading"
  >
    <!-- Section Header -->
    <div
      class="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-4 sm:mb-6"
    >
      <span
        class="inline-flex size-8 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-950/40 dark:text-red-400"
      >
        <Tag class="size-4" aria-hidden="true" />
      </span>
      <h2
        id="discounted-section-heading"
        class="font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        {{ t('store.offers.discountedSectionTitle') }}
      </h2>
    </div>

    <!-- Product Grid (same grid as listings) -->
    <div class="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      <StoreProductCard
        v-for="(product, idx) in products"
        :key="product.id"
        :product="product"
        :priority="idx < 4"
      />
    </div>
  </section>
</template>
