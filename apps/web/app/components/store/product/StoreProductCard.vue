<script setup lang="ts">
import { Package } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'

const props = withDefaults(
  defineProps<{
    product: ProductCard
    priority?: boolean
  }>(),
  {
    priority: false,
  },
)

const emit = defineEmits<{
  compareFull: [product: ProductCard]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const productUrl = computed(() => localePath(`/p/${props.product.slug}`))
</script>

<template>
  <article
    class="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-2.5 transition-all duration-200 hover:border-serag-gold/50 hover:shadow-md sm:p-4 motion-reduce:transition-none"
  >
    <!-- Background overlay link for full-card navigation -->
    <NuxtLink
      :to="productUrl"
      class="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-hidden="true"
      tabindex="-1"
    />

    <!-- Top section: image, badges, toggles -->
    <div>
      <div
        class="relative mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-serag-ivory/60 sm:mb-3 dark:bg-muted/30"
      >
        <!-- Product image via NuxtImg (avoiding CLS with explicit dimensions) -->
        <NuxtImg
          v-if="product.image?.url"
          :src="product.image.url"
          :alt="product.image.alt || product.name"
          width="400"
          height="400"
          :loading="priority ? 'eager' : 'lazy'"
          :fetchpriority="priority ? 'high' : 'auto'"
          class="size-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
        />

        <!-- Neutral placeholder when image is absent -->
        <div
          v-else
          class="flex size-full items-center justify-center text-muted-foreground/35"
          aria-hidden="true"
        >
          <Package class="size-12 stroke-[1.2]" />
        </div>

        <!-- Real photo chip («صورة حقيقية») -->
        <span
          v-if="product.image?.isReal"
          class="absolute bottom-1.5 start-1.5 z-10 rounded-md bg-serag-night/85 px-1.5 py-0.5 text-[9px] font-bold text-serag-gold-hi backdrop-blur-xs sm:bottom-2 sm:start-2 sm:px-2 sm:text-[10px]"
        >
          {{ t('store.product.realPhoto') }}
        </span>

        <!-- Availability badge top start (reserves width for top-end toggles to prevent overlap at 320px) -->
        <div
          class="absolute top-1.5 start-1.5 z-10 max-w-[calc(100%-3rem)] sm:top-2 sm:start-2 sm:max-w-[calc(100%-3.5rem)]"
        >
          <StoreProductAvailabilityBadge :availability="product.availability" />
        </div>

        <!-- Wishlist and Compare actions top end -->
        <div class="absolute top-1.5 end-1.5 z-10 flex flex-col gap-1 sm:top-2 sm:end-2 sm:gap-1.5">
          <StoreProductWishlistToggle :product="product" />
          <StoreProductCompareToggle
            :product="product"
            @full="emit('compareFull', $event)"
          />
        </div>
      </div>

      <!-- Brand name -->
      <div class="mb-1">
        <span class="text-[11px] font-bold tracking-wider text-serag-gold uppercase sm:text-xs">
          {{ product.brand.name }}
        </span>
      </div>

      <!-- Product title linking to product page -->
      <h3 class="min-h-[2.4rem] text-xs font-bold leading-snug sm:min-h-[2.8rem] sm:text-sm">
        <NuxtLink
          :to="productUrl"
          class="relative z-10 text-foreground transition-colors hover:text-serag-night dark:hover:text-serag-gold-hi"
        >
          {{ product.name }}
        </NuxtLink>
      </h3>
    </div>

    <!-- Bottom section: Price and Add to Cart -->
    <div class="mt-2.5 flex flex-col gap-2.5 sm:mt-3 sm:gap-3">
      <StoreProductPrice
        :price="product.price"
        :old-price="product.oldPrice"
        :discount-percent="product.discountPercent"
      />

      <StoreProductAddToCart :product="product" />
    </div>
  </article>
</template>
