<script setup lang="ts">
/**
 * Custom cursor follower:
 * A small sand dot follows the mouse exactly and a ring trails it with a lerp.
 * Over [data-cursor], a discreet pill label appears beside the pointer.
 * The ring grows slightly over interactive elements, and hides over form inputs.
 * Active only on devices with a fine pointer (mouse/trackpad) and when reduced motion is off.
 */
const isEnabled = ref(false)
const dotEl = ref<HTMLElement | null>(null)
const ringEl = ref<HTMLElement | null>(null)
const labelEl = ref<HTMLElement | null>(null)

const isHidden = ref(true)
const isInputHidden = ref(false)
const isHover = ref(false)
const isLabel = ref(false)
const isPressed = ref(false)
const cursorLabel = ref('')

let mouseX = -100
let mouseY = -100
let ringX = -100
let ringY = -100
let hasMoved = false
let rafId: number | null = null
let pressTimer: ReturnType<typeof setTimeout> | undefined

function onPointerMove(e: PointerEvent): void {
  mouseX = e.clientX
  mouseY = e.clientY
  if (!hasMoved) {
    hasMoved = true
    ringX = mouseX
    ringY = mouseY
  }
  isHidden.value = false
}

function onPointerDown(): void {
  isPressed.value = true
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    isPressed.value = false
  }, 150)
}

function onPointerUp(): void {
  isPressed.value = false
}

function onMouseOut(e: MouseEvent): void {
  if (!e.relatedTarget) {
    isHidden.value = true
  }
}

function onPointerOver(e: Event): void {
  const target = e.target
  if (!(target instanceof Element)) return

  if (target.closest('input, textarea, select, [contenteditable="true"]')) {
    isInputHidden.value = true
    isLabel.value = false
    isHover.value = false
    return
  }

  isInputHidden.value = false

  const cursorEl = target.closest<HTMLElement>('[data-cursor]')
  const interactiveEl = target.closest<HTMLElement>('a, button, [role="button"], label')

  if (
    interactiveEl &&
    cursorEl &&
    cursorEl.contains(interactiveEl) &&
    interactiveEl !== cursorEl &&
    !interactiveEl.hasAttribute('data-cursor')
  ) {
    isLabel.value = false
    isHover.value = true
  } else if (cursorEl) {
    const label = cursorEl.getAttribute('data-cursor')
    if (label) {
      // Retain label text so it does not collapse while fading out
      cursorLabel.value = label
      isLabel.value = true
      isHover.value = false
    } else {
      isLabel.value = false
      isHover.value = false
    }
  } else if (interactiveEl) {
    isLabel.value = false
    isHover.value = true
  } else {
    isLabel.value = false
    isHover.value = false
  }
}

function loop(): void {
  // Smoothly trail the target point with a lerp factor of ~0.18
  ringX += (mouseX - ringX) * 0.18
  ringY += (mouseY - ringY) * 0.18

  if (dotEl.value) {
    dotEl.value.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`
  }
  if (ringEl.value) {
    ringEl.value.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`
  }
  if (labelEl.value) {
    // Keep pill next to the pointer: 18px down and 18px inline-end (flipped in RTL)
    const isRtl = document.documentElement.dir === 'rtl'
    const offsetX = isRtl ? -18 : 18
    const offsetY = 18
    const alignX = isRtl ? '-100%' : '0'
    labelEl.value.style.transform = `translate3d(${ringX + offsetX}px, ${ringY + offsetY}px, 0) translate(${alignX}, 0)`
  }

  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!hasFinePointer || prefersReducedMotion) return

  isEnabled.value = true

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  document.addEventListener('pointerover', onPointerOver, { passive: true })
  window.addEventListener('mouseout', onMouseOut, { passive: true })

  rafId = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  clearTimeout(pressTimer)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('pointerover', onPointerOver)
  window.removeEventListener('mouseout', onMouseOut)
})
</script>

<template>
  <div v-if="isEnabled">
    <div
      ref="ringEl"
      class="cursor-ring"
      :class="{
        'is-hidden': isHidden || isInputHidden,
        'is-label': isLabel,
        'is-hover': isHover,
        'is-pressed': isPressed,
      }"
      aria-hidden="true"
    />
    <div
      ref="labelEl"
      class="cursor-label"
      :class="{ 'is-visible': isLabel && !isHidden && !isInputHidden }"
      aria-hidden="true"
    >
      {{ cursorLabel }}
    </div>
    <div
      ref="dotEl"
      class="cursor-dot"
      :class="{ 'is-hidden': isHidden || isInputHidden }"
      aria-hidden="true"
    />
  </div>
</template>
