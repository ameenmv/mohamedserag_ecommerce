<script setup lang="ts">
import { MessageCircle, Minus, Plus, ShoppingCart, Sparkles } from '@lucide/vue'
import {
  DEFAULT_TEMPLATES,
  renderTemplate,
  waLink,
  type ProductDetail,
} from '@serag/shared'
import { toProductCard } from '~/utils/product-card-mapper'
import StoreProductPageBridalButton from './StoreProductPageBridalButton.vue'

const props = defineProps<{
  product: ProductDetail
}>()

const emit = defineEmits<{
  (e: 'flashEnded'): void
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { format } = usePrice()
const { add } = useCart()
const settings = useStoreSettings()
const requestUrl = useRequestURL()
const { track } = useAnalytics()

const addToCartButton = ref<HTMLElement | null>(null)
defineExpose({ addToCartButton })

const card = computed(() => toProductCard(props.product))
const isOrderable = computed(() => props.product.availability.orderable)

// Quantity stepper: min 1, max = availability.maxQty if positive, else 10
const maxQty = computed(() => {
  const serverMax = props.product.availability.maxQty
  return serverMax !== null && serverMax !== undefined && serverMax > 0
    ? serverMax
    : 10
})

const qty = ref(1)

watch(maxQty, (limit) => {
  if (qty.value > limit) {
    qty.value = Math.max(1, limit)
  }
})

function decreaseQty(): void {
  if (qty.value > 1) {
    qty.value -= 1
  }
}

function increaseQty(): void {
  if (qty.value < maxQty.value) {
    qty.value += 1
  }
}

function handleAddToCart(): void {
  if (isOrderable.value && qty.value > 0) {
    add(card.value, qty.value)
  }
}

// Saving calculation: oldPrice - price
const savingText = computed(() => {
  if (
    props.product.oldPrice &&
    props.product.oldPrice > props.product.price
  ) {
    const diff = props.product.oldPrice - props.product.price
    return format(diff).formatted
  }
  return null
})

// WhatsApp link: waLink(settings.whatsapp, renderTemplate(DEFAULT_TEMPLATES.product_question, { productName, productUrl }))
const whatsappUrl = computed(() => {
  const text = renderTemplate(DEFAULT_TEMPLATES.product_question, {
    productName: props.product.name,
    productUrl: requestUrl.href,
  })
  return waLink(settings.whatsapp, text)
})

// Installment note when price >= installmentMinPrice
const showInstallment = computed(
  () => props.product.price >= settings.installmentMinPrice,
)
</script>

<template>
  <div
    class="flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-xs"
  >
    <!-- Brand link and model code -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <NuxtLink
        :to="localePath(`/b/${product.brand.slug}`)"
        class="inline-flex items-center rounded-full bg-serag-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-serag-gold hover:text-serag-gold-hi transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        :aria-label="t('store.productPage.brandLinkAria', { brand: product.brand.name })"
      >
        {{ product.brand.name }}
      </NuxtLink>

      <span class="num text-xs font-medium text-muted-foreground">
        {{ t('store.productPage.modelCode', { code: product.modelCode }) }}
      </span>
    </div>

    <!-- Product Title (h1) -->
    <h1 class="text-xl font-bold leading-snug text-foreground sm:text-2xl lg:text-3xl">
      {{ product.name }}
    </h1>

    <!-- Availability Badge -->
    <div class="flex items-center gap-2">
      <StoreProductAvailabilityBadge :availability="product.availability" />
    </div>

    <!-- Price Box & Savings -->
    <div class="rounded-2xl border border-border/80 bg-serag-ivory/40 p-4 dark:bg-muted/20">
      <div class="flex flex-col gap-1.5">
        <StoreProductPrice
          :price="product.price"
          :old-price="product.oldPrice"
          :discount-percent="product.discountPercent"
          :flash="product.flash"
          countdown-variant="detail"
          @flash-ended="emit('flashEnded')"
        />

        <div class="mt-1 flex flex-wrap items-center gap-2">
          <!-- Saving line «وفّر {amount}» -->
          <span
            v-if="savingText"
            class="num inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400"
          >
            {{ t('store.productPage.saving', { amount: savingText }) }}
          </span>

          <!-- VAT Label -->
          <span class="text-xs font-normal text-muted-foreground">
            {{ t('store.productPage.vatIncluded') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Installment banner if price >= threshold -->
    <div
      v-if="showInstallment"
      class="flex items-center gap-2 rounded-2xl border border-serag-gold/30 bg-serag-gold/10 px-3.5 py-2.5 text-xs font-bold text-serag-night dark:text-serag-gold-hi"
    >
      <Sparkles class="size-4 shrink-0 text-serag-gold" aria-hidden="true" />
      <span>{{ t('store.productPage.installmentAvailable') }}</span>
    </div>

    <!-- Purchase Actions: Stepper + Add to Cart + Wishlist/Compare -->
    <div class="flex flex-col gap-3">
      <!-- Orderable: Stepper + Add to Cart + Wishlist/Compare -->
      <div v-if="product.availability.state !== 'out'" class="flex flex-wrap items-center gap-2.5">
        <!-- Quantity stepper -->
        <div
          class="flex items-center rounded-xl border border-border bg-background p-1"
          role="group"
          :aria-label="t('store.productPage.quantity')"
        >
          <button
            type="button"
            :disabled="!isOrderable || qty <= 1"
            :aria-label="t('store.productPage.decreaseQty')"
            class="inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="decreaseQty"
          >
            <Minus class="size-4" aria-hidden="true" />
          </button>

          <span
            class="num min-w-9 text-center text-sm font-bold text-foreground"
            aria-live="polite"
            :aria-label="t('store.productPage.qtyAria', { count: qty })"
          >
            {{ qty }}
          </span>

          <button
            type="button"
            :disabled="!isOrderable || qty >= maxQty"
            :aria-label="t('store.productPage.increaseQty')"
            class="inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            @click="increaseQty"
          >
            <Plus class="size-4" aria-hidden="true" />
          </button>
        </div>

        <!-- Add to cart button -->
        <button
          id="main-add-to-cart-button"
          ref="addToCartButton"
          type="button"
          class="flex-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-serag-night px-5 text-sm font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night motion-reduce:transition-none"
          @click="handleAddToCart"
        >
          <ShoppingCart class="size-4.5 shrink-0 text-serag-gold-hi" aria-hidden="true" />
          <span>{{ t('store.product.addToCart') }}</span>
        </button>

        <!-- Wishlist & Compare Toggles -->
        <div class="flex items-center gap-1.5">
          <StoreProductWishlistToggle :product="card" />
          <StoreProductCompareToggle :product="card" />
        </div>
      </div>

      <!-- Out of Stock: Notify Me Form in place of disabled button + Wishlist/Compare toggles -->
      <div v-else class="flex flex-col gap-3">
        <div class="flex items-center justify-end gap-1.5">
          <StoreProductWishlistToggle :product="card" />
          <StoreProductCompareToggle :product="card" />
        </div>

        <div ref="addToCartButton">
          <StoreProductPageNotifyForm :product="product" />
        </div>
      </div>

      <!-- Add to Bridal List Button -->
      <StoreProductPageBridalButton :product="product" />

      <!-- WhatsApp Ask Button -->
      <a
        :href="whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 text-xs sm:text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
        @click="track('whatsapp_click', { source: 'product', slug: product.slug })"
      >
        <MessageCircle class="size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span>{{ t('store.productPage.askWhatsapp') }}</span>
      </a>
    </div>
  </div>
</template>
