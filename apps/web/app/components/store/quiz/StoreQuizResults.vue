<script setup lang="ts">
import type { QuizResultsResponse } from '@serag/shared'
import { ArrowRight, Sparkles } from '@lucide/vue'

const props = defineProps<{
  results: QuizResultsResponse
  categorySlug: string
  categoryName: string
}>()

const emit = defineEmits<{
  restart: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const heading = ref<HTMLElement | null>(null)

function reasonLabel(reason: string | null): string {
  return reason && reason.trim().length > 0
    ? t('store.quiz.reason', { reason })
    : t('store.quiz.popularReason')
}

onMounted(() => {
  heading.value?.focus()
})
</script>

<template>
  <div aria-live="polite">
    <h2
      ref="heading"
      tabindex="-1"
      class="font-display text-2xl font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-3xl"
    >
      {{ t('store.quiz.resultsHeading', { category: categoryName }) }}
    </h2>

    <p
      v-if="props.results.fallback"
      class="mt-2 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
    >
      {{ t('store.quiz.fallbackNotice') }}
    </p>

    <div
      v-if="props.results.items.length === 0"
      class="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border p-8 text-center"
    >
      <Sparkles class="size-8 text-serag-gold" aria-hidden="true" />
      <p class="text-sm text-muted-foreground">{{ t('store.quiz.emptyResults') }}</p>
      <NuxtLink
        :to="localePath(`/c/${categorySlug}`)"
        class="inline-flex min-h-11 items-center gap-2 rounded-full bg-serag-green px-5 font-bold text-white transition-colors hover:bg-serag-night focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span>{{ t('store.quiz.seeAll') }}</span>
        <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </NuxtLink>
    </div>

    <template v-else>
      <ul class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <li v-for="item in props.results.items" :key="item.product.id" class="flex flex-col gap-2">
          <StoreProductCard :product="item.product" />
          <p class="rounded-lg bg-serag-gold/10 px-2.5 py-1.5 text-xs font-semibold text-serag-night dark:text-serag-gold">
            {{ reasonLabel(item.reason) }}
          </p>
        </li>
      </ul>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 font-bold text-foreground transition-colors hover:border-serag-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="emit('restart')"
        >
          {{ t('store.quiz.restart') }}
        </button>
        <NuxtLink
          :to="localePath(`/c/${categorySlug}`)"
          class="inline-flex min-h-11 items-center gap-2 rounded-full bg-serag-green px-5 font-bold text-white transition-colors hover:bg-serag-night focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span>{{ t('store.quiz.seeAll') }}</span>
          <ArrowRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
