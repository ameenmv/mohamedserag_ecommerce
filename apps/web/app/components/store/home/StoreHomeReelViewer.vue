<script setup lang="ts">
import { ArrowLeft, ArrowRight, ExternalLink, X } from '@lucide/vue'
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

/**
 * Popup player for the trader reels: Facebook's own player in an iframe, one reel at a time,
 * with previous/next (buttons, arrow keys, swipe on the margins). It is only mounted after a
 * visitor taps a card, so nothing of Facebook is loaded until then.
 */
export interface ViewerReel {
  name: string
  place: string
  /** The reel's page on Facebook (the «open on Facebook» fallback). */
  url: string
  /** Facebook's player address for the reel. */
  src: string
}

const props = defineProps<{ reels: ViewerReel[]; index: number | null }>()
const emit = defineEmits<{ 'update:index': [value: number | null] }>()

const { t, localeProperties } = useI18n()
const rtl = computed(() => localeProperties.value.dir !== 'ltr')

const open = computed({
  get: () => props.index !== null,
  set: (value: boolean) => {
    if (!value) emit('update:index', null)
  },
})
const current = computed(() => (props.index === null ? null : (props.reels[props.index] ?? null)))
const loaded = ref(false)
watch(
  () => props.index,
  () => {
    loaded.value = false
  },
)

function go(step: 1 | -1): void {
  if (props.index === null || props.reels.length < 2) return
  emit('update:index', (props.index + step + props.reels.length) % props.reels.length)
}

// "Next" lies to the left on a right-to-left page, to the right otherwise
function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  go((event.key === 'ArrowRight') === rtl.value ? -1 : 1)
}

let startX = 0
let startY = 0
function onPointerDown(event: PointerEvent): void {
  startX = event.clientX
  startY = event.clientY
}
// A drag across the popup (the frame itself swallows touches) moves to the next or previous reel
function onPointerUp(event: PointerEvent): void {
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  go((dx > 0) === rtl.value ? 1 : -1)
}

// The margin around the stage closes the popup, like a click on a backdrop
function onBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) open.value = false
}

const navButton =
  'flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-serag-gold/50 bg-black/30 text-serag-gold-hi backdrop-blur-sm transition-colors hover:bg-serag-gold-hi hover:text-serag-ink focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none'
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="reel-overlay fixed inset-0 z-[60] bg-[#07110b]/90 backdrop-blur-sm" />
      <DialogContent
        class="reel-viewer fixed inset-0 z-[60] flex items-center justify-center gap-3 p-3 outline-none sm:gap-6 sm:p-6"
        @keydown="onKeydown"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @click="onBackdropClick"
      >
        <DialogTitle class="sr-only">{{ t('store.home.reels.viewerLabel', { name: current?.name ?? '' }) }}</DialogTitle>
        <DialogDescription class="sr-only">{{ current?.place }}</DialogDescription>

        <button
          v-if="reels.length > 1"
          type="button"
          :class="[navButton, 'hidden sm:flex']"
          :aria-label="t('store.home.reels.previous')"
          @click="go(-1)"
        >
          <ArrowLeft class="size-6 rtl:-scale-x-100" aria-hidden="true" />
        </button>

        <div v-if="current" class="flex min-h-0 flex-col items-center gap-3">
          <div
            class="reel-stage relative aspect-[9/16] w-[min(88vw,calc((100svh-11.5rem)*0.5625))] overflow-hidden rounded-[28px] border border-serag-gold-hi/30 bg-[#0d1a12] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]"
          >
            <div v-if="!loaded" class="absolute inset-0 flex items-center justify-center" role="status">
              <span class="animate-pulse-soft size-14 rounded-full border-2 border-serag-gold-hi/50" aria-hidden="true" />
              <span class="sr-only">{{ t('store.home.reels.loading') }}</span>
            </div>
            <iframe
              :key="index ?? 0"
              :src="current.src"
              :title="t('store.home.reels.viewerLabel', { name: current.name })"
              class="reel-frame absolute inset-0 size-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              allowfullscreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
              referrerpolicy="strict-origin-when-cross-origin"
              @load="loaded = true"
            />
          </div>

          <div class="text-center text-serag-ivory">
            <p class="text-base font-bold">{{ current.name }}</p>
            <p v-if="current.place" class="mt-0.5 text-[13px] text-[#B9C7B6]">{{ current.place }}</p>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="reels.length > 1"
              type="button"
              :class="[navButton, 'sm:hidden']"
              :aria-label="t('store.home.reels.previous')"
              @click="go(-1)"
            >
              <ArrowLeft class="size-6 rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <span v-if="reels.length > 1" class="num min-w-12 text-center text-sm font-bold text-serag-gold-hi" aria-live="polite">
              {{ (index ?? 0) + 1 }} / {{ reels.length }}
            </span>
            <a
              :href="current.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-11 items-center gap-2 rounded-full border border-serag-ivory/40 px-5 text-sm font-bold text-serag-ivory transition-colors hover:bg-serag-ivory hover:text-serag-deep focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none"
            >
              {{ t('store.home.reels.openOnFacebook') }}
              <ExternalLink class="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </a>
            <button
              v-if="reels.length > 1"
              type="button"
              :class="[navButton, 'sm:hidden']"
              :aria-label="t('store.home.reels.next')"
              @click="go(1)"
            >
              <ArrowRight class="size-6 rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </div>
        </div>

        <button
          v-if="reels.length > 1"
          type="button"
          :class="[navButton, 'hidden sm:flex']"
          :aria-label="t('store.home.reels.next')"
          @click="go(1)"
        >
          <ArrowRight class="size-6 rtl:-scale-x-100" aria-hidden="true" />
        </button>

        <DialogClose
          class="absolute top-3 end-3 flex size-11 items-center justify-center rounded-full bg-black/40 text-serag-ivory backdrop-blur-sm transition-colors hover:bg-serag-ivory hover:text-serag-deep focus-visible:ring-2 focus-visible:ring-serag-gold focus-visible:outline-none sm:top-5 sm:end-5"
        >
          <X class="size-5" aria-hidden="true" />
          <span class="sr-only">{{ t('store.home.reels.close') }}</span>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
