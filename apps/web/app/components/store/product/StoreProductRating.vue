<script setup lang="ts">
import type { ProductRating } from '@serag/shared'
import { Star } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    rating: ProductRating
    size?: 'sm' | 'md'
    showCount?: boolean
    showAverage?: boolean
  }>(),
  {
    size: 'sm',
    showCount: true,
    showAverage: true,
  },
)

const { t, locale } = useI18n()

const starSizeClass = computed(() => (props.size === 'md' ? 'size-4.5' : 'size-3.5'))

const formattedAverage = computed(() => Number(props.rating.average).toFixed(1))

const countLabel = computed(() =>
  t(reviewCountKey(props.rating.count, locale.value), { count: props.rating.count }),
)

const srText = computed(() =>
  t('store.reviews.ratingSrText', {
    average: formattedAverage.value,
    count: countLabel.value,
  }),
)

/**
 * Determines whether a star should be fully filled, half filled, or empty.
 * Decimal part >= 0.5 results in a half star.
 */
function getStarFill(index: number, avg: number): 'full' | 'half' | 'empty' {
  if (avg >= index) {
    return 'full'
  }
  if (avg >= index - 0.5) {
    return 'half'
  }
  return 'empty'
}
</script>

<template>
  <span
    class="inline-flex flex-wrap items-center"
    :class="props.size === 'md' ? 'gap-x-1.5 gap-y-0.5' : 'gap-x-1 gap-y-0.5'"
  >
    <!-- Screen-reader accessible announcement -->
    <span class="sr-only">{{ srText }}</span>

    <!-- Visual 5 Stars (aria-hidden) -->
    <span class="inline-flex items-center gap-0.5" aria-hidden="true">
      <span
        v-for="i in 5"
        :key="i"
        class="relative inline-flex items-center justify-center shrink-0"
        :class="starSizeClass"
      >
        <!-- Background empty star -->
        <Star class="size-full text-muted-foreground/30 fill-transparent" />

        <!-- Clipped filled overlay growing from reading start (start-0 in RTL and LTR) -->
        <span
          v-if="getStarFill(i, rating.average) !== 'empty'"
          class="absolute inset-y-0 start-0 overflow-hidden"
          :class="getStarFill(i, rating.average) === 'full' ? 'w-full' : 'w-1/2'"
        >
          <!-- Sized like the outer star (not the clipping box) so a half fill clips instead of squishing -->
          <Star class="absolute inset-y-0 start-0 max-w-none fill-serag-gold text-serag-gold" :class="starSizeClass" />
        </span>
      </span>
    </span>

    <!-- Average score with .num tabular numbers -->
    <span
      v-if="showAverage"
      class="num font-bold text-foreground"
      :class="props.size === 'md' ? 'text-sm sm:text-base' : 'text-xs'"
    >
      {{ formattedAverage }}
    </span>

    <!-- Count label with Arabic plurals -->
    <span
      v-if="showCount"
      class="whitespace-nowrap text-muted-foreground"
      :class="props.size === 'md' ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs'"
    >
      {{ countLabel }}
    </span>
  </span>
</template>
