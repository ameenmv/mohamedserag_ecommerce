<script setup lang="ts">
import { ArrowLeftRight, Check, X } from '@lucide/vue'
import type { ProductCard, ProductDetail } from '@serag/shared'
import { MAX_COMPARE_ITEMS } from '~/utils/compare'
import { toProductCard } from '~/utils/product-card-mapper'

const props = defineProps<{
  products: readonly ProductDetail[]
  topOffset?: number
}>()

const emit = defineEmits<{
  remove: [id: string]
  productAdded: [product: ProductCard]
}>()

const { t } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()

// Calculate dynamic offset from floating site header
const measuredHeaderHeight = ref(80)

onMounted(() => {
  const siteHeader = document.querySelector('header')
  if (siteHeader) {
    const update = () => {
      measuredHeaderHeight.value = Math.round(siteHeader.getBoundingClientRect().height)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(siteHeader)
    onUnmounted(() => observer.disconnect())
  }
})

const effectiveTopOffset = computed(() =>
  props.topOffset !== undefined ? props.topOffset : measuredHeaderHeight.value,
)

const stickyHeaderStyle = computed(() => ({
  top: `${effectiveTopOffset.value}px`,
}))

// Cheapest product calculation
const cheapestId = computed(() => {
  const prices = props.products.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0)
  if (prices.length < 2 || new Set(prices).size < 2) return null
  const min = Math.min(...prices)
  return props.products.find((p) => p.price === min)?.id ?? null
})

const minPrice = computed(() => {
  const prices = props.products.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0)
  if (prices.length < 2 || new Set(prices).size < 2) return null
  return Math.min(...prices)
})
</script>

<template>
  <thead>
    <tr>
      <!-- Corner Cell: Fixed at start column and sticky below header -->
      <th
        scope="col"
        :style="stickyHeaderStyle"
        class="sticky start-0 z-30 w-28 min-w-28 border-b border-e border-border bg-card/95 p-3.5 text-start align-bottom shadow-xs backdrop-blur-md sm:w-44 sm:min-w-44 sm:p-4"
      >
        <span class="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted-foreground sm:text-xs">
          <ArrowLeftRight class="size-3.5" aria-hidden="true" />
          {{ t('store.compare.productColumn') }}
        </span>
      </th>

      <!-- Product Columns -->
      <th
        v-for="product in products"
        :key="product.id"
        scope="col"
        :style="stickyHeaderStyle"
        class="sticky z-20 min-w-[170px] max-w-[280px] border-b border-e border-border bg-card/95 p-3 align-top font-normal shadow-xs backdrop-blur-md snap-start sm:min-w-[220px] sm:p-4"
      >
        <div class="flex flex-col gap-2.5 sm:gap-3">
          <!-- Image and Badges -->
          <div class="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-secondary/60 p-2.5 sm:p-3">
            <NuxtLink
              :to="localePath(`/p/${product.slug}`)"
              class="flex size-full items-center justify-center"
              :aria-label="t('store.compare.viewProduct', { name: product.name })"
              tabindex="-1"
            >
              <NuxtImg
                v-if="product.image?.url"
                :src="product.image.url"
                :alt="product.image.alt || product.name"
                width="240"
                height="180"
                class="size-full object-contain transition-transform duration-300 hover:scale-105 motion-reduce:transition-none"
              />
            </NuxtLink>

            <!-- Cheapest badge -->
            <span
              v-if="cheapestId === product.id"
              class="absolute top-2 start-2 inline-flex items-center gap-1 rounded-full bg-serag-gold px-2.5 py-0.5 text-[11px] font-bold text-serag-night shadow-xs"
            >
              <Check class="size-3 stroke-[2.5]" aria-hidden="true" />
              {{ t('store.compare.cheapest') }}
            </span>

            <!-- Remove Button -->
            <button
              type="button"
              class="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
              :aria-label="t('store.compare.removeAria', { name: product.name })"
              @click="emit('remove', product.id)"
            >
              <X class="size-4" aria-hidden="true" />
            </button>
          </div>

          <!-- Brand & Name -->
          <div>
            <span class="text-[11px] font-bold tracking-wider text-serag-gold-ink uppercase dark:text-serag-gold-hi">
              {{ product.brand.name }}
            </span>
            <h2 class="mt-0.5 line-clamp-2 min-h-[2.6em] text-xs font-bold leading-snug sm:text-sm">
              <NuxtLink
                :to="localePath(`/p/${product.slug}`)"
                class="text-foreground transition-colors hover:text-primary"
              >
                {{ product.name }}
              </NuxtLink>
            </h2>
          </div>

          <!-- Pricing & Difference line under more expensive product -->
          <div class="space-y-1">
            <StoreProductPrice
              :price="product.price"
              :old-price="product.oldPrice"
              :discount-percent="product.discountPercent"
              :flash="product.flash"
            />
            <div
              v-if="minPrice !== null && product.price > minPrice"
              class="text-[11px] font-bold text-muted-foreground"
            >
              <span class="num inline-block rounded-md bg-secondary/80 px-1.5 py-0.5 text-muted-foreground">
                +{{ money(product.price - minPrice) }}
              </span>
            </div>
          </div>

          <!-- Add to cart -->
          <StoreProductAddToCart :product="toProductCard(product)" />
        </div>
      </th>

      <!-- Free slot column with search suggestions -->
      <th
        v-if="products.length < MAX_COMPARE_ITEMS"
        scope="col"
        :style="stickyHeaderStyle"
        class="sticky z-20 min-w-[200px] max-w-[300px] border-b border-border bg-card/95 p-3 align-top font-normal shadow-xs backdrop-blur-md snap-start sm:min-w-[240px] sm:p-4"
      >
        <StoreCompareAddSlot
          :category-slug="products[0]?.category.slug"
          :category-name="products[0]?.category.name"
          @added="emit('productAdded', $event)"
        />
      </th>
    </tr>
  </thead>
</template>
