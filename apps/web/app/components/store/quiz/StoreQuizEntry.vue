<script setup lang="ts">
import { Sparkles } from '@lucide/vue'

const props = defineProps<{
  slug: string
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const storeApi = useStoreApi()

const { data: quiz } = await useAsyncData(
  () => `quiz-exists:${props.slug}`,
  () => storeApi.quiz(props.slug).catch(() => null),
)

const hasQuiz = computed(() => Boolean(quiz.value && quiz.value.questions.length > 0))
</script>

<template>
  <NuxtLink
    v-if="hasQuiz"
    :to="localePath(`/help-me-choose/${slug}`)"
    class="mt-4 flex items-center gap-3 rounded-2xl border border-serag-gold/40 bg-serag-gold/10 p-3.5 transition-colors hover:border-serag-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-4 motion-reduce:transition-none"
  >
    <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-serag-gold text-serag-night">
      <Sparkles class="size-5" aria-hidden="true" />
    </span>
    <span class="flex min-w-0 flex-col">
      <span class="font-bold text-foreground">{{ t('store.quiz.entryCta') }}</span>
      <span class="text-xs text-muted-foreground">{{ t('store.quiz.entryHint') }}</span>
    </span>
  </NuxtLink>
</template>
