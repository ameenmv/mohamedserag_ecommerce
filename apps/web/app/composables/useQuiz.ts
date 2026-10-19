import type { QuizAnswers, QuizResultsResponse } from '@serag/shared'
import { QUIZ_UNSURE } from '@serag/shared'

/**
 * Loads the «ساعدني أختار» quiz of a category (SSR) and drives the one-question-at-a-time flow:
 * current step, chosen answers, navigation, submission and results. Throws a fatal 404 when the
 * category has no quiz so the route behaves like an unknown page.
 */
export async function useQuiz() {
  const route = useRoute()
  const storeApi = useStoreApi()

  const slug = computed(() => String(route.params.category ?? ''))

  const { data: quiz, error } = await useAsyncData(
    () => `quiz:${slug.value}`,
    () => storeApi.quiz(slug.value),
  )

  if (error.value || !quiz.value) {
    throw createError({ statusCode: 404, fatal: true })
  }

  const questions = computed(() => quiz.value?.questions ?? [])
  const category = computed(() => quiz.value?.category ?? { slug: slug.value, name: '' })

  const step = ref(0)
  const answers = ref<QuizAnswers>({})
  const submitting = ref(false)
  const results = ref<QuizResultsResponse | null>(null)
  const submitError = ref('')

  const total = computed(() => questions.value.length)
  const current = computed(() => questions.value[step.value])
  const currentAnswer = computed(() => {
    const question = current.value
    return question ? answers.value[question.id] ?? null : null
  })
  const isLast = computed(() => step.value >= total.value - 1)
  const inProgress = computed(() => results.value === null)

  function setAnswer(answerId: string): void {
    const question = current.value
    if (!question) return
    answers.value = { ...answers.value, [question.id]: answerId }
  }

  function next(): void {
    if (!currentAnswer.value || isLast.value) return
    step.value = Math.min(step.value + 1, total.value - 1)
  }

  function previous(): void {
    if (step.value <= 0) return
    step.value -= 1
  }

  async function submit(): Promise<void> {
    if (submitting.value || !currentAnswer.value) return
    submitting.value = true
    submitError.value = ''
    try {
      results.value = await storeApi.quizResults(slug.value, answers.value)
    } catch {
      submitError.value = 'error'
    } finally {
      submitting.value = false
    }
  }

  function reset(): void {
    step.value = 0
    answers.value = {}
    results.value = null
    submitError.value = ''
  }

  return {
    quiz,
    slug,
    category,
    questions,
    total,
    current,
    currentAnswer,
    isLast,
    inProgress,
    step,
    submitting,
    results,
    submitError,
    unsureValue: QUIZ_UNSURE,
    setAnswer,
    next,
    previous,
    submit,
    reset,
  }
}
