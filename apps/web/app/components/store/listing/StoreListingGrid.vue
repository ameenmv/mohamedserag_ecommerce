<script setup lang="ts">
import type { ProductCard } from '@serag/shared'

const props = withDefaults(
  defineProps<{
    products: readonly ProductCard[] | ProductCard[]
    pending?: boolean
  }>(),
  {
    pending: false,
  },
)

const { t } = useI18n()

// Prevent skeleton flash on SSR: only display skeletons on subsequent client pending states
const isMounted = ref(false)
if (import.meta.client) {
  onMounted(() => {
    isMounted.value = true
  })
}

const showSkeletons = computed(() => isMounted.value && props.pending)
</script>

<template>
  <div>
    <h2 class="sr-only">
      {{ t('store.listing.resultsHeading') }}
    </h2>

    <!-- Client pending skeleton grid -->
    <div
      v-if="showSkeletons"
      class="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="flex flex-col justify-between rounded-2xl border border-border bg-card p-2.5 sm:p-4"
      >
        <div>
          <!-- Image skeleton -->
          <Skeleton class="mb-2.5 aspect-square w-full rounded-xl sm:mb-3" />
          <!-- Brand skeleton -->
          <Skeleton class="mb-2 h-3 w-14 rounded-md" />
          <!-- Title skeleton -->
          <Skeleton class="mb-1.5 h-4 w-full rounded-md" />
          <Skeleton class="mb-3 h-4 w-3/4 rounded-md" />
        </div>
        <!-- Price & CTA skeleton -->
        <div class="mt-2 flex flex-col gap-2">
          <Skeleton class="h-6 w-24 rounded-md" />
          <Skeleton class="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>

    <!-- Real product card grid -->
    <div
      v-else
      class="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
    >
      <StoreProductCard
        v-for="(product, idx) in products"
        :key="product.id"
        :product="product"
        :priority="idx < 3"
      />
    </div>
  </div>
</template>
