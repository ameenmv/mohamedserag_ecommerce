export const QUIZ_OPERATORS = ['eq', 'neq', 'gte', 'lte', 'contains', 'isTrue'] as const
export type QuizOperator = (typeof QUIZ_OPERATORS)[number]

export interface QuizAnswer {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  text: string
  answers: QuizAnswer[]
}

export interface QuizRule {
  answerId: string
  field: string
  op: QuizOperator
  value: string | number | boolean | null
  points: number
  reason: string
}

export interface QuizDefinition {
  questions: QuizQuestion[]
  rules: QuizRule[]
}

export type QuizAnswers = Record<string, string> // questionId -> answerId or 'unsure'
export const QUIZ_UNSURE = 'unsure'

export interface QuizCandidate {
  id: string
  popularity: number
  specs: Record<string, string | number | boolean | null | undefined>
}

export interface QuizScored {
  id: string
  score: number
  reason: string | null
}

export interface QuizResult {
  items: QuizScored[]
  fallback: boolean
}

export interface PublicQuiz {
  category: { slug: string; name: string }
  questions: QuizQuestion[]
}

type SpecValue = string | number | boolean | null | undefined

const TRUE_WORDS = new Set(['true', 'yes', 'نعم'])

function normalizeText(value: string | number | boolean): string {
  return String(value).trim().toLowerCase()
}

/** Numeric view of a value: numbers and numeric strings; null when not a finite number. */
function toNumber(value: string | number | boolean | null): number | null {
  if (typeof value === 'boolean' || value === null) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function valuesEqual(spec: string | number | boolean, ruleValue: string | number | boolean | null): boolean {
  if (ruleValue === null) return false
  if (typeof spec === 'boolean' || typeof ruleValue === 'boolean') {
    const specBool = typeof spec === 'boolean' ? spec : TRUE_WORDS.has(normalizeText(spec))
    const ruleBool = typeof ruleValue === 'boolean' ? ruleValue : TRUE_WORDS.has(normalizeText(ruleValue))
    return specBool === ruleBool
  }
  const a = toNumber(spec)
  const b = toNumber(ruleValue)
  if (a !== null && b !== null) return a === b
  return normalizeText(spec) === normalizeText(ruleValue)
}

/** Whether a product's spec value satisfies a quiz rule. Missing spec values never match. */
export function ruleMatches(rule: QuizRule, specValue: SpecValue): boolean {
  if (specValue === undefined || specValue === null) return false
  switch (rule.op) {
    case 'eq':
      return valuesEqual(specValue, rule.value)
    case 'neq':
      return !valuesEqual(specValue, rule.value)
    case 'gte':
    case 'lte': {
      const a = toNumber(specValue)
      const b = toNumber(rule.value)
      if (a === null || b === null) return false
      return rule.op === 'gte' ? a >= b : a <= b
    }
    case 'contains':
      return typeof specValue === 'string' && typeof rule.value === 'string'
        && normalizeText(specValue).includes(normalizeText(rule.value))
    case 'isTrue':
      return specValue === true || (typeof specValue === 'string' && TRUE_WORDS.has(normalizeText(specValue)))
  }
}

function byPopularity(a: QuizCandidate, b: QuizCandidate): number {
  return b.popularity - a.popularity || a.id.localeCompare(b.id)
}

/**
 * Scores candidates against the rules of the chosen answers («مش متأكد» and unknown answers add
 * nothing). Returns the top `limit` with a positive score (score, then popularity, then id), each
 * with the reason of its highest-points matched rule; falls back to the most popular products.
 */
export function scoreQuiz(
  candidates: QuizCandidate[],
  quiz: QuizDefinition,
  answers: QuizAnswers,
  limit = 3,
): QuizResult {
  const knownAnswers = new Set(quiz.questions.flatMap((q) => q.answers.map((a) => a.id)))
  const chosen = new Set(
    Object.values(answers).filter((id) => id !== QUIZ_UNSURE && knownAnswers.has(id)),
  )
  const rules = quiz.rules.filter((rule) => chosen.has(rule.answerId))

  const scored = candidates
    .map((candidate) => {
      let score = 0
      let best: QuizRule | null = null
      for (const rule of rules) {
        if (!ruleMatches(rule, candidate.specs[rule.field])) continue
        score += rule.points
        if (best === null || rule.points > best.points) best = rule
      }
      return { candidate, score, reason: best?.reason ?? null }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || byPopularity(a.candidate, b.candidate))

  if (scored.length > 0) {
    return {
      items: scored.slice(0, limit).map(({ candidate, score, reason }) => ({ id: candidate.id, score, reason })),
      fallback: false,
    }
  }

  return {
    items: [...candidates].sort(byPopularity).slice(0, limit).map((c) => ({ id: c.id, score: 0, reason: null })),
    fallback: true,
  }
}
