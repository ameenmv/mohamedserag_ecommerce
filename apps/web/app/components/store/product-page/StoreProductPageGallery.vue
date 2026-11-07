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
const openerRect = ref<DOMRect | null>(null)
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
  if (mainViewportRef.value && typeof window !== 'undefined') {
    openerRect.value = mainViewportRef.value.getBoundingClientRect()
  }
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

function onViewportKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    // ArrowRight goes visually right: prev in RTL, next in LTR
    if (isRtl.value) {
      prev()
    } else {
      next()
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    // ArrowLeft goes visually left: next in RTL, prev in LTR
    if (isRtl.value) {
      next()
    } else {
      prev()
    }
  }
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Main image viewport with cursor zoom-in, logical layout and keyboard nav -->
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
      @keydown="onViewportKeydown"
    >
      <!-- Crossfade transition between images -->
      <Transition name="gallery-crossfade" mode="out-in">
        <NuxtImg
          v-if="currentImage?.url"
          :key="currentImage.url"
          :src="currentImage.url"
          :alt="currentImage.alt || productName"
          width="600"
          height="600"
          :loading="currentIndex === 0 ? 'eager' : 'lazy'"
          :fetchpriority="currentIndex === 0 ? 'high' : 'auto'"
          class="size-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
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
      </Transition>

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

      <!-- Prev / Next navigation buttons: previous sits on start side pointing start; next sits on end side pointing end -->
      <div
        v-if="hasMultiple"
        class="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between"
      >
        <!-- Previous (inline-start edge): ChevronLeft points to start; flipped in RTL -->
        <button
          type="button"
          :aria-label="t('store.productPage.gallery.prev')"
          class="pointer-events-auto inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm backdrop-blur-xs opacity-0 transition-all duration-200 group-hover:opacity-100 hover:border-serag-gold hover:text-serag-gold focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @pointerdown.stop
          @click.stop="prev"
        >
          <ChevronLeft class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>

        <!-- Next (inline-end edge): ChevronRight points to end; flipped in RTL -->
        <button
          type="button"
          :aria-label="t('store.productPage.gallery.next')"
          class="pointer-events-auto inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm backdrop-blur-xs opacity-0 transition-all duration-200 group-hover:opacity-100 hover:border-serag-gold hover:text-serag-gold focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @pointerdown.stop
          @click.stop="next"
        >
          <ChevronRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
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
          class="size-full object-contain mix-blend-multiply dark:mix-blend-normal"
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
      :opener-rect="openerRect"
    />
  </div>
</template>

<style scoped>
.gallery-crossfade-enter-active,
.gallery-crossfade-leave-active {
  transition: opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.gallery-crossfade-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.gallery-crossfade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

@media (prefers-reduced-motion: reduce) {
  .gallery-crossfade-enter-active,
  .gallery-crossfade-leave-active {
    transition: none !important;
    transform: none !important;
  }
}
</style>
