<script setup lang="ts">
import { BadgeCheck, Pause, Play, Star } from '@lucide/vue'
import type { HomeContent, StoreReview, StoreReviewsResponse } from '@serag/shared'

const props = defineProps<{
  content: HomeContent['reviews']
  reviews: StoreReviewsResponse | null
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const hydrated = useHydrated()
const headingId = useId()

const summary = computed(() => props.reviews?.summary ?? { average: 0, count: 0 })

// Two columns that drift in opposite directions; each list is rendered twice for a seamless loop
const columns = computed<StoreReview[][]>(() => {
  const up: StoreReview[] = []
  const down: StoreReview[] = []
  for (const [index, review] of (props.reviews?.items ?? []).entries()) {
    if (index % 2 === 0) up.push(review)
    else down.push(review)
  }
  return [up, down]
})

// Moving content needs a way to stop it (WCAG 2.2.2); hovering or focusing a card pauses it too
const paused = ref(false)
</script>

<template>
  <section class="relative overflow-clip bg-serag-cream" :aria-labelledby="headingId">
    <div class="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-10 lg:py-28">
      <div class="flex flex-col gap-5">
        <p v-if="content.eyebrow" class="eyebrow text-serag-gold-ink">{{ content.eyebrow }}</p>
        <h2 :id="headingId" class="font-display text-[clamp(42px,5.5vw,76px)] leading-none text-serag-green">
          {{ content.title }}
          <span v-if="content.highlight" class="ink-fill text-serag-gold-ink">{{ content.highlight }}</span>
        </h2>
        <p v-if="content.subtitle" class="max-w-[460px] text-lg leading-[1.9] text-[#4A4640]">{{ content.subtitle }}</p>

        <div v-if="summary.count > 0" class="mt-2 flex items-center gap-4">
          <p class="num text-[64px] leading-none font-extrabold text-serag-green" dir="ltr">{{ summary.average.toFixed(1) }}</p>
          <div class="flex flex-col gap-1.5">
            <div class="flex gap-0.5 text-serag-gold" aria-hidden="true">
              <Star v-for="n in 5" :key="n" class="size-5 fill-current" />
            </div>
            <p class="text-sm text-muted-foreground">
              <span class="sr-only">{{ t('store.home.reviews.rating', { average: summary.average.toFixed(1) }) }}</span>
              {{ t('store.home.reviews.ratingCount', { count: summary.count }) }}
            </p>
          </div>
        </div>

        <button
          type="button"
          :disabled="!hydrated"
          :aria-pressed="paused"
          class="mt-1 inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-serag-gold/50 px-5 text-sm font-bold text-serag-gold-ink transition-colors hover:bg-serag-gold/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 motion-reduce:hidden"
          @click="paused = !paused"
        >
          <component :is="paused ? Play : Pause" class="size-4" aria-hidden="true" />
          {{ paused ? t('store.home.reviews.play') : t('store.home.reviews.pause') }}
        </button>
      </div>

      <div :class="['reviews-wall grid h-[520px] grid-cols-1 gap-4 sm:h-[600px] sm:grid-cols-2', paused && 'is-paused']">
        <div
          v-for="(column, columnIndex) in columns"
          :key="columnIndex"
          :class="['min-w-0', columnIndex === 1 && 'reviews-col-down hidden sm:block']"
        >
          <div class="reviews-track flex flex-col gap-4">
            <template v-for="copy in 2" :key="copy">
              <article
                v-for="review in column"
                :key="`${copy}-${review.id}`"
                :aria-hidden="copy === 2 ? 'true' : undefined"
                class="flex flex-col gap-3 rounded-[26px] border border-[#E6DFCF] bg-card p-6 shadow-[0_18px_40px_-28px_rgba(20,20,18,.35)]"
              >
                <div class="flex gap-0.5 text-serag-gold" aria-hidden="true">
                  <Star v-for="n in review.stars" :key="n" class="size-4 fill-current" />
                </div>
                <p class="sr-only">{{ t('store.home.reviews.rating', { average: review.stars }) }}</p>
                <p class="line-clamp-5 text-base leading-[1.85] text-foreground">{{ review.text }}</p>
                <div class="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                  <p class="flex items-center gap-1.5 font-bold text-foreground">
                    {{ review.name }}
                    <span v-if="review.verifiedBuyer" class="inline-flex items-center gap-1 text-xs font-semibold text-serag-green">
                      <BadgeCheck class="size-4" aria-hidden="true" />
                      {{ t('store.home.reviews.verified') }}
                    </span>
                  </p>
                  <NuxtLink
                    :to="localePath(`/p/${review.product.slug}`)"
                    :tabindex="copy === 2 ? -1 : undefined"
                    class="max-w-full truncate text-xs text-muted-foreground underline-offset-4 hover:text-serag-gold-ink hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {{ t('store.home.reviews.about', { product: review.product.name }) }}
                  </NuxtLink>
                </div>
              </article>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
