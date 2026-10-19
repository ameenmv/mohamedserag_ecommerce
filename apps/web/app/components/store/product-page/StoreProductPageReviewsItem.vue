<script setup lang="ts">
import type { PublicReview } from '@serag/shared'
import { BadgeCheck, MessageSquare, Star } from '@lucide/vue'

const props = defineProps<{
  review: PublicReview
}>()

const { t, locale } = useI18n()

const formattedDate = computed(() => formatDate(props.review.createdAt, locale.value))
</script>

<template>
  <article
    data-testid="review-item"
    class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm"
  >
    <!-- Header: Reviewer info, verified badge, and date -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Name as entered -->
        <span class="font-bold text-foreground text-sm sm:text-base">
          {{ review.name }}
        </span>

        <!-- Verified buyer badge («اشترى من المعرض») -->
        <span
          v-if="review.verifiedBuyer"
          class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20"
        >
          <BadgeCheck class="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{{ t('store.reviews.verifiedBuyer') }}</span>
        </span>
      </div>

      <!-- Creation Date (Cairo time zone, Latin numbers) -->
      <time :datetime="review.createdAt" class="num text-xs text-muted-foreground">
        {{ formattedDate }}
      </time>
    </div>

    <!-- Star Rating for this review -->
    <div class="flex items-center gap-1">
      <span class="sr-only">
        {{ t('store.reviews.starsOutOfFive', { stars: review.stars }) }}
      </span>
      <div class="inline-flex items-center gap-0.5" aria-hidden="true">
        <Star
          v-for="i in 5"
          :key="i"
          class="size-4 shrink-0 transition-colors"
          :class="i <= review.stars ? 'fill-serag-gold text-serag-gold' : 'text-muted-foreground/30 fill-transparent'"
        />
      </div>
    </div>

    <!-- Review Text (Plain text, preserved line breaks, NEVER v-html) -->
    <p class="whitespace-pre-line break-words text-xs sm:text-sm text-foreground/90 leading-relaxed">
      {{ review.text }}
    </p>

    <!-- Store Reply block («رد المعرض») -->
    <div
      v-if="review.reply"
      class="mt-1 rounded-xl border border-serag-gold/30 bg-serag-ivory/70 p-3 sm:p-4 dark:bg-muted/30 ms-3 sm:ms-5 border-s-4 border-s-serag-gold"
    >
      <div class="flex items-center gap-1.5 mb-1.5">
        <MessageSquare class="size-3.5 text-serag-gold shrink-0" aria-hidden="true" />
        <span class="text-xs font-bold text-serag-night dark:text-serag-gold-hi">
          {{ t('store.reviews.storeReplyTitle') }}
        </span>
      </div>
      <p class="whitespace-pre-line break-words text-xs sm:text-sm text-foreground/85 leading-relaxed">
        {{ review.reply }}
      </p>
    </div>
  </article>
</template>
