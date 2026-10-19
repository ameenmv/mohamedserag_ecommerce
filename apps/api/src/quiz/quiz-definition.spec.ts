import { describe, expect, it } from 'vitest'
import type { AdminQuizSpecField, QuizDefinition } from '@serag/shared'
import { parseStoredQuiz, quizWarnings, validateAgainstTemplate } from './quiz-definition.js'

function buildDefinition(): QuizDefinition {
  return {
    questions: [
      {
        id: 'family',
        text: 'الفيرزا للأسرة؟',
        answers: [
          { id: 'fam-small', text: 'شقة صغيرة' },
          { id: 'fam-large', text: 'أسرة كبيرة' },
        ],
      },
      {
        id: 'power',
        text: 'عايز توفر كهرباء؟',
        answers: [
          { id: 'pow-saves', text: 'آه' },
          { id: 'pow-no', text: 'عادي' },
        ],
      },
      {
        id: 'space',
        text: 'المكان إزاي؟',
        answers: [
          { id: 'space-wide', text: 'واسع' },
          { id: 'space-narrow', text: 'ضيق' },
        ],
      },
    ],
    rules: [
      { answerId: 'fam-large', field: 'capacity_l', op: 'gte', value: 450, points: 3, reason: 'سعة كبيرة' },
      { answerId: 'pow-saves', field: 'inverter', op: 'isTrue', value: true, points: 2, reason: 'انفرتر موفر' },
    ],
  }
}

const fields: AdminQuizSpecField[] = [
  { key: 'capacity_l', label: 'السعة', type: 'number' },
  { key: 'inverter', label: 'انفرتر', type: 'boolean' },
]

describe('parseStoredQuiz', () => {
  it('returns a definition for valid stored questions and rules', () => {
    const definition = buildDefinition()
    const parsed = parseStoredQuiz(definition.questions, definition.rules)
    expect(parsed).not.toBeNull()
    expect(parsed?.questions).toHaveLength(3)
    expect(parsed?.rules).toHaveLength(2)
  })

  it('returns null for invalid or empty stored values', () => {
    expect(parseStoredQuiz(null, null)).toBeNull()
    expect(parseStoredQuiz([], [])).toBeNull()
    expect(parseStoredQuiz([{ id: 'x' }], [])).toBeNull()
    const definition = buildDefinition()
    expect(parseStoredQuiz(definition.questions, [{ answerId: 'ghost' }])).toBeNull()
  })
})

describe('quizWarnings', () => {
  it('flags rules that reference a removed spec field', () => {
    const definition = buildDefinition()
    definition.rules.push({
      answerId: 'fam-small',
      field: 'doors',
      op: 'lte',
      value: 2,
      points: 1,
      reason: 'بابين',
    })

    const warnings = quizWarnings(definition, fields)
    expect(warnings).toEqual(['القاعدة «بابين» على مواصفة اتشالت: doors'])
  })

  it('returns no warnings when every field is known', () => {
    expect(quizWarnings(buildDefinition(), fields)).toEqual([])
  })
})

describe('validateAgainstTemplate', () => {
  it('accepts a definition whose rules fit the template', () => {
    expect(validateAgainstTemplate(buildDefinition(), fields)).toEqual([])
  })

  it('reports an unknown field', () => {
    const definition = buildDefinition()
    definition.rules[0] = {
      answerId: 'fam-large',
      field: 'ghost',
      op: 'gte',
      value: 1,
      points: 1,
      reason: 'حقل وهمي',
    }

    const issues = validateAgainstTemplate(definition, fields)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.path).toEqual(['rules', 0, 'field'])
    expect(issues[0]?.message).toContain('ghost')
  })

  it('reports gte/lte on a non-number field and isTrue on a non-boolean field', () => {
    const definition = buildDefinition()
    definition.rules = [
      { answerId: 'pow-saves', field: 'inverter', op: 'gte', value: 1, points: 1, reason: 'مقارنة غلط' },
      { answerId: 'fam-large', field: 'capacity_l', op: 'isTrue', value: true, points: 1, reason: 'منطقي غلط' },
    ]

    const issues = validateAgainstTemplate(definition, fields)
    expect(issues).toHaveLength(2)
    expect(issues.map((issue) => issue.path)).toEqual([
      ['rules', 0, 'op'],
      ['rules', 1, 'op'],
    ])
  })
})
