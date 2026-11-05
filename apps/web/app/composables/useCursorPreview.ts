import {
  calculateTargetPosition,
  lerp,
  tiltFromVelocity,
  zoneIndex,
} from '../utils/cursor-preview'

export interface CategoryPreviewData {
  slug: string
  name: string
  accent: string
  illustration?: string | null
  coverImage: string | null
  coverImages?: string[]
}

/**
 * Client-only composable driving the smooth cursor-following category preview tile.
 * Runs only on fine-pointer devices without reduced motion preference.
 */
export function useCursorPreview() {
  const isSupported = ref(false)
  const isVisible = ref(false)
  const activeCategory = shallowRef<CategoryPreviewData | null>(null)
  const activeImageIndex = ref(0)
  const currentImage = ref<string | null>(null)
  const previousImage = ref<string | null>(null)
  const slideOffset = ref(0)
  const imageTransitionKey = ref(0)
  const isImageFading = computed(() => previousImage.value !== null)
  const previewContainerEl = ref<HTMLElement | null>(null)

  let currX = -9999
  let currY = -9999
  let currTilt = 0
  let targetX = -9999
  let targetY = -9999
  let vx = 0
  let lastMouseX = 0
  let rafId: number | null = null
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let fadeTimer: ReturnType<typeof setTimeout> | null = null
  let currentRowRect: { left: number; width: number } | null = null

  const preloadedUrls = new Set<string>()

  function preloadImages(urls: readonly string[]) {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return
    for (const url of urls) {
      if (url && !preloadedUrls.has(url)) {
        preloadedUrls.add(url)
        const img = new Image()
        img.src = url
      }
    }
  }

  function checkSupport(): boolean {
    if (typeof window === 'undefined') return false
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return finePointer && !reducedMotion
  }

  let lastClientX = 0
  let lastClientY = 0
  let lastTick = 0

  function updateTarget(clientX: number, clientY: number) {
    if (typeof window === 'undefined') return
    lastClientX = clientX
    lastClientY = clientY
    const isRtl = document.documentElement.dir === 'rtl'
    const pos = calculateTargetPosition(
      clientX,
      clientY,
      320,
      300,
      window.innerWidth,
      window.innerHeight,
      { offset: 28, padding: 20, isRtl },
    )
    targetX = pos.x
    targetY = pos.y
  }

  function tick() {
    if (!isVisible.value && Math.abs(currX - targetX) < 0.1 && Math.abs(currY - targetY) < 0.1) {
      rafId = null
      return
    }

    // Frame-rate independent smoothing (~70ms time constant) so it keeps up on slow frames too
    const now = performance.now()
    const dt = lastTick === 0 ? 16 : Math.min(now - lastTick, 64)
    lastTick = now
    const k = 1 - Math.exp(-dt / 70)
    currX = lerp(currX, targetX, k)
    currY = lerp(currY, targetY, k)

    // Velocity-based tilt with smooth decay
    const targetTilt = tiltFromVelocity(vx, 6, 0.18)
    currTilt = lerp(currTilt, targetTilt, 0.12)
    vx = lerp(vx, 0, 0.25)

    if (previewContainerEl.value) {
      previewContainerEl.value.style.transform = `translate3d(${currX.toFixed(2)}px, ${currY.toFixed(2)}px, 0) rotate(${currTilt.toFixed(2)}deg)`
    }

    rafId = requestAnimationFrame(tick)
  }

  function startRaf() {
    if (rafId === null) {
      lastTick = 0
      rafId = requestAnimationFrame(tick)
    }
  }

  function stopRaf() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function setCategory(item: CategoryPreviewData) {
    const images =
      item.coverImages && item.coverImages.length > 0
        ? item.coverImages
        : item.coverImage
          ? [item.coverImage]
          : []

    preloadImages(images)

    const isSameCategory = activeCategory.value?.slug === item.slug
    if (isSameCategory) return

    const firstImage = images[0] ?? item.coverImage ?? null
    if (activeCategory.value && currentImage.value && currentImage.value !== firstImage) {
      previousImage.value = currentImage.value
      if (fadeTimer) clearTimeout(fadeTimer)
      fadeTimer = setTimeout(() => {
        previousImage.value = null
        fadeTimer = null
      }, 130)
    } else {
      previousImage.value = null
    }

    activeCategory.value = item
    activeImageIndex.value = 0
    slideOffset.value = 0
    currentImage.value = firstImage
    imageTransitionKey.value++
  }

  function onRowEnter(item: CategoryPreviewData, event: MouseEvent) {
    if (!isSupported.value) return
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    if (event.currentTarget instanceof HTMLElement) {
      const rect = event.currentTarget.getBoundingClientRect()
      currentRowRect = { left: rect.left, width: rect.width }
    } else {
      currentRowRect = null
    }

    updateTarget(event.clientX, event.clientY)
    lastMouseX = event.clientX
    vx = 0

    if (!isVisible.value) {
      currX = targetX
      currY = targetY
      currTilt = 0
      if (previewContainerEl.value) {
        previewContainerEl.value.style.transform = `translate3d(${currX.toFixed(2)}px, ${currY.toFixed(2)}px, 0) rotate(0deg)`
      }
      isVisible.value = true
      startRaf()
    }

    setCategory(item)
  }

  function onMouseMove(event: MouseEvent) {
    if (!isSupported.value || !isVisible.value) return

    if (event.currentTarget instanceof HTMLElement) {
      const rect = event.currentTarget.getBoundingClientRect()
      currentRowRect = { left: rect.left, width: rect.width }
    }

    vx = event.clientX - lastMouseX
    lastMouseX = event.clientX
    updateTarget(event.clientX, event.clientY)
    startRaf()

    // Handle horizontal scrubbing inside the row
    if (activeCategory.value && currentRowRect) {
      const images =
        activeCategory.value.coverImages && activeCategory.value.coverImages.length > 0
          ? activeCategory.value.coverImages
          : activeCategory.value.coverImage
            ? [activeCategory.value.coverImage]
            : []

      const count = Math.min(images.length, 3)
      if (count > 1) {
        const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
        const newIndex = zoneIndex(event.clientX, currentRowRect, count, isRtl)

        if (newIndex !== activeImageIndex.value) {
          const nextImage = images[newIndex]
          if (nextImage && nextImage !== currentImage.value) {
            const forward = isRtl ? newIndex < activeImageIndex.value : newIndex > activeImageIndex.value
            const dir = vx !== 0 ? (vx > 0 ? 1 : -1) : forward ? 1 : -1

            previousImage.value = currentImage.value
            currentImage.value = nextImage
            activeImageIndex.value = newIndex
            slideOffset.value = -6 * dir
            imageTransitionKey.value++

            if (fadeTimer) clearTimeout(fadeTimer)
            fadeTimer = setTimeout(() => {
              previousImage.value = null
              fadeTimer = null
            }, 130)
          }
        }
      }
    }
  }

  function onRowLeave() {
    currentRowRect = null
    if (!isSupported.value) return
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      hide()
    }, 60)
  }

  function onListLeave() {
    currentRowRect = null
    if (!isSupported.value) return
    if (hideTimer) clearTimeout(hideTimer)
    hide()
  }

  function hide() {
    isVisible.value = false
    setTimeout(() => {
      if (!isVisible.value) {
        stopRaf()
        previousImage.value = null
      }
    }, 350)
  }

  // Scrolling moves rows under a still pointer without any mouse event: keep the tile beside it
  function onScroll() {
    if (!isVisible.value) return
    updateTarget(lastClientX, lastClientY)
    startRaf()
  }

  onMounted(() => {
    isSupported.value = checkSupport()
    if (isSupported.value) window.addEventListener('scroll', onScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') window.removeEventListener('scroll', onScroll)
    stopRaf()
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
    if (fadeTimer) {
      clearTimeout(fadeTimer)
      fadeTimer = null
    }
  })

  return {
    isSupported,
    isVisible,
    activeCategory,
    activeImageIndex,
    currentImage,
    previousImage,
    slideOffset,
    imageTransitionKey,
    isImageFading,
    previewContainerEl,
    onRowEnter,
    onRowLeave,
    onListLeave,
    onMouseMove,
  }
}
