<script setup lang="ts">
import type {
  AdminQuizSpecField,
  AdminQuizState,
  QuizDefinition,
  QuizOperator,
  QuizRule,
} from '@serag/shared'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseAdminApiError } from '~/utils/admin-api-errors'
import {
  QUIZ_ID_PATTERN,
  buildQuizBody,
  createEmptyDefinition,
  isOperatorAllowed,
  mapQuizFieldErrors,
  moveItem,
  newAnswer,
  newQuestion,
  operatorOptionsForType,
} from '~/utils/admin-quiz-editor'

const props = defineProps<{
  categoryId: string
}>()

const emit = defineEmits<{
  back: []
  saved: []
  deleted: []
}>()

const MAX_QUESTIONS = 5
const MIN_QUESTIONS = 3
const MAX_ANSWERS = 6
const MIN_ANSWERS = 2
const MAX_QUESTION_LEN = 120
const MAX_ANSWER_LEN = 60
const MAX_REASON_LEN = 60

const { t } = useI18n()
const quizApi = useAdminQuiz()
const notify = useNotify()

const hydrated = ref(false)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const deleting = ref(false)
const deleteOpen = ref(false)

const state = ref<AdminQuizState | null>(null)
const definition = ref<QuizDefinition>(createEmptyDefinition())
const fieldErrors = ref<Record<string, string>>({})

const specFields = computed<AdminQuizSpecField[]>(() => state.value?.specFields ?? [])
const warnings = computed<string[]>(() => state.value?.warnings ?? [])
const categoryName = computed(() => state.value?.category.name ?? '')

const fieldByKey = computed(() => {
  const map = new Map<string, AdminQuizSpecField>()
  for (const field of specFields.value) map.set(field.key, field)
  return map
})

function fieldError(scope: 'question' | 'answer' | 'rule', index: number, sub?: string): string | undefined {
  const key = sub ? `${scope}.${index}.${sub}` : `${scope}.${index}`
  return fieldErrors.value[key]
}

function applyState(next: AdminQuizState): void {
  state.value = next
  definition.value = next.definition ?? createEmptyDefinition()
  fieldErrors.value = {}
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    applyState(await quizApi.get(props.categoryId))
  } catch {
    loadError.value = t('admin.content.quiz.editorLoadError')
  } finally {
    loading.value = false
  }
}

/* ---------- questions ---------- */

function addQuestion(): void {
  if (definition.value.questions.length >= MAX_QUESTIONS) return
  definition.value = {
    ...definition.value,
    questions: [...definition.value.questions, newQuestion(definition.value.questions.length)],
  }
}

function removeQuestion(index: number): void {
  if (definition.value.questions.length <= MIN_QUESTIONS) return
  const removed = definition.value.questions[index]
  const questions = definition.value.questions.filter((_, i) => i !== index)
  const removedAnswerIds = new Set(removed?.answers.map((a) => a.id) ?? [])
  definition.value = {
    questions,
    rules: definition.value.rules.filter((rule) => !removedAnswerIds.has(rule.answerId)),
  }
}

function moveQuestion(index: number, direction: -1 | 1): void {
  definition.value = {
    ...definition.value,
    questions: moveItem(definition.value.questions, index, direction),
  }
}

function setQuestionId(index: number, value: string): void {
  const question = definition.value.questions[index]
  if (!question) return
  const oldId = question.id
  const next = definition.value.questions.map((q, i) => (i === index ? { ...q, id: value } : q))
  definition.value = {
    questions: next,
    rules: definition.value.rules.map((rule) =>
      rule.answerId.startsWith(`${oldId}-`)
        ? { ...rule, answerId: `${value}-${rule.answerId.slice(oldId.length + 1)}` }
        : rule,
    ),
  }
}

function setQuestionText(index: number, value: string): void {
  definition.value = {
    ...definition.value,
    questions: definition.value.questions.map((q, i) => (i === index ? { ...q, text: value } : q)),
  }
}

/* ---------- answers ---------- */

function addAnswer(questionIndex: number): void {
  const question = definition.value.questions[questionIndex]
  if (!question || question.answers.length >= MAX_ANSWERS) return
  definition.value = {
    ...definition.value,
    questions: definition.value.questions.map((q, i) =>
      i === questionIndex ? { ...q, answers: [...q.answers, newAnswer(q.answers.length)] } : q,
    ),
  }
}

function removeAnswer(questionIndex: number, answerIndex: number): void {
  const question = definition.value.questions[questionIndex]
  if (!question || question.answers.length <= MIN_ANSWERS) return
  const removed = question.answers[answerIndex]
  const questions = definition.value.questions.map((q, i) =>
    i === questionIndex ? { ...q, answers: q.answers.filter((_, a) => a !== answerIndex) } : q,
  )
  definition.value = {
    questions,
    rules: removed
      ? definition.value.rules.filter((rule) => rule.answerId !== removed.id)
      : definition.value.rules,
  }
}

function moveAnswer(questionIndex: number, answerIndex: number, direction: -1 | 1): void {
  definition.value = {
    ...definition.value,
    questions: definition.value.questions.map((q, i) =>
      i === questionIndex ? { ...q, answers: moveItem(q.answers, answerIndex, direction) } : q,
    ),
  }
}

function setAnswerId(questionIndex: number, answerIndex: number, value: string): void {
  const question = definition.value.questions[questionIndex]
  const answer = question?.answers[answerIndex]
  if (!answer) return
  const oldId = answer.id
  definition.value = {
    questions: definition.value.questions.map((q, i) =>
      i === questionIndex
        ? { ...q, answers: q.answers.map((a, j) => (j === answerIndex ? { ...a, id: value } : a)) }
        : q,
    ),
    rules: definition.value.rules.map((rule) =>
      rule.answerId === oldId ? { ...rule, answerId: value } : rule,
    ),
  }
}

function setAnswerText(questionIndex: number, answerIndex: number, value: string): void {
  definition.value = {
    ...definition.value,
    questions: definition.value.questions.map((q, i) =>
      i === questionIndex
        ? { ...q, answers: q.answers.map((a, j) => (j === answerIndex ? { ...a, text: value } : a)) }
        : q,
    ),
  }
}

/* ---------- rules ---------- */

function answerOptions(): { id: string; label: string }[] {
  return definition.value.questions.flatMap((question) =>
    question.answers.map((answer) => ({
      id: answer.id,
      label: answer.text.trim() || answer.id,
    })),
  )
}

function operatorsForField(fieldKey: string): QuizOperator[] {
  const field = fieldByKey.value.get(fieldKey)
  return field ? operatorOptionsForType(field.type) : []
}

function fieldType(fieldKey: string): AdminQuizSpecField['type'] | null {
  return fieldByKey.value.get(fieldKey)?.type ?? null
}

function addRule(): void {
  const firstField = specFields.value[0]
  const firstAnswer = answerOptions()[0]
  if (!firstField || !firstAnswer) return
  const op = operatorOptionsForType(firstField.type)[0]
  if (!op) return
  definition.value = {
    ...definition.value,
    rules: [
      ...definition.value.rules,
      { answerId: firstAnswer.id, field: firstField.key, op, value: null, points: 1, reason: '' },
    ],
  }
}

function removeRule(index: number): void {
  definition.value = {
    ...definition.value,
    rules: definition.value.rules.filter((_, i) => i !== index),
  }
}

function updateRule(index: number, patch: Partial<QuizRule>): void {
  definition.value = {
    ...definition.value,
    rules: definition.value.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
  }
}

function onRuleAnswer(index: number, answerId: string): void {
  updateRule(index, { answerId })
}

function onRuleField(index: number, fieldKey: string): void {
  const type = fieldType(fieldKey)
  const rule = definition.value.rules[index]
  if (!type || !rule) return
  const ops = operatorOptionsForType(type)
  const op = isOperatorAllowed(rule.op, type) ? rule.op : ops[0]
  if (!op) return
  updateRule(index, {
    field: fieldKey,
    op,
    value: op === 'isTrue' ? true : null,
  })
}

function onRuleOperator(index: number, op: string): void {
  const rule = definition.value.rules[index]
  if (!rule) return
  const match = operatorsForField(rule.field).find((candidate) => candidate === op)
  if (!match) return
  updateRule(index, { op: match, value: match === 'isTrue' ? true : rule.value })
}

function onRuleValue(index: number, raw: string): void {
  const rule = definition.value.rules[index]
  if (!rule) return
  const type = fieldType(rule.field)
  if (type === 'number') {
    updateRule(index, { value: raw.trim() === '' ? null : Number(raw) })
  } else {
    updateRule(index, { value: raw })
  }
}

function onRulePoints(index: number, raw: string): void {
  const parsed = Number(raw)
  updateRule(index, { points: Number.isFinite(parsed) ? parsed : 0 })
}

function ruleValueText(rule: QuizRule): string {
  if (rule.value === null || rule.value === undefined) return ''
  return String(rule.value)
}

/* ---------- save / delete ---------- */

const idsValid = computed(() =>
  definition.value.questions.every(
    (question) =>
      QUIZ_ID_PATTERN.test(question.id) && question.answers.every((answer) => QUIZ_ID_PATTERN.test(answer.id)),
  ),
)

const canSave = computed(
  () => hydrated.value && !saving.value && !loading.value && idsValid.value,
)

async function save(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  fieldErrors.value = {}
  try {
    const updated = await quizApi.save(props.categoryId, buildQuizBody(definition.value))
    applyState(updated)
    notify.success(t('admin.content.quiz.savedToast'))
    emit('saved')
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    fieldErrors.value = mapQuizFieldErrors(parsed.fieldErrors)
    notify.error(t('admin.content.quiz.saveError'), parsed.message)
  } finally {
    saving.value = false
  }
}

async function executeDelete(): Promise<void> {
  deleting.value = true
  try {
    await quizApi.remove(props.categoryId)
    deleteOpen.value = false
    emit('deleted')
  } catch (err: unknown) {
    notify.error(parseAdminApiError(err, t).message)
  } finally {
    deleting.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
  }
}

onMounted(() => {
  hydrated.value = true
  window.addEventListener('keydown', onKeydown)
  void load()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Button type="button" variant="outline" class="min-h-11" @click="emit('back')">
        <ArrowLeft class="size-4 rtl:-scale-x-100" aria-hidden="true" />
        <span>{{ t('admin.content.quiz.back') }}</span>
      </Button>

      <div class="flex flex-wrap items-center gap-2">
        <Button
          v-if="state?.definition"
          type="button"
          variant="ghost"
          class="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
          :disabled="!hydrated || deleting"
          @click="deleteOpen = true"
        >
          <Trash2 class="size-4" aria-hidden="true" />
          <span>{{ t('admin.content.quiz.delete') }}</span>
        </Button>
        <Button
          type="button"
          :disabled="!canSave"
          class="min-h-11 bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi"
          @click="save()"
        >
          <Loader2 v-if="saving" class="size-4 animate-spin" aria-hidden="true" />
          <Save v-else class="size-4" aria-hidden="true" />
          <span>{{ saving ? t('admin.content.quiz.saving') : t('admin.content.quiz.save') }}</span>
        </Button>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">
      {{ t('admin.content.quiz.loading') }}
    </div>

    <div
      v-else-if="loadError"
      class="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 p-8 text-center"
    >
      <p class="text-sm font-semibold text-destructive">{{ loadError }}</p>
      <Button type="button" variant="outline" class="min-h-11" @click="load()">
        {{ t('common.retry') }}
      </Button>
    </div>

    <template v-else>
      <h2 class="font-display text-xl font-bold text-foreground">
        {{ t('admin.content.quiz.editorHeading', { name: categoryName }) }}
      </h2>

      <div
        v-if="warnings.length"
        class="flex flex-col gap-1 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
        role="alert"
      >
        <p class="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
          <TriangleAlert class="size-4" aria-hidden="true" />
          {{ t('admin.content.quiz.warningsTitle') }}
        </p>
        <p v-for="(warning, i) in warnings" :key="i" class="text-xs text-amber-700 dark:text-amber-400">
          {{ warning }}
        </p>
      </div>

      <!-- Questions -->
      <section class="flex flex-col gap-4" :aria-label="t('admin.content.quiz.questionsTitle')">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-foreground">{{ t('admin.content.quiz.questionsTitle') }}</h3>
          <Button
            type="button"
            variant="outline"
            class="min-h-10 gap-1"
            :disabled="!hydrated || saving || definition.questions.length >= MAX_QUESTIONS"
            @click="addQuestion"
          >
            <Plus class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.quiz.addQuestion') }}</span>
          </Button>
        </div>

        <article
          v-for="(question, qIndex) in definition.questions"
          :key="qIndex"
          class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="num text-xs font-bold text-muted-foreground">
              {{ t('admin.content.quiz.questionLabel', { number: qIndex + 1 }) }}
            </span>
            <div class="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-8"
                :disabled="qIndex === 0"
                :aria-label="t('admin.content.quiz.moveUp', { name: question.text || question.id })"
                @click="moveQuestion(qIndex, -1)"
              >
                <ArrowUp class="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-8"
                :disabled="qIndex === definition.questions.length - 1"
                :aria-label="t('admin.content.quiz.moveDown', { name: question.text || question.id })"
                @click="moveQuestion(qIndex, 1)"
              >
                <ArrowDown class="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-8 text-destructive"
                :disabled="!hydrated || definition.questions.length <= MIN_QUESTIONS"
                :aria-label="t('admin.content.quiz.removeQuestion', { number: qIndex + 1 })"
                @click="removeQuestion(qIndex)"
              >
                <Trash2 class="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <FormField
            :id="`quiz-question-text-${qIndex}`"
            :label="t('admin.content.quiz.questionText')"
            :error="fieldError('question', qIndex, 'text')"
          >
            <template #default="{ id, invalid, describedBy }">
              <div class="flex flex-col gap-1">
                <Input
                  :id="id"
                  :model-value="question.text"
                  type="text"
                  :maxlength="MAX_QUESTION_LEN"
                  :disabled="!hydrated || saving"
                  :aria-invalid="invalid"
                  :aria-describedby="describedBy"
                  class="h-11 rounded-lg"
                  @update:model-value="setQuestionText(qIndex, String($event))"
                />
                <span class="num self-end text-[11px] text-muted-foreground">
                  {{ t('admin.content.quiz.counter', { count: question.text.length, max: MAX_QUESTION_LEN }) }}
                </span>
              </div>
            </template>
          </FormField>

          <FormField
            :id="`quiz-question-id-${qIndex}`"
            :label="t('admin.content.quiz.questionId')"
            :error="
              fieldError('question', qIndex, 'id') ||
                (!QUIZ_ID_PATTERN.test(question.id) ? t('admin.content.quiz.idInvalid') : undefined)
            "
          >
            <template #default="{ id, invalid, describedBy }">
              <Input
                :id="id"
                :model-value="question.id"
                type="text"
                maxlength="40"
                dir="ltr"
                :disabled="!hydrated || saving"
                :aria-invalid="invalid"
                :aria-describedby="describedBy"
                class="h-11 rounded-lg font-mono"
                @update:model-value="setQuestionId(qIndex, String($event))"
              />
            </template>
          </FormField>

          <!-- Answers -->
          <div class="flex flex-col gap-2 border-s-2 border-border ps-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-xs font-bold text-muted-foreground">{{ t('admin.content.quiz.answersTitle') }}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="min-h-9 gap-1"
                :disabled="!hydrated || saving || question.answers.length >= MAX_ANSWERS"
                @click="addAnswer(qIndex)"
              >
                <Plus class="size-3.5" aria-hidden="true" />
                <span>{{ t('admin.content.quiz.addAnswer') }}</span>
              </Button>
            </div>

            <div
              v-for="(answer, aIndex) in question.answers"
              :key="aIndex"
              class="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3"
            >
              <div class="min-w-0 flex-1">
                <FormField
                  :id="`quiz-answer-text-${qIndex}-${aIndex}`"
                  :label="t('admin.content.quiz.answerText')"
                  :error="fieldError('answer', qIndex, `${aIndex}.text`)"
                >
                  <template #default="{ id, invalid, describedBy }">
                    <div class="flex flex-col gap-1">
                      <Input
                        :id="id"
                        :model-value="answer.text"
                        type="text"
                        :maxlength="MAX_ANSWER_LEN"
                        :disabled="!hydrated || saving"
                        :aria-invalid="invalid"
                        :aria-describedby="describedBy"
                        class="h-10 rounded-lg"
                        @update:model-value="setAnswerText(qIndex, aIndex, String($event))"
                      />
                      <span class="num text-[11px] text-muted-foreground">
                        {{ t('admin.content.quiz.counter', { count: answer.text.length, max: MAX_ANSWER_LEN }) }}
                      </span>
                    </div>
                  </template>
                </FormField>
              </div>

              <div class="w-28 shrink-0">
                <FormField
                  :id="`quiz-answer-id-${qIndex}-${aIndex}`"
                  :label="t('admin.content.quiz.answerId')"
                  :error="
                    fieldError('answer', qIndex, `${aIndex}.id`) ||
                      (!QUIZ_ID_PATTERN.test(answer.id) ? t('admin.content.quiz.idInvalid') : undefined)
                  "
                >
                  <template #default="{ id, invalid, describedBy }">
                    <Input
                      :id="id"
                      :model-value="answer.id"
                      type="text"
                      maxlength="40"
                      dir="ltr"
                      :disabled="!hydrated || saving"
                      :aria-invalid="invalid"
                      :aria-describedby="describedBy"
                      class="h-10 rounded-lg font-mono"
                      @update:model-value="setAnswerId(qIndex, aIndex, String($event))"
                    />
                  </template>
                </FormField>
              </div>

              <div class="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="size-8"
                  :disabled="aIndex === 0"
                  :aria-label="t('admin.content.quiz.moveUp', { name: answer.text || answer.id })"
                  @click="moveAnswer(qIndex, aIndex, -1)"
                >
                  <ArrowUp class="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="size-8"
                  :disabled="aIndex === question.answers.length - 1"
                  :aria-label="t('admin.content.quiz.moveDown', { name: answer.text || answer.id })"
                  @click="moveAnswer(qIndex, aIndex, 1)"
                >
                  <ArrowDown class="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="size-8 text-destructive"
                  :disabled="!hydrated || question.answers.length <= MIN_ANSWERS"
                  :aria-label="t('admin.content.quiz.removeAnswer', { number: aIndex + 1 })"
                  @click="removeAnswer(qIndex, aIndex)"
                >
                  <Trash2 class="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <!-- Rules -->
      <section class="flex flex-col gap-3" :aria-label="t('admin.content.quiz.rulesTitle')">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-foreground">{{ t('admin.content.quiz.rulesTitle') }}</h3>
          <Button
            type="button"
            variant="outline"
            class="min-h-10 gap-1"
            :disabled="!hydrated || saving || !specFields.length || !answerOptions().length"
            @click="addRule"
          >
            <Plus class="size-4" aria-hidden="true" />
            <span>{{ t('admin.content.quiz.addRule') }}</span>
          </Button>
        </div>

        <p
          v-if="!definition.rules.length"
          class="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
        >
          {{ t('admin.content.quiz.noRules') }}
        </p>

        <div v-else class="flex flex-col gap-3">
          <article
            v-for="(rule, rIndex) in definition.rules"
            :key="rIndex"
            class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <Label :for="`quiz-rule-answer-${rIndex}`" class="text-xs font-semibold">
                  {{ t('admin.content.quiz.ruleAnswer') }}
                </Label>
                <AdminFormSelect
                  :id="`quiz-rule-answer-${rIndex}`"
                  :model-value="rule.answerId"
                  :disabled="!hydrated || saving"
                  :aria-invalid="Boolean(fieldError('rule', rIndex, 'answerId'))"
                  @update:model-value="onRuleAnswer(rIndex, String($event))"
                >
                  <option v-for="option in answerOptions()" :key="option.id" :value="option.id">
                    {{ option.label }}
                  </option>
                </AdminFormSelect>
                <p v-if="fieldError('rule', rIndex, 'answerId')" class="text-xs font-medium text-destructive">
                  {{ fieldError('rule', rIndex, 'answerId') }}
                </p>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label :for="`quiz-rule-field-${rIndex}`" class="text-xs font-semibold">
                  {{ t('admin.content.quiz.ruleField') }}
                </Label>
                <AdminFormSelect
                  :id="`quiz-rule-field-${rIndex}`"
                  :model-value="rule.field"
                  :disabled="!hydrated || saving"
                  :aria-invalid="Boolean(fieldError('rule', rIndex, 'field'))"
                  @update:model-value="onRuleField(rIndex, String($event))"
                >
                  <option v-for="field in specFields" :key="field.key" :value="field.key">
                    {{ field.label }}
                  </option>
                </AdminFormSelect>
                <p v-if="fieldError('rule', rIndex, 'field')" class="text-xs font-medium text-destructive">
                  {{ fieldError('rule', rIndex, 'field') }}
                </p>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label :for="`quiz-rule-op-${rIndex}`" class="text-xs font-semibold">
                  {{ t('admin.content.quiz.ruleOperator') }}
                </Label>
                <AdminFormSelect
                  :id="`quiz-rule-op-${rIndex}`"
                  :model-value="rule.op"
                  :disabled="!hydrated || saving"
                  :aria-invalid="Boolean(fieldError('rule', rIndex, 'op'))"
                  @update:model-value="onRuleOperator(rIndex, String($event))"
                >
                  <option v-for="op in operatorsForField(rule.field)" :key="op" :value="op">
                    {{ t(`admin.content.quiz.operators.${op}`) }}
                  </option>
                </AdminFormSelect>
                <p v-if="fieldError('rule', rIndex, 'op')" class="text-xs font-medium text-destructive">
                  {{ fieldError('rule', rIndex, 'op') }}
                </p>
              </div>

              <div v-if="fieldType(rule.field) !== 'boolean'" class="flex flex-col gap-1.5">
                <Label :for="`quiz-rule-value-${rIndex}`" class="text-xs font-semibold">
                  {{ t('admin.content.quiz.ruleValue') }}
                </Label>
                <Input
                  :id="`quiz-rule-value-${rIndex}`"
                  :model-value="ruleValueText(rule)"
                  :type="fieldType(rule.field) === 'number' ? 'number' : 'text'"
                  :disabled="!hydrated || saving"
                  :aria-invalid="Boolean(fieldError('rule', rIndex, 'value'))"
                  class="h-10 rounded-lg"
                  @update:model-value="onRuleValue(rIndex, String($event))"
                />
                <p v-if="fieldError('rule', rIndex, 'value')" class="text-xs font-medium text-destructive">
                  {{ fieldError('rule', rIndex, 'value') }}
                </p>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label :for="`quiz-rule-points-${rIndex}`" class="text-xs font-semibold">
                  {{ t('admin.content.quiz.rulePoints') }}
                </Label>
                <Input
                  :id="`quiz-rule-points-${rIndex}`"
                  :model-value="String(rule.points)"
                  type="number"
                  min="-5"
                  max="5"
                  step="1"
                  :disabled="!hydrated || saving"
                  :aria-invalid="Boolean(fieldError('rule', rIndex, 'points'))"
                  class="h-10 rounded-lg"
                  @update:model-value="onRulePoints(rIndex, String($event))"
                />
                <p v-if="fieldError('rule', rIndex, 'points')" class="text-xs font-medium text-destructive">
                  {{ fieldError('rule', rIndex, 'points') }}
                </p>
              </div>

              <div class="flex flex-col gap-1.5">
                <Label :for="`quiz-rule-reason-${rIndex}`" class="text-xs font-semibold">
                  {{ t('admin.content.quiz.ruleReason') }}
                </Label>
                <Input
                  :id="`quiz-rule-reason-${rIndex}`"
                  :model-value="rule.reason"
                  type="text"
                  :maxlength="MAX_REASON_LEN"
                  :disabled="!hydrated || saving"
                  :aria-invalid="Boolean(fieldError('rule', rIndex, 'reason'))"
                  class="h-10 rounded-lg"
                  @update:model-value="updateRule(rIndex, { reason: String($event) })"
                />
                <p v-if="fieldError('rule', rIndex, 'reason')" class="text-xs font-medium text-destructive">
                  {{ fieldError('rule', rIndex, 'reason') }}
                </p>
              </div>
            </div>

            <div class="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="min-h-9 gap-1 text-destructive"
                :disabled="!hydrated || saving"
                :aria-label="t('admin.content.quiz.removeRule', { number: rIndex + 1 })"
                @click="removeRule(rIndex)"
              >
                <Trash2 class="size-3.5" aria-hidden="true" />
                <span>{{ t('admin.content.quiz.removeRuleShort') }}</span>
              </Button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <Dialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader class="text-start">
          <DialogTitle class="font-display text-xl text-destructive">
            {{ t('admin.content.quiz.confirmDeleteTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-foreground">
            {{ t('admin.content.quiz.confirmDelete') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            :disabled="deleting"
            class="min-h-11 sm:min-h-9"
            @click="deleteOpen = false"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="deleting"
            class="min-h-11 font-bold sm:min-h-9"
            @click="executeDelete"
          >
            <Loader2 v-if="deleting" class="me-1.5 size-4 animate-spin" aria-hidden="true" />
            <span>{{ t('common.delete') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
