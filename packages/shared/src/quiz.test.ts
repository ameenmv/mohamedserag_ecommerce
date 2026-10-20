import { describe, expect, it } from 'vitest'
import {
  QUIZ_UNSURE,
  ruleMatches,
  scoreQuiz,
  type QuizCandidate,
  type QuizDefinition,
  type QuizRule,
} from './quiz.js'

function rule(op: QuizRule['op'], value: QuizRule['value'], points = 1): QuizRule {
  return { answerId: 'a', field: 'f', op, value, points, reason: 'r' }
}

describe('ruleMatches', () => {
  it('compares eq/neq numerically for numbers and numeric strings', () => {
    expect(ruleMatches(rule('eq', 450), '450')).toBe(true)
    expect(ruleMatches(rule('eq', '450'), 450)).toBe(true)
    expect(ruleMatches(rule('neq', 300), '450')).toBe(true)
    expect(ruleMatches(rule('neq', 450), 450)).toBe(false)
  })

  it('compares eq/neq strings case-insensitively after trimming, booleans strictly', () => {
    expect(ruleMatches(rule('eq', 'Inverter'), '  inverter ')).toBe(true)
    expect(ruleMatches(rule('neq', 'Inverter'), 'inverter')).toBe(false)
    expect(ruleMatches(rule('eq', true), true)).toBe(true)
    expect(ruleMatches(rule('eq', true), false)).toBe(false)
  })

  it('handles gte/lte and refuses non-numbers', () => {
    expect(ruleMatches(rule('gte', 400), 450)).toBe(true)
    expect(ruleMatches(rule('gte', 500), '450')).toBe(false)
    expect(ruleMatches(rule('lte', 500), 450)).toBe(true)
    expect(ruleMatches(rule('gte', 400), 'abc')).toBe(false)
    expect(ruleMatches(rule('lte', 'abc'), 450)).toBe(false)
  })

  it('handles contains and isTrue', () => {
    expect(ruleMatches(rule('contains', 'smart'), 'Smart WiFi')).toBe(true)
    expect(ruleMatches(rule('contains', 'smart'), 500)).toBe(false)
    for (const v of [true, 'true', 'Yes', 'نعم']) expect(ruleMatches(rule('isTrue', null), v)).toBe(true)
    expect(ruleMatches(rule('isTrue', null), false)).toBe(false)
    expect(ruleMatches(rule('isTrue', null), 'no')).toBe(false)
  })

  it('never matches a missing spec value', () => {
    expect(ruleMatches(rule('eq', 450), undefined)).toBe(false)
    expect(ruleMatches(rule('neq', 450), null)).toBe(false)
    expect(ruleMatches(rule('isTrue', null), null)).toBe(false)
  })
})

describe('scoreQuiz', () => {
  const quiz: QuizDefinition = {
    questions: [
      { id: 'family', text: 'عددكم كام؟', answers: [{ id: 'large', text: '5+' }, { id: 'small', text: '1–2' }] },
      { id: 'power', text: 'يهمك التوفير؟', answers: [{ id: 'saves', text: 'أيوه' }, { id: 'any', text: 'مش مهم' }] },
      { id: 'budget', text: 'الميزانية؟', answers: [{ id: 'low', text: 'اقتصادي' }, { id: 'high', text: 'مفتوحة' }] },
    ],
    rules: [
      { answerId: 'large', field: 'capacityL', op: 'gte', value: 450, points: 3, reason: 'مناسبة لعيلة كبيرة' },
      { answerId: 'saves', field: 'inverter', op: 'isTrue', value: null, points: 2, reason: 'موفّرة في الكهربا' },
      { answerId: 'small', field: 'capacityL', op: 'lte', value: 350, points: 3, reason: 'مقاس مناسب لبيت صغير' },
    ],
  }

  const fridges: QuizCandidate[] = [
    { id: 'f300', popularity: 10, specs: { capacityL: 300, inverter: false } },
    { id: 'f420', popularity: 5, specs: { capacityL: 420, inverter: true } },
    { id: 'f500', popularity: 8, specs: { capacityL: 500, inverter: false } },
    { id: 'f550', popularity: 3, specs: { capacityL: 550, inverter: true } },
  ]

  it('ranks the large inverter fridge first with the reason of its highest-points rule', () => {
    const res = scoreQuiz(fridges, quiz, { family: 'large', power: 'saves', budget: QUIZ_UNSURE })
    expect(res.fallback).toBe(false)
    expect(res.items.map((i) => i.id)).toEqual(['f550', 'f500', 'f420'])
    expect(res.items[0]).toEqual({ id: 'f550', score: 5, reason: 'مناسبة لعيلة كبيرة' })
    expect(res.items[2]).toEqual({ id: 'f420', score: 2, reason: 'موفّرة في الكهربا' })
  })

  it('ignores «مش متأكد» and unknown answer ids', () => {
    const res = scoreQuiz(fridges, quiz, { family: QUIZ_UNSURE, power: 'nope', budget: 'low' })
    expect(res.fallback).toBe(true)
  })

  it('falls back to the most popular products when nothing scores', () => {
    const res = scoreQuiz(fridges, quiz, { family: QUIZ_UNSURE, power: QUIZ_UNSURE, budget: QUIZ_UNSURE })
    expect(res).toEqual({
      fallback: true,
      items: [
        { id: 'f300', score: 0, reason: null },
        { id: 'f500', score: 0, reason: null },
        { id: 'f420', score: 0, reason: null },
      ],
    })
  })

  it('breaks score ties by popularity, then id', () => {
    const tied: QuizCandidate[] = [
      { id: 'b', popularity: 1, specs: { inverter: true } },
      { id: 'a', popularity: 9, specs: { inverter: true } },
      { id: 'c', popularity: 1, specs: { inverter: true } },
    ]
    const res = scoreQuiz(tied, quiz, { power: 'saves' })
    expect(res.items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('respects the limit', () => {
    expect(scoreQuiz(fridges, quiz, { power: 'saves' }, 1).items).toHaveLength(1)
  })
})
