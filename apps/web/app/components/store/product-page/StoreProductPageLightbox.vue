<script setup lang="ts">
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from '@lucide/vue'
import type { ProductDetailImage } from '@serag/shared'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  clampPan,
  clampZoom,
  swipeStep,
  wrapIndex,
  type PanOffset,
} from '~/utils/product-gallery'

const props = withDefaults(
  defineProps<{
    images: ProductDetailImage[]
    productName: string
    initialIndex?: number
    openerElement?: HTMLElement | null
  }>(),
  {
    initialIndex: 0,
    openerElement: null,
  },
)

const open = defineModel<boolean>('open', { default: false })

const { t, locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')

const currentIndex = ref(wrapIndex(props.initialIndex, props.images.length))
const scale = ref(1)
const pan = ref<PanOffset>({ x: 0, y: 0 })
const isPanning = ref(false)

const viewportRef = ref<HTMLElement | null>(null)
const imageWrapperRef = ref<HTMLElement | null>(null)

const currentImage = computed(
  () => props.images[currentIndex.value] ?? props.images[0] ?? null,
)
const hasMultiple = computed(() => props.images.length > 1)

// Reduced motion detection
const isReducedMotion = ref(false)

function preloadNeighbours(index: number): void {
  if (!import.meta.client || props.images.length <= 1) return
  const prevIdx = wrapIndex(index - 1, props.images.length)
  const nextIdx = wrapIndex(index + 1, props.images.length)
  const prevUrl = props.images[prevIdx]?.url
  const nextUrl = props.images[nextIdx]?.url

  if (prevUrl) {
    const img = new Image()
    img.src = prevUrl
  }
  if (nextUrl) {
    const img = new Image()
    img.src = nextUrl
  }
}

function goTo(index: number): void {
  currentIndex.value = wrapIndex(index, props.images.length)
  scale.value = 1
  pan.value = { x: 0, y: 0 }
  preloadNeighbours(currentIndex.value)
}

function next(): void {
  goTo(currentIndex.value + 1)
}

function prev(): void {
  goTo(currentIndex.value - 1)
}

function toggleZoomAt(clientX: number, clientY: number): void {
  if (scale.value > 1) {
    scale.value = 1
    pan.value = { x: 0, y: 0 }
    return
  }

  const container = viewportRef.value
  if (!container) {
    scale.value = 2
    return
  }

  const rect = container.getBoundingClientRect()
  const viewportW = rect.width
  const viewportH = rect.height
  const centerX = rect.left + viewportW / 2
  const centerY = rect.top + viewportH / 2

  const dx = clientX - centerX
  const dy = clientY - centerY

  const targetScale = 2
  const targetPan: PanOffset = {
    x: -dx * (targetScale - 1),
    y: -dy * (targetScale - 1),
  }

  const imgEl = imageWrapperRef.value
  const imgW = imgEl?.clientWidth || viewportW
  const imgH = imgEl?.clientHeight || viewportH

  scale.value = targetScale
  pan.value = clampPan(
    targetPan,
    targetScale,
    { width: viewportW, height: viewportH },
    { width: imgW, height: imgH },
  )
}

function toggleZoomButton(): void {
  if (scale.value > 1) {
    scale.value = 1
    pan.value = { x: 0, y: 0 }
  } else {
    const container = viewportRef.value
    const rect = container?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : 400
    const cy = rect ? rect.top + rect.height / 2 : 300
    toggleZoomAt(cx, cy)
  }
}

// Pointer drag & pan handling
let pointerStartX = 0
let pointerStartY = 0
let panStartX = 0
let panStartY = 0
let isPointerDown = false
let hasMoved = false

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0 && e.pointerType === 'mouse') return
  isPointerDown = true
  hasMoved = false
  pointerStartX = e.clientX
  pointerStartY = e.clientY
  panStartX = pan.value.x
  panStartY = pan.value.y

  if (scale.value > 1) {
    isPanning.value = true
  }
}

function onPointerMove(e: PointerEvent): void {
  if (!isPointerDown) return
  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY

  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
    hasMoved = true
  }

  if (scale.value > 1 && isPanning.value) {
    const container = viewportRef.value
    const imgEl = imageWrapperRef.value
    const viewportW = container?.clientWidth || 800
    const viewportH = container?.clientHeight || 600
    const imgW = imgEl?.clientWidth || viewportW
    const imgH = imgEl?.clientHeight || viewportH

    const newPan: PanOffset = {
      x: panStartX + dx,
      y: panStartY + dy,
    }

    pan.value = clampPan(
      newPan,
      scale.value,
      { width: viewportW, height: viewportH },
      { width: imgW, height: imgH },
    )
  }
}

function onPointerUp(e: PointerEvent): void {
  if (!isPointerDown) return
  isPointerDown = false
  isPanning.value = false

  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY

  // If at scale 1 and user swiped horizontally, navigate images
  if (scale.value === 1 && hasMoved && Math.abs(dx) > Math.abs(dy)) {
    const step = swipeStep(dx, isRtl.value, 40)
    if (step === 1) next()
    else if (step === -1) prev()
  }
}

// Pinch to zoom on touch
let initialPinchDist = 0
let initialPinchScale = 1
let isPinching = false

// Double-tap tracking on touch
let lastTapTime = 0
let lastTapX = 0
let lastTapY = 0

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length === 2) {
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    if (t1 && t2) {
      isPinching = true
      initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      initialPinchScale = scale.value
    }
  }
}

function onTouchMove(e: TouchEvent): void {
  if (isPinching && e.touches.length === 2) {
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    if (t1 && t2 && initialPinchDist > 0) {
      e.preventDefault()
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const factor = currentDist / initialPinchDist
      const newScale = clampZoom(initialPinchScale * factor, 1, 3)
      scale.value = newScale

      if (newScale <= 1) {
        pan.value = { x: 0, y: 0 }
      } else {
        const container = viewportRef.value
        const imgEl = imageWrapperRef.value
        const viewportW = container?.clientWidth || 800
        const viewportH = container?.clientHeight || 600
        const imgW = imgEl?.clientWidth || viewportW
        const imgH = imgEl?.clientHeight || viewportH

        pan.value = clampPan(
          pan.value,
          newScale,
          { width: viewportW, height: viewportH },
          { width: imgW, height: imgH },
        )
      }
    }
  }
}

function onTouchEnd(e: TouchEvent): void {
  if (isPinching && e.touches.length < 2) {
    isPinching = false
    if (scale.value <= 1.05) {
      scale.value = 1
      pan.value = { x: 0, y: 0 }
    }
  }

  // Handle double-tap
  if (e.touches.length === 0 && !hasMoved && !isPinching) {
    const now = Date.now()
    const changed = e.changedTouches[0]
    if (changed) {
      const dt = now - lastTapTime
      const dist = Math.hypot(changed.clientX - lastTapX, changed.clientY - lastTapY)
      if (dt < 300 && dist < 30) {
        toggleZoomAt(changed.clientX, changed.clientY)
        lastTapTime = 0
      } else {
        lastTapTime = now
        lastTapX = changed.clientX
        lastTapY = changed.clientY
      }
    }
  }
}

function onDoubleClick(e: MouseEvent): void {
  toggleZoomAt(e.clientX, e.clientY)
}

function handleKeydown(e: KeyboardEvent): void {
  if (!open.value) return

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (isRtl.value) {
      prev()
    } else {
      next()
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (isRtl.value) {
      next()
    } else {
      prev()
    }
  }
}

watch(open, (isOpen, wasOpen) => {
  if (isOpen) {
    currentIndex.value = wrapIndex(props.initialIndex, props.images.length)
    scale.value = 1
    pan.value = { x: 0, y: 0 }
    preloadNeighbours(currentIndex.value)
  } else if (wasOpen && props.openerElement) {
    nextTick(() => {
      props.openerElement?.focus?.()
    })
  }
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    isReducedMotion.value = mq.matches
    mq.addEventListener?.('change', (e) => {
      isReducedMotion.value = e.matches
    })
    window.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="fixed inset-0 top-0 left-0 z-50 flex h-dvh w-screen max-w-none sm:max-w-none flex-col justify-between overflow-hidden rounded-none border-0 bg-serag-night/95 p-4 sm:p-6 text-serag-ivory shadow-2xl backdrop-blur-md translate-x-0 translate-y-0"
    >
      <DialogDescription class="sr-only">
        {{ productName }}
      </DialogDescription>

      <!-- Top bar: product name, counter, zoom toggle, and close -->
      <div class="z-20 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div class="flex items-center gap-3 min-w-0">
          <DialogTitle class="truncate text-sm sm:text-base font-bold text-serag-ivory">
            {{ productName }}
          </DialogTitle>
          <span
            v-if="hasMultiple"
            class="num shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-serag-gold-hi"
          >
            {{ currentIndex + 1 }} / {{ images.length }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Zoom toggle button -->
          <button
            type="button"
            :aria-label="scale > 1 ? t('store.productPage.gallery.zoomOut') : t('store.productPage.gallery.zoomIn')"
            class="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 text-serag-ivory transition-colors hover:bg-white/20 hover:text-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold"
            @click="toggleZoomButton"
          >
            <ZoomOut v-if="scale > 1" class="size-5" aria-hidden="true" />
            <ZoomIn v-else class="size-5" aria-hidden="true" />
          </button>

          <!-- Close button -->
          <DialogClose
            as-child
          >
            <button
              type="button"
              :aria-label="t('store.productPage.gallery.closeLightbox')"
              class="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 text-serag-ivory transition-colors hover:bg-white/20 hover:text-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold"
              @click="open = false"
            >
              <X class="size-5" aria-hidden="true" />
            </button>
          </DialogClose>
        </div>
      </div>

      <!-- Main image viewport with zoom & pan & swipe -->
      <div
        ref="viewportRef"
        class="relative flex flex-1 items-center justify-center overflow-hidden select-none touch-none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @dblclick="onDoubleClick"
      >
        <div
          ref="imageWrapperRef"
          :style="{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transformOrigin: 'center center',
          }"
          :class="[
            'flex items-center justify-center max-h-[calc(100dvh-170px)] max-w-full select-none will-change-transform',
            isReducedMotion || isPanning ? 'transition-none' : 'transition-transform duration-200 ease-out',
            scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
          ]"
        >
          <NuxtImg
            v-if="currentImage?.url"
            :key="currentImage.url"
            :src="currentImage.url"
            :alt="currentImage.alt || productName"
            width="1200"
            height="1200"
            class="max-h-[calc(100dvh-170px)] max-w-full object-contain select-none pointer-events-none"
            draggable="false"
          />
        </div>

        <!-- Prev button -->
        <button
          v-if="hasMultiple"
          type="button"
          :aria-label="t('store.productPage.gallery.prev')"
          class="absolute start-2 sm:start-4 top-1/2 -translate-y-1/2 z-20 inline-flex size-12 min-h-11 min-w-11 items-center justify-center rounded-full bg-serag-night/80 text-serag-ivory backdrop-blur-xs border border-white/15 shadow-xl hover:bg-serag-night hover:text-serag-gold hover:border-serag-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold transition-colors"
          @click.stop="prev"
        >
          <ChevronRight class="size-6 rtl:-scale-x-100" aria-hidden="true" />
        </button>

        <!-- Next button -->
        <button
          v-if="hasMultiple"
          type="button"
          :aria-label="t('store.productPage.gallery.next')"
          class="absolute end-2 sm:end-4 top-1/2 -translate-y-1/2 z-20 inline-flex size-12 min-h-11 min-w-11 items-center justify-center rounded-full bg-serag-night/80 text-serag-ivory backdrop-blur-xs border border-white/15 shadow-xl hover:bg-serag-night hover:text-serag-gold hover:border-serag-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold transition-colors"
          @click.stop="next"
        >
          <ChevronLeft class="size-6 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </div>

      <!-- Bottom bar: thumbnails on >= 640px, dots below 640px -->
      <div v-if="hasMultiple" class="z-20 pt-3 border-t border-white/10">
        <!-- Thumbnails on >= 640px -->
        <div
          class="hidden sm:flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-full"
          role="tablist"
          :aria-label="productName"
        >
          <button
            v-for="(img, idx) in images"
            :key="img.id || idx"
            type="button"
            role="tab"
            :aria-selected="idx === currentIndex"
            :aria-label="
              t('store.productPage.gallery.thumbnailAria', {
                index: idx + 1,
                name: productName,
              })
            "
            :class="[
              'size-14 min-h-11 min-w-11 rounded-xl overflow-hidden border-2 p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold shrink-0',
              idx === currentIndex
                ? 'border-serag-gold ring-2 ring-serag-gold/40 bg-serag-night'
                : 'border-white/20 bg-serag-night/60 hover:border-serag-gold/50 opacity-60 hover:opacity-100',
            ]"
            @click="goTo(idx)"
          >
            <NuxtImg
              :src="img.url"
              :alt="img.alt || productName"
              width="56"
              height="56"
              class="size-full object-contain"
            />
          </button>
        </div>

        <!-- Dots on < 640px -->
        <div
          class="flex sm:hidden items-center justify-center gap-1.5 py-1"
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
            class="flex min-h-11 min-w-4 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold"
            @click="goTo(idx)"
          >
            <span
              :class="[
                'h-2 rounded-full transition-all duration-300',
                idx === currentIndex ? 'w-6 bg-serag-gold' : 'w-2 bg-white/40',
              ]"
            />
          </button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
