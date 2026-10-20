import { describe, expect, it } from 'vitest'
import { quizDefinitionSchema } from './quiz-schema.js'

describe('quiz-schema', () => {
  it('valid 3-question quiz passes', () => {
    const valid = {
      questions: [
        {
          id: 'q1',
          text: 'السؤال الأول',
          answers: [{ id: 'a1', text: 'أ1' }, { id: 'a2', text: 'أ2' }],
        },
        {
          id: 'q2',
          text: 'السؤال الثاني',
          answers: [{ id: 'b1', text: 'ب1' }, { id: 'b2', text: 'ب2' }],
        },
        {
          id: 'q3',
          text: 'السؤال الثالث',
          answers: [{ id: 'c1', text: 'ج1' }, { id: 'c2', text: 'ج2' }],
        },
      ],
      rules: [{ answerId: 'a1', field: 'cap', op: 'gte' as const, value: 400, points: 2, reason: 'جيد' }],
    }
    expect(quizDefinitionSchema.safeParse(valid).success).toBe(true)
  })

  it('2 questions fails', () => {
    const invalid = {
      questions: [
        {
          id: 'q1',
          text: 'س1',
          answers: [{ id: 'a1', text: 'أ1' }, { id: 'a2', text: 'أ2' }],
        },
        {
          id: 'q2',
          text: 'س2',
          answers: [{ id: 'b1', text: 'ب1' }, { id: 'b2', text: 'ب2' }],
        },
      ],
      rules: [],
    }
    expect(quizDefinitionSchema.safeParse(invalid).success).toBe(false)
  })

  it('duplicate answer ids fail', () => {
    const invalid = {
      questions: [
        {
          id: 'q1',
          text: 'س1',
          answers: [{ id: 'a1', text: 'أ1' }, { id: 'a2', text: 'أ2' }],
        },
        {
          id: 'q2',
          text: 'س2',
          answers: [{ id: 'a1', text: 'ب1' }, { id: 'a3', text: 'ب2' }], // duplicate a1
        },
        {
          id: 'q3',
          text: 'س3',
          answers: [{ id: 'c1', text: 'ج1' }, { id: 'c2', text: 'ج2' }],
        },
      ],
      rules: [],
    }
    expect(quizDefinitionSchema.safeParse(invalid).success).toBe(false)
  })

  it('answer id unsure fails', () => {
    const invalid = {
      questions: [
        {
          id: 'q1',
          text: 'س1',
          answers: [{ id: 'unsure', text: 'مش متأكد' }, { id: 'a2', text: 'أ2' }],
        },
        {
          id: 'q2',
          text: 'س2',
          answers: [{ id: 'b1', text: 'ب1' }, { id: 'b2', text: 'ب2' }],
        },
        {
          id: 'q3',
          text: 'س3',
          answers: [{ id: 'c1', text: 'ج1' }, { id: 'c2', text: 'ج2' }],
        },
      ],
      rules: [],
    }
    expect(quizDefinitionSchema.safeParse(invalid).success).toBe(false)
  })

  it('rule to missing answer fails', () => {
    const invalid = {
      questions: [
        {
          id: 'q1',
          text: 'س1',
          answers: [{ id: 'a1', text: 'أ1' }, { id: 'a2', text: 'أ2' }],
        },
        {
          id: 'q2',
          text: 'س2',
          answers: [{ id: 'b1', text: 'ب1' }, { id: 'b2', text: 'ب2' }],
        },
        {
          id: 'q3',
          text: 'س3',
          answers: [{ id: 'c1', text: 'ج1' }, { id: 'c2', text: 'ج2' }],
        },
      ],
      rules: [{ answerId: 'missing', field: 'cap', op: 'gte' as const, value: 400, points: 2, reason: 'جيد' }],
    }
    expect(quizDefinitionSchema.safeParse(invalid).success).toBe(false)
  })

  it('points 6 fails', () => {
    const invalid = {
      questions: [
        {
          id: 'q1',
          text: 'س1',
          answers: [{ id: 'a1', text: 'أ1' }, { id: 'a2', text: 'أ2' }],
        },
        {
          id: 'q2',
          text: 'س2',
          answers: [{ id: 'b1', text: 'ب1' }, { id: 'b2', text: 'ب2' }],
        },
        {
          id: 'q3',
          text: 'س3',
          answers: [{ id: 'c1', text: 'ج1' }, { id: 'c2', text: 'ج2' }],
        },
      ],
      rules: [{ answerId: 'a1', field: 'cap', op: 'gte' as const, value: 400, points: 6, reason: 'جيد' }],
    }
    expect(quizDefinitionSchema.safeParse(invalid).success).toBe(false)
  })
})
