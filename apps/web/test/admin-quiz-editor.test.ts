import { describe, expect, it } from 'vitest'
import type { QuizDefinition } from '@serag/shared'
import {
  QUIZ_ID_PATTERN,
  answerIdForIndex,
  buildQuizBody,
  createEmptyDefinition,
  isOperatorAllowed,
  mapQuizFieldErrors,
  mapQuizIssuePath,
  moveItem,
  newAnswer,
  newQuestion,
  operatorOptionsForType,
  questionIdForIndex,
} from '../app/utils/admin-quiz-editor'

describe('operatorOptionsForType', () => {
  it('limits number fields to comparison operators', () => {
    expect(operatorOptionsForType('number')).toEqual(['eq', 'neq', 'gte', 'lte'])
  })

  it('offers only isTrue for boolean fields', () => {
    expect(operatorOptionsForType('boolean')).toEqual(['isTrue'])
  })

  it('offers equality and contains for text and choice fields', () => {
    expect(operatorOptionsForType('text')).toEqual(['eq', 'neq', 'contains'])
    expect(operatorOptionsForType('choice')).toEqual(['eq', 'neq', 'contains'])
  })
})

describe('isOperatorAllowed', () => {
  it('accepts a valid operator for the type', () => {
    expect(isOperatorAllowed('gte', 'number')).toBe(true)
    expect(isOperatorAllowed('contains', 'choice')).toBe(true)
  })

  it('rejects an operator not offered for the type', () => {
    expect(isOperatorAllowed('contains', 'number')).toBe(false)
    expect(isOperatorAllowed('gte', 'boolean')).toBe(false)
  })
})

describe('id generation', () => {
  it('derives question ids from their index', () => {
    expect(questionIdForIndex(0)).toBe('q1')
    expect(questionIdForIndex(4)).toBe('q5')
  })

  it('derives answer ids from their index', () => {
    expect(answerIdForIndex(0)).toBe('a1')
    expect(answerIdForIndex(5)).toBe('a6')
  })

  it('produces ids that satisfy the shared id pattern', () => {
    expect(QUIZ_ID_PATTERN.test(questionIdForIndex(0))).toBe(true)
    expect(QUIZ_ID_PATTERN.test(answerIdForIndex(9))).toBe(true)
    expect(QUIZ_ID_PATTERN.test('Bad Id!')).toBe(false)
  })

  it('builds a fresh question with a q-id and two answers', () => {
    const question = newQuestion(2)
    expect(question.id).toBe('q3')
    expect(question.answers).toHaveLength(2)
    expect(question.answers[0]?.id).toBe('a1')
  })

  it('builds a fresh answer with an a-id', () => {
    expect(newAnswer(1)).toEqual({ id: 'a2', text: '' })
  })
})

describe('createEmptyDefinition', () => {
  it('starts with three questions of two answers and no rules', () => {
    const definition = createEmptyDefinition()
    expect(definition.questions).toHaveLength(3)
    expect(definition.questions.every((q) => q.answers.length === 2)).toBe(true)
    expect(definition.rules).toEqual([])
  })
})

describe('moveItem', () => {
  it('swaps an item with its previous neighbour', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
  })

  it('swaps an item with its next neighbour', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('returns an unchanged copy at the boundaries', () => {
    const source = ['a', 'b']
    const result = moveItem(source, 0, -1)
    expect(result).toEqual(['a', 'b'])
    expect(result).not.toBe(source)
  })
})

describe('buildQuizBody', () => {
  it('trims question, answer and reason text', () => {
    const definition: QuizDefinition = {
      questions: [
        {
          id: ' q1 ',
          text: '  كم فرد؟ ',
          answers: [{ id: ' a1 ', text: ' ٢ ' }],
        },
      ],
      rules: [
        { answerId: 'a1', field: 'capacity', op: 'gte', value: 5, points: 2, reason: '  عيلة كبيرة ' },
      ],
    }
    const body = buildQuizBody(definition)
    expect(body.questions[0]?.id).toBe('q1')
    expect(body.questions[0]?.text).toBe('كم فرد؟')
    expect(body.questions[0]?.answers[0]?.id).toBe('a1')
    expect(body.rules[0]?.reason).toBe('عيلة كبيرة')
  })

  it('forces value true for isTrue rules', () => {
    const definition: QuizDefinition = {
      questions: [],
      rules: [{ answerId: 'a1', field: 'inverter', op: 'isTrue', value: 'x', points: 1, reason: '' }],
    }
    expect(buildQuizBody(definition).rules[0]?.value).toBe(true)
  })
})

describe('mapQuizIssuePath', () => {
  it('maps a question field path', () => {
    expect(mapQuizIssuePath('questions.1.text')).toEqual({ scope: 'question', index: 1, sub: 'text' })
  })

  it('maps an answer field path', () => {
    expect(mapQuizIssuePath('questions.1.answers.0.id')).toEqual({
      scope: 'answer',
      index: 1,
      sub: '0.id',
    })
  })

  it('maps a rule field path', () => {
    expect(mapQuizIssuePath('rules.0.field')).toEqual({ scope: 'rule', index: 0, sub: 'field' })
  })

  it('returns null for unknown roots', () => {
    expect(mapQuizIssuePath('something.else')).toBeNull()
  })

  it('returns null for an unusable index', () => {
    expect(mapQuizIssuePath('questions.x.text')).toBeNull()
  })
})

describe('mapQuizFieldErrors', () => {
  it('collapses API field errors into editor keys', () => {
    const map = mapQuizFieldErrors({
      'questions.1.text': 'نص السؤال مطلوب',
      'questions.1.answers.0.id': 'المعرّف غير صالح',
      'rules.0.field': 'الحقل غير معروف',
      'nope.0': 'تجاهل',
    })
    expect(map).toEqual({
      'question.1.text': 'نص السؤال مطلوب',
      'answer.1.0.id': 'المعرّف غير صالح',
      'rule.0.field': 'الحقل غير معروف',
    })
  })

  it('returns an empty map when there are no field errors', () => {
    expect(mapQuizFieldErrors({})).toEqual({})
  })
})
