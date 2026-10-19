import type {
  AdminQuizSpecField,
  QuizDefinition,
  QuizOperator,
  QuizQuestion,
} from '@serag/shared'

export const QUIZ_ID_PATTERN = /^[a-z0-9-]{1,40}$/

/** Operators offered for a given spec field type (rows mirrored from the API's template rules). */
export function operatorOptionsForType(type: AdminQuizSpecField['type']): QuizOperator[] {
  switch (type) {
    case 'number':
      return ['eq', 'neq', 'gte', 'lte']
    case 'boolean':
      return ['isTrue']
    case 'choice':
    case 'text':
      return ['eq', 'neq', 'contains']
  }
}

/** Whether an operator is valid for a field type (used to sanitize a rule when its field changes). */
export function isOperatorAllowed(op: QuizOperator, type: AdminQuizSpecField['type']): boolean {
  return operatorOptionsForType(type).includes(op)
}

/** Deterministic id for the question at `index`, e.g. `q1`. */
export function questionIdForIndex(index: number): string {
  return `q${index + 1}`
}

/** Deterministic id for the answer at `index`, e.g. `a1`. */
export function answerIdForIndex(index: number): string {
  return `a${index + 1}`
}

/** A fresh quiz with three questions of two answers each, matching the seed defaults. */
export function createEmptyDefinition(): QuizDefinition {
  const questions: QuizQuestion[] = Array.from({ length: 3 }, (_, qIndex) => ({
    id: questionIdForIndex(qIndex),
    text: '',
    answers: Array.from({ length: 2 }, (_, aIndex) => ({
      id: answerIdForIndex(aIndex),
      text: '',
    })),
  }))
  return { questions, rules: [] }
}

/** A new question block with a stable id derived from its position. */
export function newQuestion(index: number): QuizQuestion {
  return {
    id: questionIdForIndex(index),
    text: '',
    answers: [
      { id: answerIdForIndex(0), text: '' },
      { id: answerIdForIndex(1), text: '' },
    ],
  }
}

/** A new answer block with a stable id derived from its position. */
export function newAnswer(index: number): { id: string; text: string } {
  return { id: answerIdForIndex(index), text: '' }
}

/** Moves the entry at `index` one slot up (-1) or down (1); out-of-range moves return a copy. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items.slice()
  }
  const next = items.slice()
  const current = next[index]
  const swapped = next[target]
  if (current === undefined || swapped === undefined) return items.slice()
  next[index] = swapped
  next[target] = current
  return next
}

/**
 * Builds the PUT body from the editor's live state. `null` values are trimmed and
 * question/answer ids are trusted as typed (validated client-side before saving).
 */
export function buildQuizBody(definition: QuizDefinition): QuizDefinition {
  return {
    questions: definition.questions.map((question) => ({
      id: question.id.trim(),
      text: question.text.trim(),
      answers: question.answers.map((answer) => ({
        id: answer.id.trim(),
        text: answer.text.trim(),
      })),
    })),
    rules: definition.rules.map((rule) => ({
      ...rule,
      value: rule.op === 'isTrue' ? true : typeof rule.value === 'string' ? rule.value.trim() : rule.value,
      reason: rule.reason.trim(),
    })),
  }
}

export interface QuizIssueTarget {
  scope: 'question' | 'answer' | 'rule'
  index: number
  sub?: string
}

/**
 * Maps an API validation issue path (e.g. `questions.1.text`, `questions.1.answers.0.id`,
 * `rules.0.field`) to the editor row it belongs to. Paths outside the editable shape return null.
 */
export function mapQuizIssuePath(path: string): QuizIssueTarget | null {
  const parts = path.split('.')
  if (parts[0] === 'questions' && parts.length >= 3) {
    const index = Number(parts[1])
    if (!Number.isInteger(index) || index < 0) return null
    const sub = parts[2]
    if (!sub) return null
    if (sub === 'answers' && parts.length >= 5) {
      const answerIndex = Number(parts[3])
      if (!Number.isInteger(answerIndex) || answerIndex < 0) return null
      return { scope: 'answer', index, sub: `${answerIndex}.${parts[4] ?? ''}` }
    }
    return { scope: 'question', index, sub }
  }
  if (parts[0] === 'rules' && parts.length >= 3) {
    const index = Number(parts[1])
    const sub = parts[2]
    if (!Number.isInteger(index) || index < 0 || !sub) return null
    return { scope: 'rule', index, sub }
  }
  return null
}

/** Collapses the API's 400 field errors into editor keys:
 * `questions.1.text` → `question.1.text`; `questions.1.answers.0.id` → `answer.1.0.id`;
 * `rules.0.field` → `rule.0.field`. Unknown paths are dropped.
 */
export function mapQuizFieldErrors(fieldErrors: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [path, message] of Object.entries(fieldErrors)) {
    const target = mapQuizIssuePath(path)
    if (!target) continue
    const key = target.sub ? `${target.scope}.${target.index}.${target.sub}` : `${target.scope}.${target.index}`
    if (!map[key]) map[key] = message
  }
  return map
}
