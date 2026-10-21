import {
  quizDefinitionSchema,
  type AdminQuizSpecField,
  type QuizDefinition,
} from '@serag/shared'

/** Issue produced when a stored quiz is validated against its category spec template. */
export interface QuizTemplateIssue {
  path: (string | number)[]
  message: string
}

/**
 * Reads the `quiz_rules.questions` and `quiz_rules.rules` JSON columns safely.
 * Returns null when the stored values do not form a valid quiz or there are no questions,
 * so callers can treat the category as having no quiz.
 */
export function parseStoredQuiz(questions: unknown, rules: unknown): QuizDefinition | null {
  const parsed = quizDefinitionSchema.safeParse({ questions, rules })
  if (!parsed.success || parsed.data.questions.length === 0) {
    return null
  }
  return parsed.data
}

/**
 * Arabic warnings for rules that point at a spec field no longer present in the category template.
 * These rules are ignored when scoring but flagged in the admin editor.
 */
export function quizWarnings(
  definition: QuizDefinition,
  specFields: readonly AdminQuizSpecField[],
): string[] {
  const knownKeys = new Set(specFields.map((field) => field.key))
  const warnings = new Set<string>()
  for (const rule of definition.rules) {
    if (!knownKeys.has(rule.field)) {
      warnings.add(`القاعدة «${rule.reason}» على مواصفة اتشالت: ${rule.field}`)
    }
  }
  return [...warnings]
}

/**
 * Issues that block saving a quiz because its rules do not fit the category spec template:
 * unknown field, `gte`/`lte` on a non-number field, or `isTrue` on a non-boolean field.
 */
export function validateAgainstTemplate(
  definition: QuizDefinition,
  specFields: readonly AdminQuizSpecField[],
): QuizTemplateIssue[] {
  const fieldsByKey = new Map(specFields.map((field) => [field.key, field]))
  const issues: QuizTemplateIssue[] = []

  definition.rules.forEach((rule, index) => {
    const field = fieldsByKey.get(rule.field)
    if (!field) {
      issues.push({
        path: ['rules', index, 'field'],
        message: `مواصفة «${rule.field}» مش موجودة في قالب القسم`,
      })
      return
    }

    if ((rule.op === 'gte' || rule.op === 'lte') && field.type !== 'number') {
      issues.push({
        path: ['rules', index, 'op'],
        message: `العملية ${rule.op} بتشتغل بس على مواصفات رقمية`,
      })
    }

    if (rule.op === 'isTrue' && field.type !== 'boolean') {
      issues.push({
        path: ['rules', index, 'op'],
        message: 'العملية isTrue بتشتغل بس على مواصفات منطقية',
      })
    }
  })

  return issues
}
