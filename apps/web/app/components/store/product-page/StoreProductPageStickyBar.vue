<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { BellRing, ShoppingCart } from '@lucide/vue'
import type { ProductDetail } from '@serag/shared'
import { toProductCard } from '~/utils/product-card-mapper'

const props = defineProps<{
  product: ProductDetail
  targetRef?: HTMLElement | null
}>()

const { t } = useI18n()
const { add } = useCart()
const isVisible = ref(false)

const card = computed(() => toProductCard(props.product))
const isOrderable = computed(() => props.product.availability.orderable)

if (import.meta.client) {
  const observeTarget = computed(() => {
    if (props.targetRef) return props.targetRef
    return document.getElementById('main-add-to-cart-button') || document.getElementById('notify-me-form')
  })

  useIntersectionObserver(
    observeTarget,
    ([entry]) => {
      // Appears only after the main add-to-cart button scrolls out of view above the viewport
      if (entry) isVisible.value = !entry.isIntersecting && entry.boundingClientRect.top < 0
    },
    { threshold: 0.1 },
  )
}

function handleAddToCart(): void {
  if (isOrderable.value) {
    add(card.value, 1)
  }
}

function scrollToNotifyForm(): void {
  if (import.meta.client) {
    const el = document.getElementById('notify-me-form')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    const nameInput = document.getElementById('notify-name') as HTMLInputElement | null
    nameInput?.focus()
  }
}
</script>

<template>
  <aside
    v-show="isVisible"
    :aria-label="product.name"
    class="fixed inset-x-0 z-30 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur-md transition-all duration-200 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:bottom-0 md:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:hidden"
  >
    <div class="mx-auto flex max-w-lg items-center justify-between gap-3">
      <!-- Thumbnail & Price info -->
      <div class="flex min-w-0 items-center gap-2.5">
        <NuxtImg
          v-if="card.image?.url"
          :src="card.image.url"
          :alt="card.image.alt || product.name"
          width="44"
          height="44"
          class="size-11 shrink-0 rounded-xl object-contain bg-serag-ivory/60 p-1 border border-border/80 dark:bg-muted/30"
        />
        <div class="min-w-0 flex flex-col">
          <span class="truncate text-xs font-bold text-foreground">
            {{ product.name }}
          </span>
          <StoreProductPrice
            :price="product.price"
            :old-price="product.oldPrice"
            :flash="product.flash"
          />
        </div>
      </div>

      <!-- Add to Cart CTA -->
      <div class="shrink-0">
        <button
          v-if="isOrderable"
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-serag-night px-4 text-xs font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night"
          :aria-label="t('store.productPage.stickyBar.addToCartAria', { name: product.name })"
          @click="handleAddToCart"
        >
          <ShoppingCart class="size-4 shrink-0 text-serag-gold-hi" aria-hidden="true" />
          <span>{{ t('store.product.addToCart') }}</span>
        </button>

        <button
          v-else-if="product.availability.state === 'out'"
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-serag-night px-4 text-xs font-bold text-serag-ivory shadow-xs transition-colors hover:bg-serag-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-serag-green dark:hover:bg-serag-night cursor-pointer"
          :aria-label="t('store.notifyMe.stickyButtonAria', { name: product.name })"
          @click="scrollToNotifyForm"
        >
          <BellRing class="size-4 shrink-0 text-serag-gold-hi" aria-hidden="true" />
          <span>{{ t('store.notifyMe.stickyButton') }}</span>
        </button>

        <button
          v-else
          type="button"
          disabled
          aria-disabled="true"
          class="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-muted/70 px-4 text-xs font-bold text-muted-foreground"
        >
          <span>{{ t('store.product.outOfStock') }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>
