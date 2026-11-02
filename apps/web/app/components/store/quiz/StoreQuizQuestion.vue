<script setup lang="ts">
import type { QuizQuestion } from '@serag/shared'

const props = defineProps<{
  question: QuizQuestion
  selected: string | null
  disabled?: boolean
  unsureValue: string
}>()

const emit = defineEmits<{
  select: [answerId: string]
}>()

const { t } = useI18n()
const legend = ref<HTMLElement | null>(null)

/** Move focus to the new question's legend on every step change (keyboard + screen readers). */
watch(
  () => props.question.id,
  async () => {
    await nextTick()
    legend.value?.focus()
  },
)

function onSelect(answerId: string): void {
  if (props.disabled) return
  emit('select', answerId)
}
</script>

<template>
  <fieldset class="min-w-0">
    <legend
      ref="legend"
      tabindex="-1"
      class="font-display text-xl font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-2xl"
    >
      {{ question.text }}
    </legend>

    <div class="mt-4 flex flex-col gap-2.5">
      <label
        v-for="answer in question.answers"
        :key="answer.id"
        class="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-bold sm:text-base text-foreground transition-colors hover:border-serag-gold/60 focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none"
        :class="selected === answer.id ? 'border-serag-green bg-serag-cream' : ''"
      >
        <input
          type="radio"
          :name="`quiz-${question.id}`"
          :value="answer.id"
          :checked="selected === answer.id"
          :disabled="disabled"
          class="size-5 shrink-0 accent-serag-green"
          @change="onSelect(answer.id)"
        >
        <span>{{ answer.text }}</span>
      </label>

      <label
        class="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-sm font-bold sm:text-base text-muted-foreground transition-colors hover:border-serag-gold/60 focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none"
        :class="selected === unsureValue ? 'border-serag-green bg-serag-cream text-foreground' : ''"
      >
        <input
          type="radio"
          :name="`quiz-${question.id}`"
          :value="unsureValue"
          :checked="selected === unsureValue"
          :disabled="disabled"
          class="size-5 shrink-0 accent-serag-green"
          @change="onSelect(unsureValue)"
        >
        <span>{{ t('store.quiz.unsure') }}</span>
      </label>
    </div>
  </fieldset>
</template>
