<script setup lang="ts">
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from '@lucide/vue'

const { t } = useI18n()
const { track } = useAnalytics()

const {
  slug,
  category,
  total,
  current,
  currentAnswer,
  isLast,
  step,
  submitting,
  results,
  submitError,
  unsureValue,
  setAnswer,
  next,
  previous,
  submit,
  reset,
} = await useQuiz()

const pageTitle = computed(() => t('store.quiz.seoTitle', { category: category.value.name }))
const pageDescription = computed(() => t('store.quiz.seoDescription', { category: category.value.name }))

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  robots: 'noindex, follow',
})

const breadcrumbItems = computed(() => [
  { label: category.value.name, to: `/c/${slug.value}` },
  { label: t('store.quiz.heading') },
])

const answeredCurrent = computed(() => currentAnswer.value !== null)

watch(results, (next) => {
  if (next) {
    track('quiz_completed', {
      category: slug.value,
      fallback: next.fallback,
      resultCount: next.items.length,
    })
  }
})

function onRestart(): void {
  reset()
}
</script>

<template>
  <main class="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <StoreListingBreadcrumb :items="breadcrumbItems" />

    <div class="mt-4 flex items-center gap-2">
      <Sparkles class="size-6 text-serag-gold" aria-hidden="true" />
      <h1 class="font-display text-2xl text-foreground sm:text-3xl">{{ t('store.quiz.heading') }}</h1>
    </div>
    <p class="mt-2 text-sm text-muted-foreground">{{ t('store.quiz.intro', { category: category.name }) }}</p>

    <div
      v-if="submitError"
      class="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 p-5"
      role="alert"
    >
      <p class="text-sm font-semibold text-destructive">{{ t('store.quiz.error') }}</p>
      <button
        type="button"
        class="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-5 font-bold text-foreground transition-colors hover:border-serag-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        @click="submit()"
      >
        {{ t('common.retry') }}
      </button>
    </div>

    <StoreQuizResults
      v-else-if="results"
      class="mt-6"
      :results="results"
      :category-slug="slug"
      :category-name="category.name"
      @restart="onRestart"
    />

    <div v-else-if="current" class="mt-6 rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_48px_-32px_rgba(20,32,26,.3)] sm:p-8">
      <StoreQuizProgress :current="step + 1" :total="total" />

      <div class="mt-6">
        <StoreQuizQuestion
          :question="current"
          :selected="currentAnswer"
          :disabled="submitting"
          :unsure-value="unsureValue"
          @select="setAnswer"
        />
      </div>

      <div class="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          :disabled="step <= 0 || submitting"
          class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 font-bold text-foreground transition-colors hover:border-serag-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          @click="previous"
        >
          <ArrowLeft class="size-4 rtl:-scale-x-100" aria-hidden="true" />
          <span>{{ t('store.quiz.previous') }}</span>
        </button>

        <button
          v-if="!isLast"
          type="button"
          :disabled="!answeredCurrent || submitting"
          class="inline-flex min-h-11 items-center gap-2 rounded-full bg-serag-green px-5 font-bold text-white transition-colors hover:bg-serag-night focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          @click="next"
        >
          <span>{{ t('store.quiz.next') }}</span>
          <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>

        <button
          v-else
          type="button"
          :disabled="!answeredCurrent || submitting"
          class="inline-flex min-h-11 items-center gap-2 rounded-full bg-serag-gold px-5 font-bold text-serag-night transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          @click="submit()"
        >
          <Loader2 v-if="submitting" class="size-4 animate-spin" aria-hidden="true" />
          <span>{{ t('store.quiz.showResults') }}</span>
        </button>
      </div>
    </div>
  </main>
</template>
