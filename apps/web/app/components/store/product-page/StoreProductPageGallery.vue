<script setup lang="ts">
import { ChevronLeft, ChevronRight, Package } from '@lucide/vue'
import type { ProductDetailImage } from '@serag/shared'

const props = defineProps<{
  images: ProductDetailImage[]
  productName: string
}>()

const { t } = useI18n()
const currentIndex = ref(0)

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
  currentIndex.value =
    (currentIndex.value - 1 + props.images.length) % props.images.length
}

function next(): void {
  if (props.images.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Main image viewport -->
    <div
      class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-border bg-serag-ivory/60 p-4 sm:p-8 dark:bg-muted/30"
    >
      <!-- NuxtImg with explicit width/height and LCP prioritization on first image -->
      <NuxtImg
        v-if="currentImage?.url"
        :src="currentImage.url"
        :alt="currentImage.alt || productName"
        width="600"
        height="600"
        :loading="currentIndex === 0 ? 'eager' : 'lazy'"
        :fetchpriority="currentIndex === 0 ? 'high' : 'auto'"
        class="size-full object-contain transition-transform duration-300"
      />

      <!-- Neutral placeholder when images are missing -->
      <div
        v-else
        class="flex size-full items-center justify-center text-muted-foreground/35"
        aria-hidden="true"
      >
        <Package class="size-20 stroke-[1.2]" />
      </div>

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
          @click="prev"
        >
          <ChevronRight class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>

        <button
          type="button"
          :aria-label="t('store.productPage.gallery.next')"
          class="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm backdrop-blur-xs transition-colors hover:border-serag-gold hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="next"
        >
          <ChevronLeft class="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Thumbnail Strip -->
    <div
      v-if="hasMultiple"
      class="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-3"
      role="group"
      :aria-label="productName"
    >
      <button
        v-for="(img, idx) in images"
        :key="img.id || idx"
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
            ? 'border-serag-gold bg-background shadow-xs ring-2 ring-serag-gold/20'
            : 'border-border/80 bg-serag-ivory/40 hover:border-serag-gold/50 dark:bg-muted/20',
        ]"
        @click="currentIndex = idx"
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
  </div>
</template>
