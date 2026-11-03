import { describe, expect, it } from 'vitest'
import {
  FAQ_TOPICS,
  compareFaqOrder,
  faqTopicRank,
  type FaqTopic,
} from './faq.js'
import {
  faqInputSchema,
  faqPatchSchema,
  reorderFaqEntriesSchema,
} from './faq-schema.js'

describe('FAQ Topics and Ordering', () => {
  it('contains the 5 designated topics in priority order', () => {
    expect(FAQ_TOPICS).toEqual([
      'delivery-payment',
      'warranty',
      'returns',
      'products',
      'wholesale',
    ])
  })

  it('ranks topics in order and places unknown topics at the end', () => {
    expect(faqTopicRank('delivery-payment')).toBe(0)
    expect(faqTopicRank('warranty')).toBe(1)
    expect(faqTopicRank('returns')).toBe(2)
    expect(faqTopicRank('products')).toBe(3)
    expect(faqTopicRank('wholesale')).toBe(4)
    expect(faqTopicRank('unknown-topic')).toBe(5)
  })

  it('sorts entries by topic rank, then sort order, then ID', () => {
    const entries = [
      { id: 'b', topic: 'warranty', sort: 10 },
      { id: 'a', topic: 'warranty', sort: 0 },
      { id: 'c', topic: 'delivery-payment', sort: 5 },
      { id: 'd', topic: 'wholesale', sort: 0 },
    ]

    const sorted = [...entries].sort(compareFaqOrder)

    expect(sorted.map((e) => e.id)).toEqual(['c', 'a', 'b', 'd'])
  })
})

describe('faqInputSchema', () => {
  const validEntry = {
    topic: 'delivery-payment' as FaqTopic,
    question: 'ما هي طرق الدفع المتاحة؟',
    answer: '<p>نوفر الدفع عند الاستلام وإنستا باي وفودافون كاش.</p>',
    sort: 1,
    visible: true,
  }

  it('parses valid input with default sort and visible', () => {
    const res = faqInputSchema.parse({
      topic: 'warranty',
      question: 'كيف أفعل الضمان؟',
      answer: '<p>اتصل بالخط الساخن للوكيل المعتمد.</p>',
    })

    expect(res.topic).toBe('warranty')
    expect(res.question).toBe('كيف أفعل الضمان؟')
    expect(res.answer).toBe('<p>اتصل بالخط الساخن للوكيل المعتمد.</p>')
    expect(res.sort).toBe(0)
    expect(res.visible).toBe(true)
  })

  it('trims question and answer strings', () => {
    const res = faqInputSchema.parse({
      ...validEntry,
      question: '   سؤال تجريبي   ',
      answer: '   <p>إجابة تجريبية</p>   ',
    })

    expect(res.question).toBe('سؤال تجريبي')
    expect(res.answer).toBe('<p>إجابة تجريبية</p>')
  })

  it('rejects an invalid topic', () => {
    const res = faqInputSchema.safeParse({
      ...validEntry,
      topic: 'invalid-topic',
    })

    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe('تصنيف السؤال غير صالح')
    }
  })

  it('rejects empty or whitespace-only question', () => {
    const res = faqInputSchema.safeParse({
      ...validEntry,
      question: '   ',
    })

    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe('السؤال مطلوب')
    }
  })

  it('rejects question longer than 300 characters', () => {
    const res = faqInputSchema.safeParse({
      ...validEntry,
      question: 'س'.repeat(301),
    })

    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe('السؤال بيزيد عن 300 حرف')
    }
  })

  it('rejects empty or whitespace-only answer', () => {
    const res = faqInputSchema.safeParse({
      ...validEntry,
      answer: '   ',
    })

    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe('الإجابة مطلوبة')
    }
  })

  it('rejects answer longer than 10000 characters', () => {
    const res = faqInputSchema.safeParse({
      ...validEntry,
      answer: 'أ'.repeat(10001),
    })

    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe('الإجابة بتزيد عن 10000 حرف')
    }
  })

  it('transforms English translations, pruning empty or blank fields', () => {
    const res = faqInputSchema.parse({
      ...validEntry,
      translations: {
        en: {
          question: ' What payment methods do you accept? ',
          answer: '   ',
        },
      },
    })

    expect(res.translations?.en?.question).toBe('What payment methods do you accept?')
    expect(res.translations?.en?.answer).toBeUndefined()
  })

  it('accepts null translations', () => {
    const res = faqInputSchema.parse({
      ...validEntry,
      translations: null,
    })

    expect(res.translations).toBeNull()
  })
})

describe('faqPatchSchema', () => {
  it('allows partial updates of single fields', () => {
    const res = faqPatchSchema.parse({
      visible: false,
    })

    expect(res.visible).toBe(false)
    expect(res.question).toBeUndefined()
  })

  it('validates partial fields when provided', () => {
    const res = faqPatchSchema.safeParse({
      topic: 'non-existent',
    })

    expect(res.success).toBe(false)
  })
})

describe('reorderFaqEntriesSchema', () => {
  it('accepts non-empty array of IDs', () => {
    const res = reorderFaqEntriesSchema.parse({
      ids: ['id-1', 'id-2', 'id-3'],
    })

    expect(res.ids).toEqual(['id-1', 'id-2', 'id-3'])
  })

  it('rejects empty array of IDs', () => {
    const res = reorderFaqEntriesSchema.safeParse({
      ids: [],
    })

    expect(res.success).toBe(false)
  })

  it('rejects empty string in IDs', () => {
    const res = reorderFaqEntriesSchema.safeParse({
      ids: ['id-1', '  '],
    })

    expect(res.success).toBe(false)
  })
})
