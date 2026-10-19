<script setup lang="ts">
import type { ProductDetail } from '@serag/shared'
import { PenLine } from '@lucide/vue'

defineProps<{
  product: ProductDetail
}>()

const { t } = useI18n()
const isFormOpen = ref(false)

function toggleForm(): void {
  isFormOpen.value = !isFormOpen.value
}
</script>

<template>
  <section
    id="reviews-section"
    aria-labelledby="reviews-heading"
    class="mt-14 border-t border-border/80 pt-8 sm:mt-16 sm:pt-10 lg:mt-20"
  >
    <div class="flex flex-col gap-6">
      <!-- Section Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-1">
          <h2
            id="reviews-heading"
            class="font-display text-2xl text-foreground sm:text-3xl lg:text-4xl"
          >
            {{ t('store.reviews.heading') }}
          </h2>
          <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {{ t('store.reviews.subheading') }}
          </p>
        </div>

        <!-- Write review button (44px min height, brand styling, toggles form open) -->
        <button
          type="button"
          :aria-expanded="isFormOpen"
          aria-controls="store-product-review-form-panel"
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-serag-night px-5 py-2.5 text-sm font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night cursor-pointer"
          @click="toggleForm"
        >
          <PenLine class="size-4 text-serag-gold shrink-0" aria-hidden="true" />
          <span>{{ t('store.reviews.writeReview') }}</span>
        </button>
      </div>

      <!-- Rating summary and approved review list slot (reserved for future slice chunk) -->
      <div id="reviews-summary-and-list" />

      <!-- Review Form (lazy-loaded on demand) -->
      <div
        v-if="isFormOpen"
        id="store-product-review-form-panel"
        class="transition-all"
      >
        <LazyStoreProductPageReviewForm
          :product="product"
        />
      </div>
    </div>
  </section>
</template>
