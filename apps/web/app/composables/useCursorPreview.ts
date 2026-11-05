import {
  calculateTargetPosition,
  lerp,
  tiltFromVelocity,
} from '../utils/cursor-preview'

export interface CategoryPreviewData {
  slug: string
  name: string
  accent: string
  illustration?: string | null
  coverImage: string | null
}

/**
 * Client-only composable driving the smooth cursor-following category preview tile.
 * Runs only on fine-pointer devices without reduced motion preference.
 */
export function useCursorPreview() {
  const isSupported = ref(false)
  const isVisible = ref(false)
  const activeCategory = shallowRef<CategoryPreviewData | null>(null)
  const currentImage = ref<string | null>(null)
  const isImageFading = ref(false)
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

  function checkSupport(): boolean {
    if (typeof window === 'undefined') return false
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return finePointer && !reducedMotion
  }

  function updateTarget(clientX: number, clientY: number) {
    if (typeof window === 'undefined') return
    const isRtl = document.documentElement.dir === 'rtl'
    const pos = calculateTargetPosition(
      clientX,
      clientY,
      320,
      400,
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

    // Lerp smoothing with factor ~0.14
    currX = lerp(currX, targetX, 0.14)
    currY = lerp(currY, targetY, 0.14)

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
    if (!activeCategory.value) {
      activeCategory.value = item
      currentImage.value = item.coverImage
      return
    }

    if (activeCategory.value.slug === item.slug) return

    activeCategory.value = item
    if (currentImage.value !== item.coverImage) {
      isImageFading.value = true
      setTimeout(() => {
        currentImage.value = item.coverImage
        isImageFading.value = false
      }, 80)
    }
  }

  function onRowEnter(item: CategoryPreviewData, event: MouseEvent) {
    if (!isSupported.value) return
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
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
    vx = event.clientX - lastMouseX
    lastMouseX = event.clientX
    updateTarget(event.clientX, event.clientY)
    startRaf()
  }

  function onRowLeave() {
    if (!isSupported.value) return
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      hide()
    }, 60)
  }

  function onListLeave() {
    if (!isSupported.value) return
    if (hideTimer) clearTimeout(hideTimer)
    hide()
  }

  function hide() {
    isVisible.value = false
    setTimeout(() => {
      if (!isVisible.value) {
        stopRaf()
      }
    }, 350)
  }

  onMounted(() => {
    isSupported.value = checkSupport()
  })

  onBeforeUnmount(() => {
    stopRaf()
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  })

  return {
    isSupported,
    isVisible,
    activeCategory,
    currentImage,
    isImageFading,
    previewContainerEl,
    onRowEnter,
    onRowLeave,
    onListLeave,
    onMouseMove,
  }
}
