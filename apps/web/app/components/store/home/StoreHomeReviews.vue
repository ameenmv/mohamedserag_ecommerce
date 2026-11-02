<script setup lang="ts">
import { BadgeCheck, Star } from '@lucide/vue'
import type { HomeContent, StoreReview, StoreReviewsResponse } from '@serag/shared'
import { loadGsap } from '~/composables/useGsap'

const props = defineProps<{
  content: HomeContent['reviews']
  reviews: StoreReviewsResponse | null
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const headingId = useId()
const rootRef = ref<HTMLElement | null>(null)

const summary = computed(() => props.reviews?.summary ?? { average: 0, count: 0 })
const items = computed(() => props.reviews?.items ?? [])

interface ReviewWithIndex extends StoreReview {
  overallIndex: number
}

// Alternating split: column A gets even indexes (0, 2, 4...), column B gets odd indexes (1, 3, 5...)
const columnA = computed<ReviewWithIndex[]>(() => {
  const list: ReviewWithIndex[] = []
  for (const [index, review] of items.value.entries()) {
    if (index % 2 === 0) list.push({ ...review, overallIndex: index })
  }
  return list
})

const columnB = computed<ReviewWithIndex[]>(() => {
  const list: ReviewWithIndex[] = []
  for (const [index, review] of items.value.entries()) {
    if (index % 2 !== 0) list.push({ ...review, overallIndex: index })
  }
  return list
})

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return ''
  }
}

// Parallax scroll motion on wide screens, initialized on visitor's first interaction
let stopMotion: (() => void) | undefined
let unmounted = false

onMounted(async () => {
  const kit = await loadGsap()
  if (!kit || unmounted || !rootRef.value) return
  const { startReviewsMotion } = await import('~/utils/reviews-motion')
  if (unmounted || !rootRef.value) return
  stopMotion = startReviewsMotion(kit, rootRef.value)
})

onBeforeUnmount(() => {
  unmounted = true
  stopMotion?.()
})
</script>

<template>
  <section
    v-if="items.length >= 4"
    ref="rootRef"
    class="relative overflow-clip bg-serag-cream dark:bg-background"
    :aria-labelledby="headingId"
  >
    <!-- Soft decorative radial glows -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute -top-36 -start-36 size-[38rem] rounded-full bg-[radial-gradient(circle,rgba(201,177,137,0.22)_0%,rgba(201,177,137,0)_70%)]" />
      <div class="absolute -bottom-36 -end-36 size-[38rem] rounded-full bg-[radial-gradient(circle,rgba(85,120,64,0.18)_0%,rgba(85,120,64,0)_70%)]" />
    </div>

    <div class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div class="grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
        <!-- Cards Column A (start side on lg) -->
        <div
          data-review-col="a"
          class="order-2 flex min-w-0 flex-col gap-6 sm:order-2 sm:col-span-1 lg:order-1 lg:col-span-1 lg:col-start-1 lg:row-start-1"
        >
          <article
            v-for="(review, colIndex) in columnA"
            :key="review.id"
            data-review-card
            :class="[
              review.overallIndex >= 6 ? 'hidden lg:flex' : 'flex',
              colIndex % 2 === 0 ? '-rotate-1' : 'rotate-1',
              colIndex % 2 === 1 ? 'lg:-me-10' : '',
              'relative z-10 flex-col gap-3 rounded-[24px] border border-border/70 bg-card p-6 shadow-[0_18px_40px_-28px_rgba(20,20,18,0.35)] transition-shadow hover:shadow-[0_22px_48px_-24px_rgba(20,20,18,0.45)]',
            ]"
          >
            <div class="flex items-center gap-1 text-serag-gold" aria-hidden="true">
              <Star v-for="n in review.stars" :key="n" class="size-4 fill-current" />
            </div>
            <p class="sr-only">{{ t('store.home.reviews.rating', { average: review.stars }) }}</p>
            <p class="line-clamp-6 text-base leading-[1.85] text-foreground">{{ review.text }}</p>

            <div class="mt-auto flex flex-col gap-2 border-t border-border/70 pt-3">
              <div class="flex items-center justify-between gap-2">
                <p class="flex items-center gap-1.5 font-bold text-foreground">
                  <span>{{ review.name }}</span>
                  <span v-if="review.verifiedBuyer" class="inline-flex items-center gap-1 text-xs font-semibold text-serag-green">
                    <BadgeCheck class="size-4" aria-hidden="true" />
                    {{ t('store.home.reviews.verified') }}
                  </span>
                </p>
                <time v-if="formatDate(review.createdAt)" :datetime="review.createdAt" class="text-xs text-muted-foreground">
                  {{ formatDate(review.createdAt) }}
                </time>
              </div>

              <NuxtLink
                v-if="review.product?.slug"
                :to="localePath(`/p/${review.product.slug}`)"
                class="max-w-full truncate text-xs text-muted-foreground underline-offset-4 hover:text-serag-gold-ink hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {{ t('store.home.reviews.about', { product: review.product.name }) }}
              </NuxtLink>
            </div>
          </article>
        </div>

        <!-- Headline Column (middle on lg, top on mobile/tablet) -->
        <div
          class="order-1 flex flex-col items-center gap-6 text-center sm:order-1 sm:col-span-2 lg:order-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-[22vh] lg:self-start"
        >
          <p
            v-if="content.eyebrow"
            class="eyebrow inline-flex items-center rounded-full border border-serag-gold/40 bg-serag-gold/10 px-4 py-1.5 text-xs font-bold text-serag-gold-ink"
          >
            {{ content.eyebrow }}
          </p>

          <h2
            :id="headingId"
            class="font-display text-[clamp(40px,7.5vw,64px)] leading-[0.95] text-center lg:text-[clamp(64px,8vw,128px)]"
          >
            <span class="block text-serag-green">{{ content.title }}</span>
            <span v-if="content.highlight" class="ink-fill block text-serag-gold-ink">{{ content.highlight }}</span>
          </h2>

          <div v-if="summary.count > 0" class="flex items-center gap-4">
            <p class="num text-[54px] font-extrabold leading-none text-serag-green lg:text-[64px]" dir="ltr">
              {{ summary.average.toFixed(1) }}
            </p>
            <div class="flex flex-col items-start gap-1">
              <div class="flex gap-0.5 text-serag-gold" aria-hidden="true">
                <Star v-for="n in 5" :key="n" class="size-5 fill-current" />
              </div>
              <p class="text-sm text-muted-foreground">
                <span class="sr-only">{{ t('store.home.reviews.rating', { average: summary.average.toFixed(1) }) }}</span>
                {{ t('store.home.reviews.ratingCount', { count: summary.count }) }}
              </p>
            </div>
          </div>

          <p
            v-if="content.subtitle"
            class="max-w-[460px] text-base leading-[1.85] text-[#4A4640] dark:text-foreground sm:text-lg"
          >
            {{ content.subtitle }}
          </p>
        </div>

        <!-- Cards Column B (end side on lg, offset pt-40) -->
        <div
          data-review-col="b"
          class="order-3 flex min-w-0 flex-col gap-6 pt-0 sm:order-3 sm:col-span-1 lg:order-3 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:pt-40"
        >
          <article
            v-for="(review, colIndex) in columnB"
            :key="review.id"
            data-review-card
            :class="[
              review.overallIndex >= 6 ? 'hidden lg:flex' : 'flex',
              colIndex % 2 === 0 ? 'rotate-1' : '-rotate-1',
              colIndex % 2 === 0 ? 'lg:-ms-10' : '',
              'relative z-10 flex-col gap-3 rounded-[24px] border border-border/70 bg-card p-6 shadow-[0_18px_40px_-28px_rgba(20,20,18,0.35)] transition-shadow hover:shadow-[0_22px_48px_-24px_rgba(20,20,18,0.45)]',
            ]"
          >
            <div class="flex items-center gap-1 text-serag-gold" aria-hidden="true">
              <Star v-for="n in review.stars" :key="n" class="size-4 fill-current" />
            </div>
            <p class="sr-only">{{ t('store.home.reviews.rating', { average: review.stars }) }}</p>
            <p class="line-clamp-6 text-base leading-[1.85] text-foreground">{{ review.text }}</p>

            <div class="mt-auto flex flex-col gap-2 border-t border-border/70 pt-3">
              <div class="flex items-center justify-between gap-2">
                <p class="flex items-center gap-1.5 font-bold text-foreground">
                  <span>{{ review.name }}</span>
                  <span v-if="review.verifiedBuyer" class="inline-flex items-center gap-1 text-xs font-semibold text-serag-green">
                    <BadgeCheck class="size-4" aria-hidden="true" />
                    {{ t('store.home.reviews.verified') }}
                  </span>
                </p>
                <time v-if="formatDate(review.createdAt)" :datetime="review.createdAt" class="text-xs text-muted-foreground">
                  {{ formatDate(review.createdAt) }}
                </time>
              </div>

              <NuxtLink
                v-if="review.product?.slug"
                :to="localePath(`/p/${review.product.slug}`)"
                class="max-w-full truncate text-xs text-muted-foreground underline-offset-4 hover:text-serag-gold-ink hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {{ t('store.home.reviews.about', { product: review.product.name }) }}
              </NuxtLink>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
