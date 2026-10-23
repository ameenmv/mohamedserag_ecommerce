<script setup lang="ts">
import { BellRing, Check, MessageCircle, Truck } from '@lucide/vue'
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

const { money } = usePrice()
const { has } = useCart()
const hydrated = useHydrated()

const isOrderable = computed(() => props.product.availability.orderable)
// The cart lives in browser storage, so the chip only shows after hydration (no SSR mismatch)
const inCart = computed(() => hydrated.value && has(props.product.id))
const savings = computed(() => {
  const old = props.product.oldPrice
  return old && old > props.product.price ? money(old - props.product.price) : null
})
const leadTime = computed(() =>
  props.product.availability.state === 'on_request' ? props.product.availability.leadTimeText : null,
)

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
    class="group relative flex flex-col rounded-[20px] border border-[#E7E0C8] bg-card p-2.5 transition duration-200 hover:-translate-y-1 hover:border-serag-gold/60 hover:shadow-[0_28px_48px_-24px_rgba(20,32,26,.38)] sm:rounded-[26px] sm:p-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
  >
    <!-- Background overlay link for full-card navigation -->
    <NuxtLink
      :to="productUrl"
      class="absolute inset-0 z-0 rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-[26px]"
      aria-hidden="true"
      tabindex="-1"
    />

    <!-- Image with badges and toggles -->
    <div
      class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-serag-cream sm:rounded-[20px] dark:bg-muted/30"
    >
      <NuxtImg
        v-if="product.image?.url"
        :src="product.image.url"
        :alt="product.image.alt || product.name"
        width="400"
        height="400"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : 'auto'"
        :class="[
          'size-full object-contain p-3 transition-transform duration-300 group-hover:scale-105 sm:p-5 motion-reduce:transition-none',
          !isOrderable && 'opacity-60 grayscale',
        ]"
      />
      <div
        v-else
        :class="['flex size-full items-center justify-center text-serag-green', !isOrderable && 'opacity-50']"
        aria-hidden="true"
      >
        <StoreCategoryIcon
          :slug="product.category.slug"
          class="size-20 transition-transform duration-300 group-hover:scale-110 sm:size-32 motion-reduce:transition-none"
          stroke-width="1.3"
        />
      </div>

      <!-- Discount and availability, top start (leaves room for the toggles at 320px) -->
      <div
        class="absolute top-2 start-2 z-10 flex max-w-[calc(100%-3.25rem)] flex-col items-start gap-1 sm:top-3 sm:start-3 sm:max-w-[calc(100%-4rem)]"
      >
        <span
          v-if="product.discountPercent && product.discountPercent > 0"
          class="num rounded-lg bg-[#C8431F] px-2 py-0.5 text-[11px] font-extrabold text-white shadow-sm sm:text-[13px]"
        >
          <span dir="ltr" aria-hidden="true">{{ t('store.product.discountShort', { percent: product.discountPercent }) }}</span>
          <span class="sr-only">{{ t('store.product.discountBadge', { percent: product.discountPercent }) }}</span>
        </span>
        <StoreProductAvailabilityBadge :availability="product.availability" compact />
      </div>

      <!-- Wishlist and compare, top end -->
      <div class="absolute top-2 end-2 z-10 flex flex-col gap-1.5 sm:top-3 sm:end-3">
        <StoreProductWishlistToggle :product="product" />
        <StoreProductCompareToggle
          :product="product"
          @full="emit('compareFull', $event)"
        />
      </div>

      <!-- Real photo chip («صورة حقيقية») -->
      <span
        v-if="product.image?.isReal"
        class="absolute bottom-2 start-2 z-10 rounded-md bg-serag-night/85 px-1.5 py-0.5 text-[9px] font-bold text-serag-gold-hi backdrop-blur-xs sm:bottom-3 sm:start-3 sm:px-2 sm:text-[10px]"
      >
        {{ t('store.product.realPhoto') }}
      </span>

      <!-- Already in the cart -->
      <span
        v-if="inCart"
        class="absolute bottom-2 end-2 z-10 inline-flex items-center gap-1 rounded-full bg-serag-green px-2 py-0.5 text-[10px] font-bold text-serag-ivory shadow-sm sm:bottom-3 sm:end-3 sm:text-xs"
      >
        <Check class="size-3 sm:size-3.5" aria-hidden="true" />
        {{ t('store.product.inCart') }}
      </span>
    </div>

    <!-- Details -->
    <div class="mt-2.5 flex flex-1 flex-col sm:mt-4">
      <div class="flex items-center justify-between gap-2">
        <span data-brand class="truncate text-[11px] font-bold text-serag-gold-ink sm:text-[13px]">
          {{ product.brand.name }}
        </span>
        <StoreProductRating v-if="product.rating" :rating="product.rating" size="sm" class="shrink-0" />
      </div>

      <!-- Always two lines tall so prices and buttons line up across a row -->
      <h3 class="mt-1 line-clamp-2 min-h-[2.6em] text-sm leading-[1.3] font-bold sm:text-[17px] sm:leading-[1.35]">
        <NuxtLink
          :to="productUrl"
          :title="product.name"
          class="relative z-10 text-foreground transition-colors hover:text-serag-night dark:hover:text-serag-gold-hi"
        >
          {{ product.name }}
        </NuxtLink>
      </h3>

      <div class="mt-auto pt-2.5 sm:pt-3">
        <StoreProductPrice
          :price="product.price"
          :old-price="product.oldPrice"
          :flash="product.flash"
          countdown-variant="compact"
        />
        <p v-if="savings" class="mt-0.5 text-[11px] font-bold text-[#15803D] sm:text-[13px]">
          {{ t('store.product.save', { amount: savings }) }}
        </p>
        <p
          v-if="leadTime"
          class="mt-1 flex items-center gap-1 text-[11px] font-semibold text-blue-800 sm:text-xs dark:text-blue-300"
        >
          <Truck class="size-3.5 shrink-0" aria-hidden="true" />
          <span class="line-clamp-1">{{ leadTime }}</span>
        </p>
      </div>

      <!-- Actions: one row, add to cart (or notify me) plus a WhatsApp icon button -->
      <div v-if="showAddToCart" class="mt-2.5 flex items-stretch gap-1.5 sm:mt-3.5 sm:gap-2">
        <StoreProductAddToCart v-if="isOrderable" :product="product" class="flex-1" />
        <NuxtLink
          v-else
          :to="`${productUrl}#notify-me-form`"
          class="relative z-10 inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-serag-gold/70 bg-serag-cream px-2 text-xs font-bold text-serag-ink transition-colors hover:bg-serag-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-[52px] sm:rounded-2xl sm:text-[15px]"
        >
          <BellRing class="size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ t('store.product.notifyMe') }}</span>
        </NuxtLink>
        <a
          v-if="whatsappUrl"
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="t('store.product.askWhatsappAria', { name: product.name })"
          :title="t('store.productPage.askWhatsapp')"
          class="relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-[#CFE7D6] bg-[#F1FAF3] text-[#15803D] transition-colors hover:border-[#16A34A] hover:bg-[#16A34A] hover:text-white focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:outline-none sm:size-[52px] sm:rounded-2xl"
        >
          <MessageCircle class="size-[18px] sm:size-[22px]" aria-hidden="true" />
        </a>
      </div>
    </div>
  </article>
</template>
