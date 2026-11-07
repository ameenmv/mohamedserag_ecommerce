<script setup lang="ts">
import { ChevronLeft, ChevronRight, Maximize2 } from '@lucide/vue'
import type { ProductDetailImage } from '@serag/shared'
import { swipeStep, wrapIndex } from '~/utils/product-gallery'

const props = defineProps<{
  images: ProductDetailImage[]
  productName: string
  categorySlug?: string
}>()

const { t, locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')

const currentIndex = ref(0)
const isLightboxOpen = ref(false)
const mainViewportRef = ref<HTMLElement | null>(null)
const thumbnailRefs = ref<HTMLElement[]>([])

watch(
  () => props.images,
  (newImages) => {
    if (currentIndex.value >= newImages.length) {
      currentIndex.value = 0
    }
  },
)

const currentImage = computed(
  () => props.images[currentIndex.value] ?? props.images[0] ?? null,
)
const hasMultiple = computed(() => props.images.length > 1)

function prev(): void {
  if (props.images.length === 0) return
  currentIndex.value = wrapIndex(currentIndex.value - 1, props.images.length)
}

function next(): void {
  if (props.images.length === 0) return
  currentIndex.value = wrapIndex(currentIndex.value + 1, props.images.length)
}

function openLightbox(): void {
  isLightboxOpen.value = true
}

// Pointer events for swipe & tap on main image
let pointerStartX = 0
let pointerStartY = 0
let pointerMoved = false
let isPointerDown = false

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0 && e.pointerType === 'mouse') return
  isPointerDown = true
  pointerMoved = false
  pointerStartX = e.clientX
  pointerStartY = e.clientY
}

function onPointerMove(e: PointerEvent): void {
  if (!isPointerDown) return
  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
    pointerMoved = true
  }
}

function onPointerUp(e: PointerEvent): void {
  if (!isPointerDown) return
  isPointerDown = false

  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY

  if (pointerMoved && Math.abs(dx) > Math.abs(dy)) {
    const step = swipeStep(dx, isRtl.value, 40)
    if (step === 1) {
      next()
      return
    } else if (step === -1) {
      prev()
      return
    }
  }

  // If user tapped without dragging, open lightbox
  if (!pointerMoved) {
    openLightbox()
  }
}

function setThumbnailRef(el: unknown, idx: number): void {
  if (el instanceof HTMLElement) {
    thumbnailRefs.value[idx] = el
  }
}

function onThumbnailKeydown(currentIndexPosition: number, direction: 1 | -1): void {
  const step = isRtl.value ? -direction : direction
  const targetIndex = wrapIndex(currentIndexPosition + step, props.images.length)
  currentIndex.value = targetIndex
  nextTick(() => {
    thumbnailRefs.value[targetIndex]?.focus()
  })
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Main image viewport -->
    <div
      ref="mainViewportRef"
      data-fly-source
      role="button"
      tabindex="0"
      :aria-label="t('store.productPage.gallery.openLightboxAria', { name: productName })"
      class="group relative flex aspect-square w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-[28px] border border-border bg-serag-cream p-4 select-none touch-pan-y sm:p-8 dark:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown.enter.prevent="openLightbox"
      @keydown.space.prevent="openLightbox"
    >
      <!-- NuxtImg with explicit width/height and LCP prioritization on first image -->
      <NuxtImg
        v-if="currentImage?.url"
        :key="currentImage.url"
        :src="currentImage.url"
        :alt="currentImage.alt || productName"
        width="600"
        height="600"
        :loading="currentIndex === 0 ? 'eager' : 'lazy'"
        :fetchpriority="currentIndex === 0 ? 'high' : 'auto'"
        class="img-swap size-full object-contain transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        draggable="false"
      />

      <!-- Neutral placeholder when images are missing -->
      <div
        v-else
        class="flex size-full items-center justify-center text-serag-green"
        aria-hidden="true"
      >
        <StoreCategoryIcon :slug="categorySlug ?? ''" class="size-40 sm:size-56" stroke-width="1.1" />
      </div>

      <!-- Image counter chip "2 / 5" when > 1 image -->
      <span
        v-if="hasMultiple"
        class="num absolute top-3 start-3 z-10 rounded-lg bg-serag-night/85 px-2.5 py-1 text-xs font-bold text-serag-gold-hi backdrop-blur-xs"
      >
        {{ currentIndex + 1 }} / {{ images.length }}
      </span>

      <!-- Corner expand button (44px target) -->
      <button
        type="button"
        :aria-label="t('store.productPage.gallery.expandAria')"
        class="absolute top-3 end-3 z-10 inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm backdrop-blur-xs transition-colors hover:border-serag-gold hover:bg-background hover:text-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @pointerdown.stop
        @click.stop="openLightbox"
      >
        <Maximize2 class="size-4.5" aria-hidden="true" />
      </button>

      <!-- Real showroom photo chip -->
      <span
        v-if="currentImage?.isReal"
        class="absolute bottom-3 start-3 z-10 rounded-lg bg-serag-night/85 px-2.5 py-1 text-xs font-bold text-serag-gold-hi backdrop-blur-xs"
      >
        {{ t('store.productPage.gallery.realPhoto') }}
      </span>

      <!-- Prev / Next navigation buttons -->
      <div
        v-if="hasMultiple"
        class="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 items-center justify-between"
      >
        <button
          type="button"
          :aria-label="t('store.productPage.gallery.prev')"
          class="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm backdrop-blur-xs transition-colors hover:border-serag-gold hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @pointerdown.stop
          @click.stop="prev"
        >
          <ChevronRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>

        <button
          type="button"
          :aria-label="t('store.productPage.gallery.next')"
          class="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm backdrop-blur-xs transition-colors hover:border-serag-gold hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @pointerdown.stop
          @click.stop="next"
        >
          <ChevronLeft class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Dots under image on mobile (< 640px) -->
    <div
      v-if="hasMultiple"
      class="mt-3 flex sm:hidden items-center justify-center gap-1.5"
      role="tablist"
      :aria-label="productName"
    >
      <button
        v-for="(_, idx) in images"
        :key="idx"
        type="button"
        role="tab"
        :aria-selected="idx === currentIndex"
        :aria-label="
          t('store.productPage.gallery.thumbnailAria', {
            index: idx + 1,
            name: productName,
          })
        "
        class="flex min-h-11 min-w-4 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="currentIndex = idx"
      >
        <span
          :class="[
            'h-2 rounded-full transition-all duration-300',
            idx === currentIndex ? 'w-6 bg-serag-gold' : 'w-2 bg-border hover:bg-muted-foreground',
          ]"
        />
      </button>
    </div>

    <!-- Thumbnail Strip on desktop (>= 640px) with keyboard arrow navigation -->
    <div
      v-if="hasMultiple"
      class="mt-3 hidden sm:flex flex-wrap gap-2 sm:mt-4 sm:gap-3"
      role="group"
      :aria-label="productName"
    >
      <button
        v-for="(img, idx) in images"
        :key="img.id || idx"
        :ref="(el) => setThumbnailRef(el, idx)"
        type="button"
        :aria-current="idx === currentIndex ? 'true' : undefined"
        :aria-label="
          t('store.productPage.gallery.thumbnailAria', {
            index: idx + 1,
            name: productName,
          })
        "
        :class="[
          'relative size-16 sm:size-20 min-h-11 min-w-11 rounded-2xl overflow-hidden border-2 p-1.5 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          idx === currentIndex
            ? 'border-serag-gold bg-background shadow-xs ring-2 ring-serag-gold/40'
            : 'border-border/80 bg-serag-ivory/40 hover:border-serag-gold/50 dark:bg-muted/20',
        ]"
        @click="currentIndex = idx"
        @keydown.right.prevent="onThumbnailKeydown(idx, 1)"
        @keydown.left.prevent="onThumbnailKeydown(idx, -1)"
      >
        <NuxtImg
          :src="img.url"
          :alt="img.alt || productName"
          width="80"
          height="80"
          class="size-full object-contain"
        />
      </button>
    </div>

    <!-- Full-screen Lightbox: lazy loaded chunk -->
    <LazyStoreProductPageLightbox
      v-if="isLightboxOpen"
      v-model:open="isLightboxOpen"
      :images="images"
      :product-name="productName"
      :initial-index="currentIndex"
      :opener-element="mainViewportRef"
    />
  </div>
</template>
