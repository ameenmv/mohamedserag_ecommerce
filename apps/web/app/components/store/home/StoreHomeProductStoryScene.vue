<script setup lang="ts">
import type { ProductStoryAppliance } from '@serag/shared'
import type { ApplianceScene } from '~/utils/appliance3d/scene'
import { FINISHES, type ApplianceFinish } from '~/utils/appliance3d/math'
import { registerStoryScene } from '~/utils/story-scene-bridge'

const props = defineProps<{
  kind: ProductStoryAppliance
  finish?: ApplianceFinish
}>()

const defaultFinishForKind = (k: ProductStoryAppliance): ApplianceFinish => {
  if (k === 'tv') return 'black'
  if (k === 'ac') return 'white'
  return 'steel'
}

const { t } = useI18n()

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const isMounted = ref(false)
const mode = ref<'loading' | 'webgl' | 'fallback'>('loading')
const currentFinish = ref<ApplianceFinish>(props.finish ?? defaultFinishForKind(props.kind))

watch(
  () => props.finish,
  (next) => {
    if (next && next !== currentFinish.value) {
      onSelectFinish(next)
    }
  },
)

let scene: ApplianceScene | null = null
let unregisterBridge: (() => void) | null = null
let loadObserver: IntersectionObserver | null = null
let visibilityObserver: IntersectionObserver | null = null
let bufferedOpenness: number | null = null
let isUnmounted = false

function getSwatchClass(finish: ApplianceFinish): string {
  switch (finish) {
    case 'steel':
      return 'bg-gradient-to-br from-[#E8ECF0] via-[#C4C9D0] to-[#8E94A0] border border-white/30'
    case 'white':
      return 'bg-gradient-to-br from-[#FFFFFF] to-[#ECEEF2] border border-white/60'
    case 'black':
      return 'bg-gradient-to-br from-[#26262A] via-[#141416] to-[#0A0A0C] border border-white/20'
    case 'champagne':
      return 'bg-gradient-to-br from-[#E8DCB8] via-[#D6C4AF] to-[#A8946E] border border-white/40'
  }
}

function onSelectFinish(finish: ApplianceFinish): void {
  currentFinish.value = finish
  scene?.setFinish(finish)
}

function onKeydownSwatch(e: KeyboardEvent, current: ApplianceFinish): void {
  const currentIndex = FINISHES.indexOf(current)
  if (currentIndex === -1) return

  let nextIndex = -1
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    nextIndex = (currentIndex + 1) % FINISHES.length
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    nextIndex = (currentIndex - 1 + FINISHES.length) % FINISHES.length
  }

  if (nextIndex >= 0) {
    const nextFinish = FINISHES[nextIndex]
    if (nextFinish) {
      onSelectFinish(nextFinish)
      nextTick(() => {
        const buttons = containerRef.value?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
        buttons?.[nextIndex]?.focus()
      })
    }
  }
}

function setOpen(progress: number): void {
  bufferedOpenness = progress
  scene?.setOpen(progress)
}

defineExpose({ setOpen })

function onVisibilityChange(): void {
  if (document.hidden) {
    scene?.pause()
  } else {
    scene?.resume()
  }
}

async function loadAndInitScene(): Promise<void> {
  try {
    const { createApplianceScene } = await import('~/utils/appliance3d/scene')
    if (isUnmounted) return

    mode.value = 'webgl'
    await nextTick()

    if (!canvasRef.value) return

    const isRtl =
      document.documentElement.dir === 'rtl' ||
      !document.documentElement.dir ||
      document.documentElement.lang === 'ar'

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    scene = createApplianceScene(canvasRef.value, {
      kind: props.kind,
      finish: currentFinish.value,
      hingeSide: isRtl ? 'right' : 'left',
      reducedMotion: prefersReducedMotion,
    })

    if (bufferedOpenness !== null) {
      scene.setOpen(bufferedOpenness)
    }

    // Pause WebGL rendering when offscreen to conserve GPU resources
    visibilityObserver = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      if (entry.isIntersecting) {
        scene?.resume()
      } else {
        scene?.pause()
      }
    })
    if (containerRef.value) {
      visibilityObserver.observe(containerRef.value)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
  } catch {
    mode.value = 'fallback'
  }
}

onMounted(() => {
  isMounted.value = true

  // Register bridge so GSAP timeline can drive door openness
  unregisterBridge = registerStoryScene((progress) => {
    setOpen(progress)
  })

  // Detect WebGL2 support
  const hasWebGL2 = (() => {
    try {
      const c = document.createElement('canvas')
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'))
    } catch {
      return false
    }
  })()

  if (!hasWebGL2) {
    mode.value = 'fallback'
    return
  }

  // Lazy-load Three.js when the story section nears the viewport
  loadObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry && entry.isIntersecting) {
        loadObserver?.disconnect()
        loadObserver = null
        loadAndInitScene()
      }
    },
    { rootMargin: '400px' },
  )

  if (containerRef.value) {
    loadObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  isUnmounted = true
  unregisterBridge?.()
  loadObserver?.disconnect()
  visibilityObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  scene?.dispose()
  scene = null
})
</script>

<template>
  <div
    ref="containerRef"
    class="story-appliance-3d relative flex flex-col items-center justify-center select-none"
    style="width: min(80vw, 300px);"
  >
    <!-- Server-side & pre-mount reservation to prevent CLS -->
    <div
      v-if="!isMounted || mode === 'loading'"
      class="aspect-[4/5] w-full"
      aria-hidden="true"
    />

    <!-- CSS Fallback (no WebGL2, or load error) -->
    <StoreHomeProductStoryAppliance
      v-else-if="mode === 'fallback'"
      :kind="kind"
    />

    <!-- Interactive 3D WebGL Appliance Scene -->
    <template v-else-if="mode === 'webgl'">
      <div class="relative flex aspect-[4/5] w-full items-center justify-center">
        <canvas
          ref="canvasRef"
          class="size-full"
          aria-hidden="true"
        />
      </div>

      <!-- Finish Swatches Radiogroup -->
      <div
        role="radiogroup"
        :aria-label="t('store.home.productStory.finishLabel')"
        class="mt-4 flex items-center justify-center gap-2"
      >
        <button
          v-for="f in FINISHES"
          :key="f"
          type="button"
          role="radio"
          :aria-checked="currentFinish === f"
          :aria-label="t(`store.home.productStory.finishes.${f}`)"
          :tabindex="currentFinish === f ? 0 : -1"
          class="group relative flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:ring-offset-2 focus-visible:ring-offset-serag-deep"
          @click="onSelectFinish(f)"
          @keydown="onKeydownSwatch($event, f)"
        >
          <span
            class="size-8 rounded-full shadow-md transition-transform duration-200 group-hover:scale-105"
            :class="[
              getSwatchClass(f),
              currentFinish === f
                ? 'ring-2 ring-serag-gold-hi ring-offset-2 ring-offset-serag-deep scale-110'
                : 'opacity-85',
            ]"
          />
        </button>
      </div>

      <!-- Generic Illustration Legal / Clarity Hint -->
      <p class="mt-2 text-center text-xs text-[#C4BEB0]/80">
        {{ t('store.home.productStory.illustrative') }}
      </p>
    </template>
  </div>
</template>
