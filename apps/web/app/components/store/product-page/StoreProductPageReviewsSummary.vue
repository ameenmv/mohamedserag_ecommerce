<script setup lang="ts">
import type { ReviewRatingSummary } from '@serag/shared'

const props = defineProps<{
  summary: ReviewRatingSummary
}>()

const { t, locale } = useI18n()

const levels = [5, 4, 3, 2, 1] as const

const formattedAverage = computed(() => Number(props.summary.average).toFixed(1))

const totalCountLabel = computed(() =>
  t(reviewCountKey(props.summary.count, locale.value), { count: props.summary.count }),
)

function getLevelPercentage(level: 1 | 2 | 3 | 4 | 5): number {
  if (!props.summary.count || props.summary.count <= 0) return 0
  const count = props.summary.distribution[level] ?? 0
  return Math.round((count / props.summary.count) * 100)
}

function getLevelCount(level: 1 | 2 | 3 | 4 | 5): number {
  return props.summary.distribution[level] ?? 0
}

function getLevelAria(level: 1 | 2 | 3 | 4 | 5): string {
  const count = getLevelCount(level)
  const countText = t(reviewCountKey(count, locale.value), { count })
  return t('store.reviews.distributionLabel', { stars: t(`store.reviews.starLabel.${level}`), count: countText })
}
</script>

<template>
  <div
    class="flex flex-col gap-6 rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-xs lg:flex-row lg:items-center lg:gap-12"
  >
    <!-- Left / Start: Overall Score, Stars, Total Count -->
    <div
      class="flex flex-col items-center justify-center gap-2 border-b border-border/80 pb-6 text-center lg:border-b-0 lg:border-e lg:pb-0 lg:pe-12 lg:min-w-[200px]"
    >
      <span class="num text-4xl sm:text-5xl font-extrabold text-foreground">
        {{ formattedAverage }}
      </span>

      <StoreProductRating
        :rating="{ average: summary.average, count: summary.count }"
        size="md"
        :show-count="false"
        :show-average="false"
      />

      <span class="text-xs sm:text-sm font-medium text-muted-foreground">
        {{ totalCountLabel }}
      </span>
    </div>

    <!-- Right / End: 5-star to 1-star distribution breakdown -->
    <div class="flex-1 flex flex-col gap-2.5">
      <div
        v-for="level in levels"
        :key="level"
        class="flex items-center gap-3 text-xs sm:text-sm"
        role="img"
        :aria-label="getLevelAria(level)"
      >
        <!-- Star level label, e.g. 5 نجوم -->
        <span class="num font-semibold text-foreground w-20 shrink-0 text-start">
          {{ t(`store.reviews.starLabel.${level}`) }}
        </span>

        <!-- Bar track with percentage width fill -->
        <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full bg-serag-gold transition-all duration-300"
            :style="{ width: `${getLevelPercentage(level)}%` }"
          />
        </div>

        <!-- Count per level -->
        <span class="num font-medium text-muted-foreground w-10 shrink-0 text-end">
          {{ getLevelCount(level) }}
        </span>
      </div>
    </div>
  </div>
</template>
