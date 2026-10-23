<script setup lang="ts">
import { MessageCircle } from '@lucide/vue'
import type { ProductCard } from '@serag/shared'
import { DEFAULT_TEMPLATES, renderTemplate, waLink } from '@serag/shared'

const props = withDefaults(
  defineProps<{
    product: ProductCard
    priority?: boolean
    showAddToCart?: boolean
  }>(),
  {
    priority: false,
    showAddToCart: true,
  },
)

const emit = defineEmits<{
  compareFull: [product: ProductCard]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const productUrl = computed(() => localePath(`/p/${props.product.slug}`))

const settings = useStoreSettings()
const siteUrl = useRuntimeConfig().public.siteUrl
const whatsappUrl = computed(() => {
  if (!settings.whatsapp) return ''
  const text = renderTemplate(DEFAULT_TEMPLATES.product_question, {
    productName: props.product.name,
    productUrl: new URL(productUrl.value, siteUrl).href,
  })
  return waLink(settings.whatsapp, text)
})
</script>

<template>
  <article
    class="group relative flex flex-col justify-between rounded-2xl border border-[#E7E0C8] bg-card p-2.5 transition duration-200 hover:-translate-y-1.5 hover:shadow-[0_28px_48px_-22px_rgba(20,32,26,.4)] sm:rounded-[var(--radius-card)] sm:p-[18px] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
  >
    <!-- Background overlay link for full-card navigation -->
    <NuxtLink
      :to="productUrl"
      class="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-[var(--radius-card)]"
      aria-hidden="true"
      tabindex="-1"
    />

    <!-- Top section: image, badges, toggles -->
    <div>
      <div
        class="relative mb-2.5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-serag-cream sm:mb-4 sm:aspect-[6/5] sm:rounded-[20px] dark:bg-muted/30"
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
          class="flex size-full items-center justify-center text-serag-green"
          aria-hidden="true"
        >
          <StoreCategoryIcon :slug="product.category.slug" class="size-20 sm:size-[120px]" stroke-width="1.4" />
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
        <span data-brand class="text-[11px] font-semibold text-serag-gold-ink sm:text-[13px]">
          {{ product.brand.name }}
        </span>
      </div>

      <!-- Product title linking to product page -->
      <h3 class="min-h-[2.4rem] text-sm leading-snug font-bold sm:min-h-[3.4rem] sm:text-[19px] sm:leading-[1.4]">
        <NuxtLink
          :to="productUrl"
          class="relative z-10 text-foreground transition-colors hover:text-serag-night dark:hover:text-serag-gold-hi"
        >
          {{ product.name }}
        </NuxtLink>
      </h3>

      <!-- Rating (approved reviews only; truthy check for backward compatibility) -->
      <div v-if="product.rating" class="mt-1 flex items-center">
        <StoreProductRating :rating="product.rating" size="sm" />
      </div>
    </div>

    <!-- Bottom section: Price and Add to Cart -->
    <div class="mt-2.5 flex flex-col gap-2.5 sm:mt-3 sm:gap-3">
      <StoreProductPrice
        :price="product.price"
        :old-price="product.oldPrice"
        :discount-percent="product.discountPercent"
        :flash="product.flash"
        countdown-variant="compact"
      />

      <StoreProductAddToCart v-if="showAddToCart" :product="product" />
      <a
        v-if="showAddToCart && whatsappUrl"
        :href="whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('store.product.askWhatsappAria', { name: product.name })"
        class="relative z-10 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#CFE7D6] bg-[#F1FAF3] px-3 text-xs font-bold text-[#15803D] transition-colors hover:border-[#16A34A] hover:bg-[#16A34A] hover:text-white focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:outline-none sm:min-h-11 sm:rounded-2xl sm:text-[15px]"
      >
        <MessageCircle class="size-4 shrink-0 sm:size-[18px]" aria-hidden="true" />
        {{ t('store.productPage.askWhatsapp') }}
      </a>
    </div>
  </article>
</template>
