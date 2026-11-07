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
  applyRubberBand,
  calculateCloseDragProgress,
  calculateSnapTarget,
  clampPan,
  clampZoom,
  wrapIndex,
  type PanOffset,
} from '~/utils/product-gallery'

const props = withDefaults(
  defineProps<{
    images: ProductDetailImage[]
    productName: string
    initialIndex?: number
    openerElement?: HTMLElement | null
    openerRect?: DOMRect | { top: number; left: number; width: number; height: number } | null
  }>(),
  {
    initialIndex: 0,
    openerElement: null,
    openerRect: null,
  },
)

const open = defineModel<boolean>('open', { default: false })

const { t, locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')

const currentIndex = ref(wrapIndex(props.initialIndex, props.images.length))
const scale = ref(1)
const pan = ref<PanOffset>({ x: 0, y: 0 })

const viewportRef = ref<HTMLElement | null>(null)
const activeImageContainerRef = ref<HTMLElement | null>(null)

const hasMultiple = computed(() => props.images.length > 1)

// Reduced motion detection
const isReducedMotion = ref(false)

// Track image load states for 12px blur fade-in
const loadedUrls = ref<Record<string, boolean>>({})

function onImageLoad(url: string): void {
  loadedUrls.value[url] = true
}

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

// FLIP zoom open transition
const isOpeningFlip = ref(false)
const flipTransform = ref('')
const isClosing = ref(false)
const closeTransform = ref('')
const closeOpacity = ref(1)

function startOpenFlip(): void {
  if (isReducedMotion.value || !props.openerRect || !import.meta.client) return

  const opener = props.openerRect
  nextTick(() => {
    const container = viewportRef.value
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const targetCenterX = rect.left + rect.width / 2
    const targetCenterY = rect.top + rect.height / 2
    const openerCenterX = opener.left + opener.width / 2
    const openerCenterY = opener.top + opener.height / 2

    const dx = openerCenterX - targetCenterX
    const dy = openerCenterY - targetCenterY
    const targetSize = Math.max(1, Math.min(rect.width * 0.8, rect.height * 0.8))
    const openerSize = Math.max(opener.width, opener.height)
    const initialScale = Math.max(0.1, Math.min(1, openerSize / targetSize))

    isOpeningFlip.value = true
    flipTransform.value = `translate3d(${dx}px, ${dy}px, 0) scale(${initialScale})`

    // Play FLIP animation to fitted center
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flipTransform.value = 'translate3d(0, 0, 0) scale(1)'
        setTimeout(() => {
          isOpeningFlip.value = false
          flipTransform.value = ''
        }, 320)
      })
    })
  })
}

function closeLightbox(): void {
  if (isReducedMotion.value || !import.meta.client) {
    open.value = false
    return
  }

  // Reverse FLIP towards opener element if visible, else smooth fade
  if (props.openerElement && viewportRef.value) {
    const openerRect = props.openerElement.getBoundingClientRect()
    if (openerRect.width > 0 && openerRect.height > 0) {
      const rect = viewportRef.value.getBoundingClientRect()
      const targetCenterX = rect.left + rect.width / 2
      const targetCenterY = rect.top + rect.height / 2
      const openerCenterX = openerRect.left + openerRect.width / 2
      const openerCenterY = openerRect.top + openerRect.height / 2

      const dx = openerCenterX - targetCenterX
      const dy = openerCenterY - targetCenterY
      const targetSize = Math.max(1, Math.min(rect.width * 0.8, rect.height * 0.8))
      const openerSize = Math.max(openerRect.width, openerRect.height)
      const targetScale = Math.max(0.1, Math.min(1, openerSize / targetSize))

      isClosing.value = true
      closeTransform.value = `translate3d(${dx}px, ${dy}px, 0) scale(${targetScale})`
      closeOpacity.value = 0

      setTimeout(() => {
        open.value = false
        isClosing.value = false
        closeTransform.value = ''
        closeOpacity.value = 1
      }, 280)
      return
    }
  }

  isClosing.value = true
  closeOpacity.value = 0
  setTimeout(() => {
    open.value = false
    isClosing.value = false
    closeOpacity.value = 1
  }, 200)
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

// Desktop zoom & mouse pan follow (Zara / SSENSE style)
function updatePanFromMouse(clientX: number, clientY: number): void {
  const container = viewportRef.value
  if (!container || scale.value <= 1) return
  const rect = container.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const ratioX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const ratioY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))

  const maxPanX = (rect.width * scale.value - rect.width) / 2
  const maxPanY = (rect.height * scale.value - rect.height) / 2

  // Inverted: mouse moves right -> pan image left to reveal right content
  const targetX = (0.5 - ratioX) * 2 * maxPanX
  const targetY = (0.5 - ratioY) * 2 * maxPanY

  pan.value = { x: targetX, y: targetY }
}

function toggleDesktopZoom(clientX?: number, clientY?: number): void {
  if (scale.value > 1) {
    scale.value = 1
    pan.value = { x: 0, y: 0 }
    return
  }

  scale.value = 2.2
  const container = viewportRef.value
  if (!container) return

  const rect = container.getBoundingClientRect()
  const cx = clientX ?? (rect.left + rect.width / 2)
  const cy = clientY ?? (rect.top + rect.height / 2)
  updatePanFromMouse(cx, cy)
}

function toggleZoomButton(): void {
  toggleDesktopZoom()
}

// Pointer & Touch gesture state
let pointerStartX = 0
let pointerStartY = 0
let pointerStartTime = 0
let lastPointerX = 0
let lastPointerTime = 0
let pointerVelocityX = 0
let isPointerDown = false
let gestureLocked: 'horizontal' | 'vertical' | 'none' = 'none'

const trackDragDeltaX = ref(0)
const isDraggingTrack = ref(false)
const closeDragY = ref(0)
const closeDragOpacity = ref(1)

// Pinch-to-zoom state on touch
let isPinching = false
let initialPinchDist = 0
let initialPinchScale = 1

// Double tap detection on touch
let lastTapTime = 0
let lastTapX = 0
let lastTapY = 0

// Auto-hide navigation arrows after 2.5s idle
const isIdle = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | null = null

function resetIdleTimer(): void {
  isIdle.value = false
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    isIdle.value = true
  }, 2500)
}

function onStagePointerMove(e: PointerEvent): void {
  resetIdleTimer()

  if (e.pointerType === 'mouse' && scale.value > 1) {
    updatePanFromMouse(e.clientX, e.clientY)
    return
  }

  if (!isPointerDown || scale.value > 1) return

  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY

  const now = performance.now()
  const dt = now - lastPointerTime
  if (dt > 10) {
    pointerVelocityX = (e.clientX - lastPointerX) / dt
    lastPointerX = e.clientX
    lastPointerTime = now
  }

  if (gestureLocked === 'none') {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      if (e.pointerType === 'touch' && dy > 8 && Math.abs(dy) > Math.abs(dx)) {
        gestureLocked = 'vertical'
      } else if (Math.abs(dx) >= Math.abs(dy)) {
        gestureLocked = 'horizontal'
        isDraggingTrack.value = true
      }
    }
  }

  if (gestureLocked === 'horizontal') {
    const container = viewportRef.value
    const viewportW = container?.clientWidth || 800

    // Rubber-band resistance past the first/last slide (a drag toward inline-end asks for the
    // previous slide, toward inline-start for the next one)
    const inlineDelta = isRtl.value ? -dx : dx
    const isAtStart = currentIndex.value === 0 && inlineDelta > 0
    const isAtEnd = currentIndex.value === props.images.length - 1 && inlineDelta < 0

    if (isAtStart || isAtEnd) {
      const damped = applyRubberBand(inlineDelta, viewportW)
      trackDragDeltaX.value = isRtl.value ? -damped : damped
    } else {
      trackDragDeltaX.value = dx
    }
  } else if (gestureLocked === 'vertical') {
    const safeDy = Math.max(0, dy)
    closeDragY.value = safeDy
    const progress = calculateCloseDragProgress(safeDy, 120)
    closeDragOpacity.value = progress.opacity
  }
}

function onStagePointerDown(e: PointerEvent): void {
  resetIdleTimer()
  if (e.button !== 0 && e.pointerType === 'mouse') return

  isPointerDown = true
  gestureLocked = 'none'
  pointerStartX = e.clientX
  pointerStartY = e.clientY
  lastPointerX = e.clientX
  pointerStartTime = performance.now()
  lastPointerTime = pointerStartTime
  pointerVelocityX = 0
}

function onStagePointerUp(e: PointerEvent): void {
  if (!isPointerDown) return
  isPointerDown = false

  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY
  const wasLocked = gestureLocked
  gestureLocked = 'none'

  if (wasLocked === 'horizontal' && isDraggingTrack.value) {
    isDraggingTrack.value = false
    const currentOffset = trackDragDeltaX.value
    trackDragDeltaX.value = 0

    const offsetInline = isRtl.value ? -currentOffset : currentOffset
    const velocityInline = isRtl.value ? -pointerVelocityX : pointerVelocityX

    const target = calculateSnapTarget({
      currentIndex: currentIndex.value,
      total: props.images.length,
      offsetInline,
      velocityInline,
      distanceThreshold: 60,
      velocityThreshold: 0.4,
    })

    if (target !== currentIndex.value) {
      goTo(target)
    }
    return
  }

  if (wasLocked === 'vertical') {
    const currentDy = closeDragY.value
    closeDragY.value = 0
    closeDragOpacity.value = 1
    if (currentDy >= 120) {
      closeLightbox()
    }
    return
  }

  // Tap without drag
  if (Math.abs(dx) <= 6 && Math.abs(dy) <= 6) {
    if (e.pointerType === 'mouse') {
      const targetEl = e.target as HTMLElement | null
      const isImageClick = targetEl?.closest('[data-slide-image]')
      if (isImageClick) {
        toggleDesktopZoom(e.clientX, e.clientY)
      } else if (targetEl?.closest('[data-empty-stage]')) {
        closeLightbox()
      }
    }
  }
}

// Touch events for pinch-to-zoom & double-tap
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
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const factor = dist / initialPinchDist
      scale.value = clampZoom(initialPinchScale * factor, 1, 3)
      if (scale.value <= 1.05) {
        pan.value = { x: 0, y: 0 }
      }
    }
  } else if (scale.value > 1 && e.touches.length === 1 && !isPinching) {
    // One finger pan when zoomed on touch
    const t0 = e.touches[0]
    if (t0) {
      const container = viewportRef.value
      const viewportW = container?.clientWidth || 800
      const viewportH = container?.clientHeight || 600
      const dx = t0.clientX - pointerStartX
      const dy = t0.clientY - pointerStartY
      pan.value = clampPan(
        { x: pan.value.x + dx * 0.1, y: pan.value.y + dy * 0.1 },
        scale.value,
        { width: viewportW, height: viewportH },
        { width: viewportW, height: viewportH },
      )
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

  // Double-tap to zoom on touch
  if (e.touches.length === 0 && !isPinching && gestureLocked === 'none') {
    const now = Date.now()
    const changed = e.changedTouches[0]
    if (changed) {
      const dt = now - lastTapTime
      const dist = Math.hypot(changed.clientX - lastTapX, changed.clientY - lastTapY)
      if (dt < 300 && dist < 30) {
        if (scale.value > 1) {
          scale.value = 1
          pan.value = { x: 0, y: 0 }
        } else {
          scale.value = 2
          updatePanFromMouse(changed.clientX, changed.clientY)
        }
        lastTapTime = 0
      } else {
        lastTapTime = now
        lastTapX = changed.clientX
        lastTapY = changed.clientY
      }
    }
  }
}

// Slide style in horizontal track (1:1 pointer drag, 280ms cubic-bezier transition on snap)
function getSlideStyle(idx: number): Record<string, string> {
  const diff = idx - currentIndex.value
  const factor = isRtl.value ? -1 : 1
  const basePercent = factor * diff * 100
  const dragPx = isDraggingTrack.value ? trackDragDeltaX.value : 0

  const transform = `translate3d(calc(${basePercent}% + ${dragPx}px), 0, 0)`
  const transition =
    isReducedMotion.value || isDraggingTrack.value
      ? 'none'
      : 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)'

  return {
    transform,
    transition,
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (!open.value) return

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    // Visually right: prev in RTL, next in LTR
    if (isRtl.value) {
      prev()
    } else {
      next()
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    // Visually left: next in RTL, prev in LTR
    if (isRtl.value) {
      next()
    } else {
      prev()
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closeLightbox()
  }
}

watch(open, (isOpen, wasOpen) => {
  if (isOpen) {
    currentIndex.value = wrapIndex(props.initialIndex, props.images.length)
    scale.value = 1
    pan.value = { x: 0, y: 0 }
    trackDragDeltaX.value = 0
    closeDragY.value = 0
    closeDragOpacity.value = 1
    preloadNeighbours(currentIndex.value)
    startOpenFlip()
    resetIdleTimer()
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
    if (idleTimer) clearTimeout(idleTimer)
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="fixed inset-0 top-0 left-0 z-50 flex h-dvh w-screen max-w-none sm:max-w-none flex-col justify-between overflow-hidden rounded-none border-0 bg-serag-cream p-0 text-foreground shadow-2xl backdrop-blur-md translate-x-0 translate-y-0 transition-opacity duration-200 dark:bg-[#121211]/98"
      :style="{ opacity: isClosing ? closeOpacity : closeDragOpacity }"
    >
      <DialogDescription class="sr-only">
        {{ productName }}
      </DialogDescription>

      <!-- Minimal Editorial Top Bar: Product Name (font-display) on start, zoom + close on end -->
      <div
        class="z-30 flex items-center justify-between gap-4 border-b border-border/40 px-4 py-3 sm:px-6 backdrop-blur-xs select-none"
      >
        <div class="flex items-center gap-3 min-w-0">
          <DialogTitle
            class="truncate font-display text-base sm:text-lg font-bold text-foreground"
          >
            {{ productName }}
          </DialogTitle>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- Zoom Toggle Button (44px target) -->
          <button
            type="button"
            :aria-label="scale > 1 ? t('store.productPage.gallery.zoomOut') : t('store.productPage.gallery.zoomIn')"
            class="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-border/60 bg-background/80 dark:bg-card/80 text-foreground shadow-xs backdrop-blur-md transition-colors hover:border-serag-gold hover:text-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold"
            @click="toggleZoomButton"
          >
            <ZoomOut v-if="scale > 1" class="size-5" aria-hidden="true" />
            <ZoomIn v-else class="size-5" aria-hidden="true" />
          </button>

          <!-- Close Button (44px target) -->
          <DialogClose as-child>
            <button
              type="button"
              :aria-label="t('store.productPage.gallery.closeLightbox')"
              class="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-border/60 bg-background/80 dark:bg-card/80 text-foreground shadow-xs backdrop-blur-md transition-colors hover:border-serag-gold hover:text-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold"
              @click="closeLightbox"
            >
              <X class="size-5" aria-hidden="true" />
            </button>
          </DialogClose>
        </div>
      </div>

      <!-- Main Stage Viewport -->
      <div
        ref="viewportRef"
        data-empty-stage
        class="relative flex flex-1 items-center justify-center overflow-hidden select-none touch-none"
        @pointerdown="onStagePointerDown"
        @pointermove="onStagePointerMove"
        @pointerup="onStagePointerUp"
        @pointercancel="onStagePointerUp"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <!-- Horizontal slide track for all images -->
        <div
          v-for="(img, idx) in images"
          :key="img.id || idx"
          data-slide-container
          class="absolute inset-0 flex items-center justify-center p-4 sm:p-10 will-change-transform select-none"
          :style="getSlideStyle(idx)"
        >
          <!-- Active image wrapper with zoom, pan, FLIP, and vertical drag down -->
          <div
            v-if="idx === currentIndex"
            ref="activeImageContainerRef"
            data-slide-image
            :class="[
              // The cream fill gives mix-blend-multiply something to blend with: this wrapper is its own
              // layer (transform), so without it the photo's white background stays a white box
              'relative flex max-h-full max-w-full items-center justify-center bg-serag-cream will-change-transform select-none',
              'dark:rounded-[28px] dark:bg-card dark:p-6 sm:dark:p-10 dark:border dark:border-white/5 dark:shadow-2xl',
              scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in',
            ]"
            :style="{
              transform: isOpeningFlip
                ? flipTransform
                : isClosing
                  ? closeTransform
                  : `translate3d(${pan.x}px, ${pan.y + closeDragY}px, 0) scale(${scale})`,
              transition:
                isReducedMotion || isOpeningFlip || isClosing || isDraggingTrack || closeDragY > 0
                  ? 'none'
                  : 'transform 200ms ease-out',
            }"
          >
            <NuxtImg
              v-if="img.url"
              :src="img.url"
              :alt="img.alt || productName"
              width="1200"
              height="1200"
              :class="[
                'max-h-[calc(100dvh-170px)] max-w-full object-contain pointer-events-none select-none mix-blend-multiply dark:mix-blend-normal',
                isReducedMotion
                  ? 'filter-none opacity-100'
                  : loadedUrls[img.url]
                    ? 'blur-0 opacity-100 transition-all duration-300 ease-out'
                    : 'blur-md opacity-60 transition-all duration-300 ease-out',
              ]"
              draggable="false"
              @load="onImageLoad(img.url)"
            />
          </div>

          <!-- Inactive Neighbour Slide Image -->
          <div
            v-else
            class="relative flex max-h-full max-w-full items-center justify-center pointer-events-none select-none dark:rounded-[28px] dark:bg-card dark:p-6 sm:dark:p-10 dark:border dark:border-white/5"
          >
            <NuxtImg
              v-if="img.url"
              :src="img.url"
              :alt="img.alt || productName"
              width="1200"
              height="1200"
              class="max-h-[calc(100dvh-170px)] max-w-full object-contain pointer-events-none select-none mix-blend-multiply dark:mix-blend-normal"
              draggable="false"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Previous navigation arrow: inline-start edge, ChevronLeft pointing start (flipped in RTL) -->
        <button
          v-if="hasMultiple"
          type="button"
          :aria-label="t('store.productPage.gallery.prev')"
          :class="[
            'lightbox-arrow absolute start-3 sm:start-6 top-1/2 -translate-y-1/2 z-30 inline-flex size-[52px] min-h-[52px] min-w-[52px] items-center justify-center rounded-full border border-border/60 bg-background/85 dark:bg-card/85 text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:border-serag-gold hover:text-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold',
            isIdle || scale > 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto',
          ]"
          @pointerdown.stop
          @click.stop="prev"
        >
          <ChevronLeft class="size-6 rtl:-scale-x-100" aria-hidden="true" />
        </button>

        <!-- Next navigation arrow: inline-end edge, ChevronRight pointing end (flipped in RTL) -->
        <button
          v-if="hasMultiple"
          type="button"
          :aria-label="t('store.productPage.gallery.next')"
          :class="[
            'lightbox-arrow absolute end-3 sm:end-6 top-1/2 -translate-y-1/2 z-30 inline-flex size-[52px] min-h-[52px] min-w-[52px] items-center justify-center rounded-full border border-border/60 bg-background/85 dark:bg-card/85 text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:border-serag-gold hover:text-serag-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold',
            isIdle || scale > 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto',
          ]"
          @pointerdown.stop
          @click.stop="next"
        >
          <ChevronRight class="size-6 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </div>

      <!-- Minimal Bottom Bar: Progress line, counter & centered thumbnails -->
      <div
        v-if="hasMultiple"
        class="z-30 flex flex-col gap-2.5 border-t border-border/40 px-4 py-3 sm:px-6 backdrop-blur-xs select-none"
      >
        <!-- Thin Progress Line (current / total) -->
        <div class="h-0.5 w-full overflow-hidden rounded-full bg-border/40">
          <div
            class="h-full bg-serag-gold transition-all duration-300"
            :style="{ width: `${((currentIndex + 1) / images.length) * 100}%` }"
          />
        </div>

        <div class="relative flex items-center justify-between sm:justify-center">
          <!-- "2 / 4" Counter in .num font -->
          <span
            class="num text-xs font-semibold text-muted-foreground sm:absolute sm:start-0"
          >
            {{ currentIndex + 1 }} / {{ images.length }}
          </span>

          <!-- Thumbnail Strip on desktop (>= 640px): 56px rounded thumbs with serag-gold ring on active -->
          <div
            class="hidden sm:flex items-center justify-center gap-2.5 overflow-x-auto py-1 max-w-full"
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
                  ? 'border-serag-gold ring-2 ring-serag-gold/50 opacity-100 bg-background dark:bg-card shadow-xs'
                  : 'border-border/60 opacity-50 hover:opacity-100 bg-serag-ivory/50 dark:bg-muted/40',
              ]"
              @click="goTo(idx)"
            >
              <NuxtImg
                :src="img.url"
                :alt="img.alt || productName"
                width="56"
                height="56"
                class="size-full object-contain mix-blend-multiply dark:mix-blend-normal"
              />
            </button>
          </div>

          <!-- Mobile Dots (< 640px) -->
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
                  idx === currentIndex ? 'w-6 bg-serag-gold' : 'w-2 bg-border',
                ]"
              />
            </button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
/* Hidden on touch-only devices without a fine pointing mouse/stylus */
@media (hover: none) or (pointer: coarse) {
  .lightbox-arrow {
    display: none !important;
  }
}
</style>
