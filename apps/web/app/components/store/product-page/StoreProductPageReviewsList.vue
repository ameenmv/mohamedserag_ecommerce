<script setup lang="ts">
import type { PublicReview } from '@serag/shared'
import { AlertCircle, Loader2 } from '@lucide/vue'

const props = defineProps<{
  reviews: PublicReview[]
  total: number
  hasMore: boolean
  loadingMore: boolean
  error?: unknown
}>()

const emit = defineEmits<{
  loadMore: []
  retry: []
}>()

const { t } = useI18n()

const itemsEl = ref<HTMLElement | null>(null)
// Index of the first review a load-more will append; focus moves there so keyboard
// users are not dropped to <body> when the button disappears on the last page.
const focusIndexAfterLoad = ref<number | null>(null)

function requestMore(): void {
  focusIndexAfterLoad.value = props.reviews.length
  emit('loadMore')
}

watch(
  () => props.reviews.length,
  async (length) => {
    const index = focusIndexAfterLoad.value
    if (index === null || length <= index) return
    focusIndexAfterLoad.value = null
    await nextTick()
    itemsEl.value?.querySelectorAll<HTMLElement>('[data-testid="review-item"]')[index]?.focus()
  },
)
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5">
    <!-- List of review items -->
    <div ref="itemsEl" class="flex flex-col gap-3 sm:gap-4">
      <StoreProductPageReviewsItem
        v-for="item in reviews"
        :key="item.id"
        :review="item"
      />
    </div>

    <!-- Status counter line (polite live announcement) -->
    <p
      aria-live="polite"
      class="num text-xs sm:text-sm text-muted-foreground text-center"
    >
      {{ t('store.reviews.showingCount', { shown: reviews.length, total }) }}
    </p>

    <!-- Inline error with retry -->
    <div
      v-if="error"
      role="alert"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs sm:text-sm text-destructive"
    >
      <div class="flex items-center gap-2">
        <AlertCircle class="size-4 shrink-0" aria-hidden="true" />
        <span>{{ t('store.reviews.loadError') }}</span>
      </div>
      <button
        type="button"
        class="min-h-11 px-3 py-1 font-bold underline hover:opacity-80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        @click="emit('retry')"
      >
        {{ t('store.reviews.retry') }}
      </button>
    </div>

    <!-- Load More Button (44px target, brand style) -->
    <div v-if="hasMore" class="flex justify-center pt-2">
      <button
        type="button"
        :disabled="loadingMore"
        class="inline-flex min-h-11 min-w-36 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-bold text-foreground shadow-xs transition-colors hover:bg-secondary hover:border-serag-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        @click="requestMore"
      >
        <Loader2 v-if="loadingMore" class="size-4 animate-spin text-serag-gold" aria-hidden="true" />
        <span>{{ loadingMore ? t('store.reviews.loadingMore') : t('store.reviews.loadMore') }}</span>
      </button>
    </div>
  </div>
</template>
